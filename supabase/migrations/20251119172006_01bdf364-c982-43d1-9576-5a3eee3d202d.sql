-- Add archived field and closure tracking to suggestions
ALTER TABLE public.suggestions 
ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS closure_comment_id uuid REFERENCES public.comments(id);

-- Add index for better query performance on archived suggestions
CREATE INDEX IF NOT EXISTS idx_suggestions_archived ON public.suggestions(archived);

-- Update RLS policy to include archived suggestions in queries
-- (Users can still view archived suggestions in their organization)