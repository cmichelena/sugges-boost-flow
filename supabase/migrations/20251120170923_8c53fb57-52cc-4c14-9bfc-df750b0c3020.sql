-- Create team role enum
CREATE TYPE public.team_role AS ENUM ('lead', 'member');

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Organization members can view teams"
  ON public.teams FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  USING (has_org_role(auth.uid(), organization_id, 'admin'::app_role) 
    OR has_org_role(auth.uid(), organization_id, 'owner'::app_role));

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Organization members can view team members"
  ON public.team_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id AND is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Admins can manage team members"
  ON public.team_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id 
      AND (has_org_role(auth.uid(), t.organization_id, 'admin'::app_role) 
        OR has_org_role(auth.uid(), t.organization_id, 'owner'::app_role))
  ));

-- Update suggestion_categories table
ALTER TABLE public.suggestion_categories
  ADD COLUMN responsible_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN can_be_anonymous BOOLEAN NOT NULL DEFAULT true;

-- Update suggestions table
ALTER TABLE public.suggestions
  ADD COLUMN assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id or is_anonymous is set
ALTER TABLE public.suggestions
  ADD CONSTRAINT suggestions_user_or_anonymous_check
  CHECK ((user_id IS NOT NULL AND is_anonymous = false) OR (user_id IS NULL AND is_anonymous = true));

-- Create trigger for teams updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create auto-assignment function
CREATE OR REPLACE FUNCTION public.auto_assign_suggestion_to_team(
  _category_id UUID
)
RETURNS TABLE (
  team_id UUID,
  assigned_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_lead_user_id UUID;
BEGIN
  -- Get the responsible team for this category
  SELECT responsible_team_id INTO v_team_id
  FROM suggestion_categories
  WHERE id = _category_id;

  -- If no team assigned to category, return nulls
  IF v_team_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Try to find the team lead
  SELECT user_id INTO v_lead_user_id
  FROM team_members
  WHERE team_id = v_team_id
    AND role = 'lead'
  LIMIT 1;

  -- Return the team and lead (lead may be null if no lead exists)
  RETURN QUERY SELECT v_team_id, v_lead_user_id;
END;
$$;