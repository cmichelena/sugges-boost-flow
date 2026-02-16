

# Portfolio Readiness: Add Account/Portfolio Layer

## Summary

Introduce a lightweight `accounts` table as a parent entity above workspaces (organizations), enabling one property management customer to own multiple Building workspaces with unified access and future billing consolidation. No UI changes in this phase -- data model only.

## Current State

- `organizations` is the top-level entity with no parent grouping
- Roles are per-workspace only
- Billing is per-workspace (stripe_customer_id on organizations)
- No cross-workspace querying capability

## What Changes

### 1. New `accounts` Table

```text
accounts
  id            uuid PK
  name          text NOT NULL
  owner_id      uuid NOT NULL (references auth.users)
  billing_email text
  stripe_customer_id  text  (for future account-level billing)
  created_at    timestamptz
  updated_at    timestamptz
```

RLS: owner and account members can view; owner can update.

### 2. New `account_members` Table

```text
account_members
  id          uuid PK
  account_id  uuid FK -> accounts
  user_id     uuid NOT NULL
  role        text NOT NULL  ('portfolio_admin' | 'manager' | 'viewer')
  created_at  timestamptz
  UNIQUE(account_id, user_id)
```

This is separate from workspace-level roles. A Portfolio Admin can see all buildings; a Manager might see a subset; a Viewer is read-only across the portfolio.

### 3. Add `account_id` to `organizations`

```text
ALTER TABLE organizations
  ADD COLUMN account_id uuid REFERENCES accounts(id);
CREATE INDEX idx_organizations_account ON organizations(account_id);
```

- Nullable so existing workspaces continue to work unchanged
- Personal workspaces and standalone company workspaces remain account_id = NULL
- When a property management company creates buildings, all get the same account_id

### 4. Performance Indexes for Cross-Workspace Queries

```text
-- Portfolio aggregation: all suggestions across buildings for one account
CREATE INDEX idx_suggestions_org_status ON suggestions(organization_id, status);

-- Overdue queries on target dates
CREATE INDEX idx_suggestions_target_dates ON suggestions(target_response_date, target_resolution_date)
  WHERE target_response_date IS NOT NULL OR target_resolution_date IS NOT NULL;
```

### 5. Portfolio Query Function (SECURITY DEFINER)

A database function `get_portfolio_summary(account_id)` that returns:
- Open issues count by status (across all buildings)
- Overdue vs on-time counts (based on target_response_date / target_resolution_date)
- Top categories
- Buildings ranked by backlog size

This function validates the caller is an account member before returning data.

### 6. Billing Preparation

- Add `stripe_customer_id` on `accounts` for future account-level billing
- Existing per-workspace billing continues to work unchanged
- When account-level billing is activated later, workspace-level stripe fields become secondary

## What Does NOT Change

- All existing workspace functionality remains identical
- Personal workspaces ignore accounts entirely
- Existing RLS policies are untouched
- No UI changes in this phase
- No changes to the OrganizationSwitcher or workspace creation flow yet

## Technical Details

### Migration SQL

One migration that:
1. Creates `accounts` table with RLS
2. Creates `account_members` table with RLS
3. Adds `account_id` column to `organizations`
4. Creates indexes
5. Creates `get_portfolio_summary()` function

### RLS Policies

**accounts:**
- SELECT: owner OR exists in account_members
- INSERT: authenticated users (owner_id = auth.uid())
- UPDATE: owner only
- DELETE: owner only

**account_members:**
- SELECT: account members can see other members
- INSERT/UPDATE/DELETE: account owner or portfolio_admin only

### Security Definer Functions

- `is_account_member(user_id, account_id)` -- used in RLS to avoid recursion
- `has_account_role(user_id, account_id, role)` -- for role checks
- `get_portfolio_summary(account_id)` -- cross-workspace aggregation

### Future Workspace Creation Flow

When account-level UI is added later:
1. User creates an Account (e.g., "Pinnacle Properties")
2. Creates Building workspaces under that account
3. Each workspace gets `account_id` set automatically
4. Portfolio dashboard queries `get_portfolio_summary()`

This is additive -- no refactoring needed.

## File Changes

| File | Change |
|------|--------|
| New migration | accounts table, account_members table, account_id column, indexes, functions |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

No application code changes needed in this phase.
