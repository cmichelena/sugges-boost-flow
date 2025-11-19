-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');

-- Create enum for subscription tier
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'business', 'enterprise');

-- Create enum for member status
CREATE TYPE public.member_status AS ENUM ('pending', 'active', 'removed');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_tier public.subscription_tier NOT NULL DEFAULT 'free',
  subscription_status public.subscription_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status public.member_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Create user_roles table (following security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id, role)
);

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier public.subscription_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  max_suggestions_per_month INTEGER,
  max_members INTEGER,
  ai_improvements_enabled BOOLEAN NOT NULL DEFAULT false,
  advanced_analytics_enabled BOOLEAN NOT NULL DEFAULT false,
  custom_branding_enabled BOOLEAN NOT NULL DEFAULT false,
  priority_support_enabled BOOLEAN NOT NULL DEFAULT false,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  month_year TEXT NOT NULL,
  suggestions_created INTEGER NOT NULL DEFAULT 0,
  ai_improvements_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, month_year)
);

-- Add organization_id to suggestions table
ALTER TABLE public.suggestions ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
CREATE INDEX idx_suggestions_org ON public.suggestions(organization_id);
CREATE INDEX idx_usage_tracking_org ON public.usage_tracking(organization_id);

-- Create security definer function to check if user has role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  );
$$;

-- Create function to check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND status = 'active'
  );
$$;

-- Create function to get user's organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations(_user_id UUID)
RETURNS SETOF public.organizations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.organizations o
  INNER JOIN public.organization_members om ON o.id = om.organization_id
  WHERE om.user_id = _user_id AND om.status = 'active';
$$;

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they are members of"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Organization owners can update their organization"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organization owners can delete their organization"
  ON public.organizations FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for organization_members
CREATE POLICY "Users can view members of their organizations"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can insert organization members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    public.has_org_role(auth.uid(), organization_id, 'admin') OR
    public.has_org_role(auth.uid(), organization_id, 'owner')
  );

CREATE POLICY "Admins can update organization members"
  ON public.organization_members FOR UPDATE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin') OR
    public.has_org_role(auth.uid(), organization_id, 'owner')
  );

CREATE POLICY "Admins can delete organization members"
  ON public.organization_members FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin') OR
    public.has_org_role(auth.uid(), organization_id, 'owner')
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their organizations"
  ON public.user_roles FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_org_role(auth.uid(), organization_id, 'owner'));

-- RLS Policies for subscription_plans
CREATE POLICY "Everyone can view subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (true);

-- RLS Policies for usage_tracking
CREATE POLICY "Organization members can view their usage"
  ON public.usage_tracking FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Update RLS policies for suggestions
DROP POLICY IF EXISTS "Suggestions are viewable by everyone" ON public.suggestions;
CREATE POLICY "Users can view suggestions in their organization"
  ON public.suggestions FOR SELECT
  USING (
    organization_id IS NULL OR
    public.is_org_member(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Users can create suggestions" ON public.suggestions;
CREATE POLICY "Users can create suggestions in their organization"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id))
  );

DROP POLICY IF EXISTS "Users can update their own suggestions" ON public.suggestions;
CREATE POLICY "Users can update their own suggestions"
  ON public.suggestions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own suggestions" ON public.suggestions;
CREATE POLICY "Users can delete their own suggestions"
  ON public.suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (tier, name, price_monthly, price_annual, max_suggestions_per_month, max_members, ai_improvements_enabled, advanced_analytics_enabled, custom_branding_enabled, priority_support_enabled) VALUES
('free', 'Free', 0, 0, 25, 5, false, false, false, false),
('pro', 'Pro', 4900, 47000, 500, 25, true, false, false, false),
('business', 'Business', 19900, 199000, NULL, 100, true, true, true, true),
('enterprise', 'Enterprise', 0, 0, NULL, NULL, true, true, true, true);