-- Fix search path for the reaction score function
CREATE OR REPLACE FUNCTION public.get_reaction_score(p_suggestion_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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