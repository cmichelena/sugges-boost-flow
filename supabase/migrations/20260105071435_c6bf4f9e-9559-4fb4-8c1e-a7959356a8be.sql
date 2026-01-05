-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can update their own suggestions" ON suggestions;

-- Create new policy allowing assigned users, team members, and admins to update suggestions
CREATE POLICY "Authorized users can update suggestions" ON suggestions
FOR UPDATE USING (
  -- Original author can update
  auth.uid() = user_id 
  -- Assigned user can update
  OR auth.uid() = assigned_to_user_id
  -- Members of the assigned team can update
  OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = suggestions.assigned_team_id
    AND tm.user_id = auth.uid()
  )
  -- Organization admins can update
  OR has_org_role(auth.uid(), organization_id, 'admin'::app_role)
  -- Organization owners can update
  OR has_org_role(auth.uid(), organization_id, 'owner'::app_role)
);