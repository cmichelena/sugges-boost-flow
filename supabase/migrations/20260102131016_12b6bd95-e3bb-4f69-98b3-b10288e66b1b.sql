-- Add explicit DENY UPDATE policy on organization_invitations
-- This makes it clear that all invitation updates must go through the secure validate_invitation_token() function
CREATE POLICY "No direct updates to invitations"
ON public.organization_invitations
FOR UPDATE
USING (false);