-- Create organization_invitations table
CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  token text UNIQUE NOT NULL,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Only org admins/owners can create invitations
CREATE POLICY "Admins can create invitations"
ON public.organization_invitations
FOR INSERT
WITH CHECK (
  has_org_role(auth.uid(), organization_id, 'admin'::app_role) OR 
  has_org_role(auth.uid(), organization_id, 'owner'::app_role)
);

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to them"
ON public.organization_invitations
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR has_org_role(auth.uid(), organization_id, 'admin'::app_role)
  OR has_org_role(auth.uid(), organization_id, 'owner'::app_role)
);

-- Only org admins/owners can delete invitations
CREATE POLICY "Admins can delete invitations"
ON public.organization_invitations
FOR DELETE
USING (
  has_org_role(auth.uid(), organization_id, 'admin'::app_role) OR 
  has_org_role(auth.uid(), organization_id, 'owner'::app_role)
);

-- Create index for faster lookups
CREATE INDEX idx_invitations_token ON public.organization_invitations(token);
CREATE INDEX idx_invitations_email ON public.organization_invitations(email);
CREATE INDEX idx_invitations_org ON public.organization_invitations(organization_id);