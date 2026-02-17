

# Current vs Target Structure: Data Model and UI Audit

## A) Current Model (DB + UI) -- Ground Truth

### Database Tables

```text
accounts
  id (uuid PK), name (text), owner_id (uuid), billing_email (text),
  stripe_customer_id (text), created_at, updated_at
  Purpose: Parent "portfolio" entity grouping multiple workspaces

account_members
  id (uuid PK), account_id (uuid FK -> accounts), user_id (uuid),
  role (text: 'portfolio_admin' | 'manager' | 'viewer'), created_at
  Unique constraint: (account_id, user_id)
  Purpose: Portfolio-level membership and roles

organizations
  id (uuid PK), name (text), slug (text), owner_id (uuid),
  account_id (uuid FK -> accounts, NULLABLE),
  organization_type ('personal' | 'company'),
  workspace_type (text: 'organisation' | 'building'),
  subscription_tier, subscription_status, trial_ends_at,
  stripe_customer_id, stripe_subscription_id,
  allowed_email_domains (text[]), public_visibility_mode (boolean),
  created_at, updated_at
  Purpose: The operational container where Suggistit runs

organization_members
  id, organization_id (FK -> organizations), user_id, status ('active'|'pending'),
  invited_by, invited_at, joined_at
  Purpose: Workspace-level membership

user_roles
  id, user_id, organization_id (FK -> organizations), role ('owner'|'admin'|'member')
  Purpose: Workspace-level role assignments (separate from membership)

suggestions
  id, organization_id (FK -> organizations), user_id, title, description,
  status, category, category_id, target_response_date, target_resolution_date,
  responsible_party_id, responsible_party_name, assigned_team_id, assigned_to_user_id,
  archived, is_anonymous, ...
  Purpose: The core work items, scoped to a single workspace
```

### Current UI Mapping

| UI Element | Route/Component | What It Actually Shows/Edits |
|---|---|---|
| "Organization" page title | `/organization` (Organization.tsx) | Edits an `organizations` row (the workspace) |
| "Organization Details" card | Organization.tsx line 381 | Shows name, type, domains of the active `organizations` row |
| "My Organizations" list | Organization.tsx line 498 | Lists all `organizations` rows the user belongs to |
| "Organization" nav label | Navbar.tsx line 148 | Links to `/organization` which manages a workspace |
| OrganizationSwitcher | Navbar header | Switches between `organizations` rows (workspaces) |
| CreateOrganizationDialog | Dialog component | Creates a new `organizations` row with workspace_type picker |
| "Portfolio" page | `/portfolio` (Portfolio.tsx) | Shows `accounts` data + `get_portfolio_summary()` aggregation |
| AccountSwitcher | Portfolio page | Switches between `accounts` rows (portfolios) |
| "Create Portfolio Account" dialog | Portfolio.tsx | Creates a new `accounts` row |
| "Create Workspace" dialog title | CreateOrganizationDialog | Already correctly labeled "Create Workspace" |

---

## B) Target Model -- Concise Map

```text
Organisation (= accounts table)
  The owner/portfolio entity. One Organisation can own many Workspaces.
  Roles: portfolio_admin, manager, viewer (via account_members)

Workspace (= organizations table)
  The operational container where Suggistit runs.
  Has a workspace_type preset (organisation/office, building, etc.)
  Links to parent Organisation via account_id (nullable for standalone/personal)
  Roles: owner, admin, member (via user_roles + organization_members)

Suggestions live inside Workspaces (organization_id FK)
Portfolio summary aggregates across Workspaces sharing the same account_id
```

---

## C) Gap List (Conceptual Mismatches)

1. **"/organization" page title says "Organization"** but it edits `organizations` rows which should be called "Workspaces" in the target model.

2. **"Organization Details" heading** on the settings page should say "Workspace Settings" or "Workspace Details."

3. **"My Organizations" section** lists `organizations` rows and should say "My Workspaces."

4. **"Organization Name" label** in the details card should say "Workspace Name."

5. **"Organization Type" selector** (personal/company) label is ambiguous -- "Workspace Visibility" or "Workspace Access Type" would be clearer.

6. **OrganizationSwitcher** dropdown label says "Your Workspace" (singular) or "Switch Workspace" -- this is actually already correct for the target model, but the component name in code says "Organization."

