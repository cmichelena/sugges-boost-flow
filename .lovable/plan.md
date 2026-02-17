

# Workspace Ownership Hardening, Transfer Flow, and Pricing Positioning

## Overview

This plan formalizes `organizations.owner_id` as an immutable legal data authority, adds a safe transfer mechanism with full UI, updates pricing page copy, and prepares for future portfolio add-on features.

---

## Part 1: Database Changes (Ownership Hardening)

### 1A. Create `ownership_transfer_log` table
- Columns: `id`, `workspace_id`, `from_owner_id`, `to_owner_id`, `transferred_at`, `transferred_by`
- RLS: SELECT only for workspace members; no INSERT/UPDATE/DELETE via client (populated by server function only)

### 1B. Create `transfer_workspace_ownership()` function
- `SECURITY DEFINER` function accepting `_workspace_id uuid, _new_owner_id uuid`
- Validates caller is current `owner_id` via `auth.uid()`
- Validates `_new_owner_id` is an active member of the workspace (via `organization_members`)
- Within a single transaction:
  - Sets a session variable (`SET LOCAL app.transferring_ownership = 'true'`) to bypass the immutability trigger
  - Updates `organizations.owner_id` to `_new_owner_id`
  - Removes old owner's `owner` role from `user_roles`, inserts `admin` role
  - Removes any existing role for new owner from `user_roles`, inserts `owner` role
  - Inserts audit record into `ownership_transfer_log`
- Returns JSON success confirmation

### 1C. Create immutability trigger on `organizations`
- `BEFORE UPDATE` trigger function: `prevent_owner_id_change()`
- If `OLD.owner_id != NEW.owner_id`:
  - Check session variable `current_setting('app.transferring_ownership', true)`
  - If not `'true'`, raise exception: `"Workspace ownership can only be changed via transfer_workspace_ownership()"`
  - Otherwise allow the change

### 1D. Add `portfolio_features_enabled` to `accounts` table
- `ALTER TABLE accounts ADD COLUMN portfolio_features_enabled boolean NOT NULL DEFAULT false`

### 1E. Confirm existing RLS (no changes needed)
- UPDATE on `organizations` remains `owner_id = auth.uid()` -- confirmed
- DELETE on `organizations` remains `owner_id = auth.uid()` -- confirmed
- Portfolio roles have no write access to `organizations` -- confirmed

---

## Part 2: UI -- Ownership Transfer Flow

### 2A. New component: `TransferOwnershipDialog.tsx`
A multi-step modal dialog:

**Step 1 -- Select new owner**
- Dropdown/list of active workspace members (excludes current owner)
- Fetches from `organization_members` joined with `profiles` for display names

**Step 2 -- Confirmation**
- Displays warning text: "Transferring ownership gives the new owner full legal control of this workspace, including transfer to another organisation and deletion."
- Shows selected user name

**Step 3 -- Execute**
- Calls `supabase.rpc('transfer_workspace_ownership', { _workspace_id, _new_owner_id })`
- On success: toast confirmation, refresh organization context
- On error: toast error message

### 2B. Update Workspace Settings page (`src/pages/Organization.tsx`)
- Add a new "Workspace Ownership" card section (visible to all members, actionable by owner only)
- Displays:
  - Current owner name with Crown badge
  - Description: "The workspace owner is the legal data authority. Only the owner can transfer or delete this workspace."
  - "Transfer Ownership" button (visible only when `userRole === 'owner'`)
- Button opens `TransferOwnershipDialog`
- Positioned after "Workspace Details" card, before the existing sections

### 2C. No owner_id exposure elsewhere
- The existing code does not expose `owner_id` in any editable form fields -- confirmed safe, no changes needed

---

## Part 3: Pricing Page Copy Update

### 3A. Update `src/pages/Pricing.tsx`
- Replace the current subheading ("Start free and scale as your team grows") with:
  - "Each office, building, or community operates as its own workspace."
  - "Subscriptions apply per workspace. Organisations group multiple workspaces for portfolio oversight."
- Add a small note below the pricing cards grid (before the VAT notice):
  - "Workspace data ownership always remains with the workspace owner."
- No changes to Stripe integration or billing logic

---

## Part 4: Portfolio Add-On Preparation

- The `portfolio_features_enabled` column on `accounts` (from Part 1D) serves as the feature flag
- No UI implementation yet -- this is preparation only
- Documented scope for future activation:
  - Cross-workspace dashboard
  - Aggregated analytics
  - Portfolio exports
  - Centralised member management
  - Governance audit log

---

## Technical Details

### Migration SQL summary

```text
1. CREATE TABLE ownership_transfer_log (...)
2. CREATE FUNCTION transfer_workspace_ownership(...)
3. CREATE FUNCTION prevent_owner_id_change() -- trigger function
4. CREATE TRIGGER enforce_owner_immutability ON organizations
5. ALTER TABLE accounts ADD COLUMN portfolio_features_enabled boolean DEFAULT false
6. RLS on ownership_transfer_log (SELECT for workspace members)
```

### Files to create
- `src/components/TransferOwnershipDialog.tsx`

### Files to modify
- `src/pages/Organization.tsx` -- add Workspace Ownership section
- `src/pages/Pricing.tsx` -- update copy text

### Files unchanged
- All RLS policies remain as-is
- No changes to `supabase/config.toml`, `client.ts`, or `types.ts`
- No changes to Stripe/billing logic

