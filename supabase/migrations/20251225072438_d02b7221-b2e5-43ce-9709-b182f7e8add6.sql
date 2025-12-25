-- Fix 1: Drop the unique constraint on token column (it's no longer needed)
ALTER TABLE public.organization_invitations DROP CONSTRAINT IF EXISTS organization_invitations_token_key;

-- Fix 2: Make token column nullable and set default to NULL
ALTER TABLE public.organization_invitations 
  ALTER COLUMN token DROP NOT NULL,
  ALTER COLUMN token SET DEFAULT NULL;

-- Fix 3: Update existing invitations to clear plaintext tokens
UPDATE public.organization_invitations 
SET token = NULL 
WHERE token IS NOT NULL AND token != '' AND token_hash IS NOT NULL;

-- Fix 4: Make suggestion-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'suggestion-attachments';

-- Fix 5: Drop the overly permissive public access policy
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;

-- Fix 6: Create authenticated policy for viewing attachments (org members only)
CREATE POLICY "Org members can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'suggestion-attachments' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.suggestion_attachments sa
    JOIN public.suggestions s ON s.id = sa.suggestion_id
    WHERE sa.file_path = name
    AND (s.organization_id IS NULL OR public.is_org_member(auth.uid(), s.organization_id))
  )
);