7. **Navbar menu** groups Portfolio under a "Portfolio" section and the workspace link under "Account" section label -- but "Account" in the dropdown actually links to /organization (a workspace). The section label "Account" clashes with the `accounts` table concept.

8. **Portfolio page** uses the term "Account" heavily ("New Account", "Create Portfolio Account", "Account Name") -- in the target model this should consistently be "Organisation" or "Portfolio."

9. **CreateOrganizationDialog** toast says "Organization created successfully!" but should say "Workspace created."

10. **"Attach to Portfolio" selector** in CreateOrganizationDialog is reasonable but could say "Attach to Organisation" if we pick "Organisation" as the parent label.

---

## D) Minimal Change Plan (UI Renames Only -- No DB Changes)

### Recommended terminology decision

- `accounts` table -> labeled as **"Organisation"** in UI (the owner entity)
- `organizations` table -> labeled as **"Workspace"** in UI (the operational container)

This aligns with the user's target: "Organisation = the owner entity."

### Route changes

| Current Route | New Route | Notes |
|---|---|---|
| `/organization` | `/workspace` | Workspace settings page |
| `/portfolio` | `/organisation` (or keep `/portfolio`) | Organisation/portfolio dashboard |

Recommendation: keep `/portfolio` as-is for now to avoid breaking bookmarks, but update heading text.

### Page and heading renames

| Location | Current Text | New Text |
|---|---|---|
| Organization.tsx h1 | "Organization" | "Workspace Settings" |
| Organization.tsx card | "Organization Details" | "Workspace Details" |
| Organization.tsx label | "Organization Name" | "Workspace Name" |
| Organization.tsx label | "Organization Type" | "Access Type" |
| Organization.tsx section | "My Organizations (N)" | "My Workspaces (N)" |
| Organization.tsx description | "All organizations you're a member of" | "All workspaces you're a member of" |
| Organization.tsx toast | "Organization created successfully!" | (already in CreateOrganizationDialog -- fix there) |

### CreateOrganizationDialog renames

| Current | New |
|---|---|
| Toast "Organization created successfully!" | "Workspace created successfully!" |
| Label "Attach to Portfolio" | "Attach to Organisation" |
| Description "...portfolio account..." | "...organisation for consolidated management" |

### Portfolio page renames

| Current | New |
|---|---|
| Page title "Portfolio" | "Organisation Overview" (or keep "Portfolio") |
| Button "New Account" | "New Organisation" |
| Dialog title "Create Portfolio Account" | "Create Organisation" |
| Label "Account Name" | "Organisation Name" |
| Empty state "No Portfolios Yet" | "No Organisations Yet" |
| Empty state "Create Your First Account" | "Create Your First Organisation" |
| AccountSwitcher label "Switch Portfolio" | "Switch Organisation" |

### Navbar renames

| Current | New |
|---|---|
| Section label "Account" | "Management" |
| Link label from i18n `settings.organization` | "Workspace Settings" |
| Link to `/organization` | Link to `/workspace` (or keep route, just change label) |
| Portfolio section link "Portfolio Dashboard" | "Organisation Dashboard" (or keep "Portfolio Dashboard") |

### Component/hook names (code-only, no user impact)

These are optional but improve developer clarity. No rush:
- `useOrganization` -> conceptually manages "workspaces" (document with a comment, no rename needed now)
- `useAccount` -> conceptually manages "organisations/portfolios" (same)
- File names can stay as-is to avoid large diffs

### i18n keys to update

- `settings.organization` -> update value to "Workspace Settings"
- Add new keys for "Organisation" terminology in en.json, es.json, pt.json

---

## E) Guardrails Confirmation

1. **Standalone workspaces**: Yes -- `account_id` on `organizations` is nullable. Personal workspaces and standalone company workspaces work with `account_id = NULL`. No code path requires a non-null account_id.

2. **Route guarding**: The Portfolio page (`/portfolio`) checks `useAccount()` and shows an empty state if `accounts.length === 0`. The `get_portfolio_summary()` RPC function validates the caller is an account member or owner before returning data. Additional route-level guard (redirect non-members) should be added.

3. **Workspace creation under an Organisation**: The `create_organization_with_owner()` DB function already enforces that `_account_id` (if provided) requires the caller to be either the account owner or have `portfolio_admin` role. This is correct.

4. **Portfolio-level roles are separate from workspace roles**: `account_members.role` (portfolio_admin/manager/viewer) is independent of `user_roles.role` (owner/admin/member). No conflict.

