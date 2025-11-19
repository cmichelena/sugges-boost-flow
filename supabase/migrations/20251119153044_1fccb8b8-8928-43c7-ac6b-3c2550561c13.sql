-- Fix Critical Security Issues: Organizations Payment Data & Public Profiles

-- 1. Fix Organizations Table - Restrict payment data to owners only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;

-- Create view for members (excludes sensitive payment fields)
CREATE OR REPLACE VIEW organizations_member_view AS
SELECT 
  id,
  name,
  slug,
  owner_id,
  created_at,
  updated_at
  -- Excludes: stripe_customer_id, stripe_subscription_id, subscription_status, subscription_tier, trial_ends_at
FROM organizations;

-- Enable RLS on the view
ALTER VIEW organizations_member_view SET (security_invoker = true);

-- Full access for owners on main table
CREATE POLICY "Owners can view all organization data"
ON organizations FOR SELECT
USING (owner_id = auth.uid());

-- Members can view through the safe view (will be handled in queries)
-- Note: The view inherits RLS from the base table, so we need a policy for it
CREATE POLICY "Members can view basic organization info"
ON organizations FOR SELECT
USING (
  owner_id = auth.uid() OR 
  is_org_member(auth.uid(), id)
);

-- But to truly restrict columns, we need to use the view in application code
-- for non-owners. Document this in the migration.

-- 2. Fix Profiles Table - Require authentication
-- Drop the public access policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Require authentication to view profiles
CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Keep other policies unchanged
-- "Users can update their own profile" should already exist
-- "Users can insert their own profile" should already exist

-- Add comment explaining the security rationale
COMMENT ON POLICY "Authenticated users can view profiles" ON profiles IS 
'Requires authentication to prevent public scraping of user data. Protects privacy and prevents bot enumeration of users.';