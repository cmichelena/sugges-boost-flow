-- Create suggestion_categories table
CREATE TABLE public.suggestion_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.suggestion_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suggestion_categories
CREATE POLICY "Members can view visible categories in their org"
ON public.suggestion_categories
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) AND is_hidden = false
);

CREATE POLICY "Admins can view all categories in their org"
ON public.suggestion_categories
FOR SELECT
USING (
  has_org_role(auth.uid(), organization_id, 'admin'::app_role) OR 
  has_org_role(auth.uid(), organization_id, 'owner'::app_role)
);

CREATE POLICY "Admins can create categories"
ON public.suggestion_categories
FOR INSERT
WITH CHECK (
  has_org_role(auth.uid(), organization_id, 'admin'::app_role) OR 
  has_org_role(auth.uid(), organization_id, 'owner'::app_role)
);

CREATE POLICY "Admins can update categories"
ON public.suggestion_categories
FOR UPDATE
USING (
  has_org_role(auth.uid(), organization_id, 'admin'::app_role) OR 
  has_org_role(auth.uid(), organization_id, 'owner'::app_role)
);

CREATE POLICY "Admins cannot delete categories"
ON public.suggestion_categories
FOR DELETE
USING (false);

-- Function to seed default categories
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.suggestion_categories (organization_id, name, is_default, display_order)
  VALUES 
    (NEW.id, 'Process Improvement', true, 1),
    (NEW.id, 'Cost Reduction', true, 2),
    (NEW.id, 'Customer Experience', true, 3),
    (NEW.id, 'Employee Wellbeing', true, 4),
    (NEW.id, 'Technology & Tools', true, 5),
    (NEW.id, 'Safety & Compliance', true, 6),
    (NEW.id, 'Other', true, 7);
  RETURN NEW;
END;
$$;

-- Create trigger to seed categories when organization is created
CREATE TRIGGER trigger_seed_default_categories
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_categories();

-- Update handle_new_user function to seed categories for new orgs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_name text;
BEGIN
  -- Create organization name from display name or email
  org_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || '''s Workspace';
  
  -- Create organization for the new user (trigger will seed categories)
  INSERT INTO public.organizations (name, slug, owner_id, subscription_tier, subscription_status, trial_ends_at)
  VALUES (
    org_name,
    lower(replace(org_name, ' ', '-')) || '-' || substring(NEW.id::text from 1 for 8),
    NEW.id,
    'free'::subscription_tier,
    'trialing'::subscription_status,
    now() + interval '14 days'
  )
  RETURNING id INTO new_org_id;
  
  -- Add user to organization_members
  INSERT INTO public.organization_members (user_id, organization_id, status, joined_at, invited_by)
  VALUES (NEW.id, new_org_id, 'active'::member_status, now(), NEW.id);
  
  -- Add owner role in user_roles
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner'::app_role);
  
  -- Insert profile
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  RETURN NEW;
END;
$$;

-- Add category_id to suggestions table
ALTER TABLE public.suggestions 
ADD COLUMN category_id UUID REFERENCES public.suggestion_categories(id);

-- Seed categories for existing organizations
INSERT INTO public.suggestion_categories (organization_id, name, is_default, display_order)
SELECT id, 'Process Improvement', true, 1 FROM public.organizations
UNION ALL
SELECT id, 'Cost Reduction', true, 2 FROM public.organizations
UNION ALL
SELECT id, 'Customer Experience', true, 3 FROM public.organizations
UNION ALL
SELECT id, 'Employee Wellbeing', true, 4 FROM public.organizations
UNION ALL
SELECT id, 'Technology & Tools', true, 5 FROM public.organizations
UNION ALL
SELECT id, 'Safety & Compliance', true, 6 FROM public.organizations
UNION ALL
SELECT id, 'Other', true, 7 FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

-- Migrate existing suggestions to use category_id
UPDATE public.suggestions s
SET category_id = (
  SELECT id FROM public.suggestion_categories sc
  WHERE sc.organization_id = s.organization_id
  AND sc.name = s.category
  LIMIT 1
)
WHERE s.category_id IS NULL AND s.organization_id IS NOT NULL;

-- For suggestions without organization_id, map to first matching category name
UPDATE public.suggestions s
SET category_id = (
  SELECT id FROM public.suggestion_categories sc
  WHERE sc.name = s.category
  LIMIT 1
)
WHERE s.category_id IS NULL;

-- Add trigger for updated_at on suggestion_categories
CREATE TRIGGER update_suggestion_categories_updated_at
BEFORE UPDATE ON public.suggestion_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();