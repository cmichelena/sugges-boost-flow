-- Add active_organization_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN active_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_profiles_active_organization ON public.profiles(active_organization_id);

-- Create a function to get user's first organization (for default active org)
CREATE OR REPLACE FUNCTION public.get_user_default_organization(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = _user_id
    AND om.status = 'active'
  ORDER BY om.joined_at ASC NULLS LAST
  LIMIT 1;
$$;

-- Create a function to set active organization with validation
CREATE OR REPLACE FUNCTION public.set_active_organization(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND status = 'active'
  ) THEN
    RETURN false;
  END IF;
  
  -- Update the active organization
  UPDATE public.profiles
  SET active_organization_id = _org_id
  WHERE id = _user_id;
  
  RETURN true;
END;
$$;