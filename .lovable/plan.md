

# Portfolio Readiness: Add Account/Portfolio Layer

## Summary

Introduce a lightweight `accounts` table as a parent entity above workspaces (organizations), enabling one property management customer to own multiple Building workspaces with unified access and future billing consolidation.

## Status: Phase 2 Complete ✅

### Phase 1 (Data Model) ✅
- `accounts` table with RLS
- `account_members` table with RLS  
- `account_id` column on `organizations`
- Performance indexes on `suggestions`
- `get_portfolio_summary()` function
- `is_account_member()` and `has_account_role()` helper functions
- Updated `create_organization_with_owner()` to accept optional `_account_id`

### Phase 2 (Portfolio UI MVP) ✅
- `useAccount` hook with context provider and account switcher
- `AccountSwitcher` component (like OrganizationSwitcher)
- `/portfolio` page with:
  - Account creation dialog (name + billing email)
  - Portfolio overview powered by `get_portfolio_summary()`
  - Status breakdown, overdue counts, top categories, buildings by backlog
- Updated `CreateOrganizationDialog` with "Attach to Portfolio" selector
- Portfolio nav item in user dropdown (conditional on account membership)
- `AccountProvider` wrapping app routes

### Phase 3 (Future)
- Account member management UI (invite/remove)
- Building row click → switch workspace context
- Account-level billing consolidation
- Portfolio filtering and date range controls
