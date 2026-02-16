
-- Update create_organization_with_owner to accept optional account_id
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _name text,
  _slug text,
  _owner_id uuid,
  _organization_type organization_type,
  _workspace_type text,
  _allowed_email_domains text[] DEFAULT NULL,
  _account_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- If account_id provided, verify user is account owner or portfolio_admin
  IF _account_id IS NOT NULL THEN
    IF NOT (
      EXISTS (SELECT 1 FROM public.accounts WHERE id = _account_id AND owner_id = _owner_id)
      OR has_account_role(_owner_id, _account_id, 'portfolio_admin')
    ) THEN
      RAISE EXCEPTION 'Not authorized to create workspaces under this account';
    END IF;
  END IF;

  -- Create the organization
  INSERT INTO public.organizations (
    name, slug, owner_id, organization_type,
    subscription_tier, subscription_status, trial_ends_at,
    allowed_email_domains, workspace_type, account_id
  ) VALUES (
    _name, _slug, _owner_id, _organization_type,
    'free'::subscription_tier, 'trialing'::subscription_status,
    now() + interval '14 days',
    _allowed_email_domains, _workspace_type, _account_id
  )
  RETURNING id INTO new_org_id;

  -- Add owner as active member
  INSERT INTO public.organization_members (user_id, organization_id, status, joined_at, invited_by)
  VALUES (_owner_id, new_org_id, 'active'::member_status, now(), _owner_id);

  -- Add owner role
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (_owner_id, new_org_id, 'owner'::app_role);

  -- Set as active organization
  UPDATE public.profiles
  SET active_organization_id = new_org_id
  WHERE id = _owner_id;

  RETURN new_org_id;
END;
$$;
