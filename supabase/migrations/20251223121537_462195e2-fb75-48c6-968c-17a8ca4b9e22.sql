-- Fix PUBLIC_DATA_EXPOSURE: Restrict engagement data access to organization members

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON likes;
DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON reactions;

-- Create new secure policies that restrict access to organization members
CREATE POLICY "Org members can view comments" ON comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM suggestions s 
    WHERE s.id = suggestion_id 
    AND (s.organization_id IS NULL OR is_org_member(auth.uid(), s.organization_id))
  )
);

CREATE POLICY "Org members can view likes" ON likes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM suggestions s 
    WHERE s.id = suggestion_id 
    AND (s.organization_id IS NULL OR is_org_member(auth.uid(), s.organization_id))
  )
);

CREATE POLICY "Org members can view reactions" ON reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM suggestions s 
    WHERE s.id = suggestion_id 
    AND (s.organization_id IS NULL OR is_org_member(auth.uid(), s.organization_id))
  )
);