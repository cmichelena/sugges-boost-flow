-- Fix RLS policy for anonymous suggestions
-- The current policy fails because auth.uid() = user_id fails when user_id is NULL for anonymous suggestions

DROP POLICY IF EXISTS "Users can create suggestions in their organization" ON suggestions;

CREATE POLICY "Users can create suggestions in their organization"
  ON suggestions FOR INSERT
  WITH CHECK (
    (
      -- Authenticated user creating normal suggestion (user_id must match)
      (auth.uid() = user_id AND is_anonymous = false)
      OR
      -- Authenticated user creating anonymous suggestion (user_id must be NULL)
      (auth.uid() IS NOT NULL AND user_id IS NULL AND is_anonymous = true)
    )
    AND
    -- Organization membership check for both cases
    (organization_id IS NULL OR is_org_member(auth.uid(), organization_id))
  );