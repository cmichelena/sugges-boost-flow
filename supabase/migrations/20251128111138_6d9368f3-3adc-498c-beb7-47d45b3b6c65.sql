-- Create storage bucket for suggestion attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'suggestion-attachments', 
  'suggestion-attachments', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Create table to track attachments
CREATE TABLE public.suggestion_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suggestion_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments in their organization"
ON public.suggestion_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.suggestions s
    WHERE s.id = suggestion_attachments.suggestion_id
    AND (s.organization_id IS NULL OR is_org_member(auth.uid(), s.organization_id))
  )
);

CREATE POLICY "Users can upload attachments to their suggestions"
ON public.suggestion_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.suggestions s
    WHERE s.id = suggestion_attachments.suggestion_id
    AND (s.user_id = auth.uid() OR s.is_anonymous = true)
    AND (s.organization_id IS NULL OR is_org_member(auth.uid(), s.organization_id))
  )
);

CREATE POLICY "Users can delete their own attachments"
ON public.suggestion_attachments
FOR DELETE
USING (uploaded_by = auth.uid());

-- Storage policies for the bucket
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'suggestion-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'suggestion-attachments');

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'suggestion-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);