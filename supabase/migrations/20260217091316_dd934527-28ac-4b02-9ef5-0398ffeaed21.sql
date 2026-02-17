
-- 1. Create ownership_transfer_log table
CREATE TABLE public.ownership_transfer_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_owner_id uuid NOT NULL,
  to_owner_id uuid NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  transferred_by uuid NOT NULL
);

ALTER TABLE public.ownership_transfer_log ENABLE ROW LEVEL SECURITY;

-- SELECT only for workspace members
CREATE POLICY "Workspace members can view transfer log"
  ON public.ownership_transfer_log
  FOR SELECT
  USING (is_org_member(auth.uid(), workspace_id));

-- No INSERT/UPDATE/DELETE via client
CREATE POLICY "No client inserts on transfer log"
  ON public.ownership_transfer_log
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No client updates on transfer log"
  ON public.ownership_transfer_log
  FOR UPDATE
  USING (false);

CREATE POLICY "No client deletes on transfer log"
  ON public.ownership_transfer_log
  FOR DELETE
  USING (false);

-- 2. Create immutability trigger function
CREATE OR REPLACE FUNCTION public.prevent_owner_id_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    IF current_setting('app.transferring_ownership', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Workspace ownership can only be changed via transfer_workspace_ownership()';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER enforce_owner_immutability
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_id_change();

-- 4. Create transfer_workspace_ownership function
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
  _workspace_id uuid,
  _new_owner_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_current_owner_id uuid;
BEGIN
  -- Get current owner and validate caller
  SELECT owner_id INTO v_current_owner_id
  FROM public.organizations
  WHERE id = _workspace_id;

  IF v_current_owner_id IS NULL THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  IF v_current_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  IF v_current_owner_id = _new_owner_id THEN
    RAISE EXCEPTION 'New owner must be different from current owner';
  END IF;

  -- Validate new owner is an active member
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _new_owner_id
      AND organization_id = _workspace_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'New owner must be an active member of the workspace';
  END IF;

  -- Set session variable to bypass immutability trigger
  PERFORM set_config('app.transferring_ownership', 'true', true);

  -- Update owner_id
  UPDATE public.organizations
  SET owner_id = _new_owner_id
  WHERE id = _workspace_id;

  -- Remove old owner's owner role, add admin role
  DELETE FROM public.user_roles
  WHERE user_id = v_current_owner_id
    AND organization_id = _workspace_id
    AND role = 'owner';

  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (v_current_owner_id, _workspace_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- Remove new owner's existing role, add owner role
  DELETE FROM public.user_roles
  WHERE user_id = _new_owner_id
    AND organization_id = _workspace_id;

  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (_new_owner_id, _workspace_id, 'owner');

  -- Audit log
  INSERT INTO public.ownership_transfer_log (workspace_id, from_owner_id, to_owner_id, transferred_by)
  VALUES (_workspace_id, v_current_owner_id, _new_owner_id, auth.uid());

  -- Reset session variable
  PERFORM set_config('app.transferring_ownership', 'false', true);

  RETURN jsonb_build_object('success', true, 'message', 'Ownership transferred successfully');
END;
$$;

-- 5. Add portfolio_features_enabled to accounts
ALTER TABLE public.accounts ADD COLUMN portfolio_features_enabled boolean NOT NULL DEFAULT false;
