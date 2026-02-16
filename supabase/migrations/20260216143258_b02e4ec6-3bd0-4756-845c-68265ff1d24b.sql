
-- Add workspace_type column to organizations
ALTER TABLE public.organizations
ADD COLUMN workspace_type text NOT NULL DEFAULT 'organisation';

-- Add public_visibility_mode to organizations
ALTER TABLE public.organizations
ADD COLUMN public_visibility_mode boolean NOT NULL DEFAULT false;

-- Add building-specific fields to suggestions
ALTER TABLE public.suggestions
ADD COLUMN target_response_date date NULL,
ADD COLUMN target_resolution_date date NULL,
ADD COLUMN responsible_party_id uuid NULL,
ADD COLUMN responsible_party_name text NULL;

-- Update seed_default_categories to use workspace_type
CREATE OR REPLACE FUNCTION public.seed_default_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  leadership_team_id UUID;
BEGIN
  -- Seed categories based on workspace_type
  IF NEW.workspace_type = 'building' THEN
    INSERT INTO public.suggestion_categories (organization_id, name, is_default, display_order, can_be_anonymous)
    VALUES 
      (NEW.id, 'Safety', true, 1, true),
      (NEW.id, 'Maintenance', true, 2, true),
      (NEW.id, 'Cleanliness', true, 3, true),
      (NEW.id, 'Utilities', true, 4, true),
      (NEW.id, 'Noise / Nuisance', true, 5, true),
      (NEW.id, 'Structural Concern', true, 6, true),
      (NEW.id, 'Other', true, 7, true);
  ELSE
    -- Default organisation categories
    INSERT INTO public.suggestion_categories (organization_id, name, is_default, display_order, can_be_anonymous)
    VALUES 
      (NEW.id, 'Idea', true, 1, true),
      (NEW.id, 'Improvement', true, 2, true),
      (NEW.id, 'Risk', true, 3, true),
      (NEW.id, 'Feedback', true, 4, true),
      (NEW.id, 'Process', true, 5, true),
      (NEW.id, 'Culture', true, 6, true),
      (NEW.id, 'Other', true, 7, true);
  END IF;
  
  -- Create Leadership team
  INSERT INTO public.teams (organization_id, name, is_active)
  VALUES (NEW.id, 'Leadership', true)
  RETURNING id INTO leadership_team_id;
  
  -- Add organization owner as team lead
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (leadership_team_id, NEW.owner_id, 'lead');
  
  RETURN NEW;
END;
$function$;
