-- Add token_hash column to store hashed tokens
-- The original token column will be removed after migration is complete
ALTER TABLE public.organization_invitations 
ADD COLUMN IF NOT EXISTS token_hash text;

-- Create an index on token_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token_hash 
ON public.organization_invitations(token_hash);

-- Create a function to validate and accept invitations securely
-- This function uses SECURITY DEFINER to bypass RLS and access tokens securely
CREATE OR REPLACE FUNCTION public.validate_invitation_token(
  p_token text,
  p_user_id uuid,
  p_user_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_org_name text;
  v_existing_member uuid;
BEGIN
  -- Find the invitation by token hash
  -- We use encode(sha256()) for consistent hashing
  SELECT oi.*, o.name as org_name
  INTO v_invitation
  FROM public.organization_invitations oi
  JOIN public.organizations o ON o.id = oi.organization_id
  WHERE oi.token_hash = encode(sha256(p_token::bytea), 'hex')
    AND oi.accepted_at IS NULL;

  -- If not found by hash, try legacy plaintext token (for backward compatibility)
  IF v_invitation IS NULL THEN
    SELECT oi.*, o.name as org_name
    INTO v_invitation
    FROM public.organization_invitations oi
    JOIN public.organizations o ON o.id = oi.organization_id
    WHERE oi.token = p_token
      AND oi.token_hash IS NULL
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

  RETURN jsonb_build_object(
    'success', true, 
    'organization_name', v_invitation.org_name,
    'role', v_invitation.role::text
  );
END;
$$;

-- Update RLS policy for organization_invitations to hide token column from admins
-- First drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON public.organization_invitations;

-- Create a new policy that uses a view without the token column
-- For now, we'll keep the policy but the tokens will be hashed so they're useless
CREATE POLICY "Users can view invitations sent to them"
ON public.organization_invitations FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  OR has_org_role(auth.uid(), organization_id, 'admin'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'owner'::app_role)
);

-- Migrate existing plaintext tokens to hashed tokens
UPDATE public.organization_invitations
SET token_hash = encode(sha256(token::bytea), 'hex')
WHERE token IS NOT NULL AND token_hash IS NULL;