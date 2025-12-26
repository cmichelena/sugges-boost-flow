-- Fix: Add path validation to storage policy
-- This ensures users can only upload files to their own folder (user_id prefix)

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;

-- Create a new policy that validates the upload path
-- Files must be uploaded to: {auth.uid()}/{...rest of path}
CREATE POLICY "Users can upload to their folder only"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'suggestion-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);