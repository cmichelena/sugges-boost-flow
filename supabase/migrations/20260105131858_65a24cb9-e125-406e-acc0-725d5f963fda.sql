-- Update the get_reaction_score function to match new weights
-- Strong Support (champion) = +2, Support = +1, Oppose (neutral) = -1, Strong Oppose (concerns) = -2
CREATE OR REPLACE FUNCTION public.get_reaction_score(p_suggestion_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE reaction_type
      WHEN 'champion' THEN 2    -- Strong Support
      WHEN 'support' THEN 1     -- Support
      WHEN 'neutral' THEN -1    -- Oppose
      WHEN 'concerns' THEN -2   -- Strong Oppose
    END
  ), 0)::INTEGER
  FROM public.reactions
  WHERE suggestion_id = p_suggestion_id;
$$;