
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token text, p_user_id uuid, p_user_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation record;
  v_org_name text;
  v_existing_member uuid;
  v_allowed_domains text[];
  v_user_domain text;
BEGIN
  -- First try to find by plaintext token (most recent invitations)
  SELECT oi.*, o.name as org_name, o.allowed_email_domains, o.organization_type
  INTO v_invitation
  FROM public.organization_invitations oi
  JOIN public.organizations o ON o.id = oi.organization_id
  WHERE oi.token = p_token
    AND oi.accepted_at IS NULL;

  -- If not found by plaintext token, try by token hash
  IF v_invitation IS NULL THEN
    SELECT oi.*, o.name as org_name, o.allowed_email_domains, o.organization_type
    INTO v_invitation
    FROM public.organization_invitations oi
    JOIN public.organizations o ON o.id = oi.organization_id
    WHERE oi.token_hash = encode(sha256(p_token::bytea), 'hex')
      AND oi.accepted_at IS NULL;
  END IF;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if expired
  IF v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has expired');
  END IF;

  -- Check if email matches
  IF v_invitation.email != p_user_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation was sent to a different email address');
  END IF;

  -- Check email domain restrictions for company orgs
  IF v_invitation.organization_type = 'company' AND v_invitation.allowed_email_domains IS NOT NULL AND array_length(v_invitation.allowed_email_domains, 1) > 0 THEN
    v_user_domain := split_part(p_user_email, '@', 2);
    IF NOT (v_user_domain = ANY(v_invitation.allowed_email_domains)) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Your email domain is not allowed for this organization');
    END IF;
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing_member
  FROM public.organization_members
  WHERE user_id = p_user_id
    AND organization_id = v_invitation.organization_id;

  IF v_existing_member IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a member of this organization');
  END IF;

  -- Add to organization_members
  INSERT INTO public.organization_members (
    user_id, 
    organization_id, 
    status, 
    joined_at, 
    invited_by
  ) VALUES (
    p_user_id,
    v_invitation.organization_id,
    'active'::member_status,
    now(),
    v_invitation.invited_by
  );

  -- Add user role
  INSERT INTO public.user_roles (
    user_id,
    organization_id,
    role
  ) VALUES (
    p_user_id,
    v_invitation.organization_id,
    v_invitation.role
  );

  -- Mark invitation as accepted and clear the plaintext token
  UPDATE public.organization_invitations
  SET accepted_at = now(),
      token = NULL
  WHERE id = v_invitation.id;

  -- Set this as the active organization if user doesn't have one
  UPDATE public.profiles
  SET active_organization_id = v_invitation.organization_id
  WHERE id = p_user_id
    AND active_organization_id IS NULL;

  RETURN jsonb_build_object(
    'success', true, 
    'organization_name', v_invitation.org_name,
    'role', v_invitation.role::text
  );
END;
$function$;
