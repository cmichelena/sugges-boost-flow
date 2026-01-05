-- Add escalation fields to suggestions table
ALTER TABLE public.suggestions 
  ADD COLUMN IF NOT EXISTS escalated_to_user_id UUID,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- Create helper function to get Leadership team members
CREATE OR REPLACE FUNCTION public.get_leadership_members(_org_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.user_id, COALESCE(p.display_name, 'Unknown')
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  LEFT JOIN profiles p ON p.id = tm.user_id
  WHERE t.organization_id = _org_id
    AND t.name = 'Leadership'
    AND t.is_active = true;
$$;

-- Create helper function to check if user is in Leadership team
CREATE OR REPLACE FUNCTION public.is_leadership_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = _user_id
      AND t.organization_id = _org_id
      AND t.name = 'Leadership'
      AND t.is_active = true
  );
$$;

-- Update seed_default_categories to also create Leadership team
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  leadership_team_id UUID;
BEGIN
  -- Seed default categories (existing logic)
  INSERT INTO public.suggestion_categories (organization_id, name, is_default, display_order, can_be_anonymous)
  VALUES 
    (NEW.id, 'Process Improvement', true, 1, true),
    (NEW.id, 'Cost Reduction', true, 2, true),
    (NEW.id, 'Customer Experience', true, 3, true),
    (NEW.id, 'Employee Wellbeing', true, 4, true),
    (NEW.id, 'Technology & Tools', true, 5, true),
    (NEW.id, 'Safety & Compliance', true, 6, true),
    (NEW.id, 'Private (HR visible only)', true, 7, true),
    (NEW.id, 'Other', true, 8, true);
  
  -- Create Leadership team
  INSERT INTO public.teams (organization_id, name, is_active)
  VALUES (NEW.id, 'Leadership', true)
  RETURNING id INTO leadership_team_id;
  
  -- Add organization owner as team lead
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (leadership_team_id, NEW.owner_id, 'lead');
  
  RETURN NEW;
END;
$$;

-- Backfill: Create Leadership team for organizations that don't have one
INSERT INTO public.teams (organization_id, name, is_active)
SELECT o.id, 'Leadership', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.teams t 
  WHERE t.organization_id = o.id 
  AND t.name = 'Leadership'
);

-- Backfill: Add organization owners as team leads for Leadership teams without members
INSERT INTO public.team_members (team_id, user_id, role)
SELECT t.id, o.owner_id, 'lead'
FROM public.teams t
JOIN public.organizations o ON o.id = t.organization_id
WHERE t.name = 'Leadership'
AND NOT EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.team_id = t.id
);