-- Create enum for reaction types
CREATE TYPE public.reaction_type AS ENUM ('champion', 'support', 'neutral', 'concerns');

-- Create new reactions table
CREATE TABLE public.reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  reaction_type reaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, suggestion_id)
);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Reactions are viewable by everyone"
ON public.reactions FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reactions"
ON public.reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON public.reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.reactions FOR DELETE
USING (auth.uid() = user_id);

-- Migrate existing likes to reactions (as 'support' type)
INSERT INTO public.reactions (user_id, suggestion_id, reaction_type, created_at)
SELECT user_id, suggestion_id, 'support'::reaction_type, created_at
FROM public.likes
ON CONFLICT (user_id, suggestion_id) DO NOTHING;

-- Create function to calculate weighted reaction score for a suggestion
CREATE OR REPLACE FUNCTION public.get_reaction_score(p_suggestion_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(
    CASE reaction_type
      WHEN 'champion' THEN 2
      WHEN 'support' THEN 1
      WHEN 'neutral' THEN 0
      WHEN 'concerns' THEN -1
    END
  ), 0)::INTEGER
  FROM public.reactions
  WHERE suggestion_id = p_suggestion_id;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_reactions_updated_at
BEFORE UPDATE ON public.reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();