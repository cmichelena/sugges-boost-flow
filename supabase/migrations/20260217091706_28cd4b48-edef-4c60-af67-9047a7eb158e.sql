
-- Prevent workspace owner from being removed from organization_members
CREATE OR REPLACE FUNCTION public.prevent_owner_removal_from_members()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = OLD.organization_id AND owner_id = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove the workspace owner from members. Transfer ownership first.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER enforce_owner_cannot_be_removed
  BEFORE DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_removal_from_members();
