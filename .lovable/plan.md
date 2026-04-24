## Goal

Make the iOS build compliant with Apple Guideline 3.1.1: turn the iOS PWA into a pure sign-in client. No account creation, no workspace creation, no team creation, no invite flow, no marketing copy about billable entities. All pointers to suggistit.com must be **plain text** (no `<a href>`, no `window.open`, no `Link`). Non-iOS behaviour stays exactly as today.

Also: centralise iOS detection in one helper, and fix a blocking TS build error in `NotificationSettings.tsx`.

---

## 1. New shared iOS detection helper

**Create `src/lib/platform.ts`:**

```ts
// Centralised iOS detection. Kept as userAgent-only because
// display-mode: standalone does not trigger reliably inside the
// BuildNatively native wrapper (which is what Apple reviews).
// Single source of truth — change here if we ever move to PWABuilder.
export const isIOSApp = (): boolean =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);
```

**Migrate every existing inline check to use this helper** (no behaviour change, just import + call):

- `src/components/Navbar.tsx` (3 inline checks at lines 74, 144, 205)
- `src/components/SubscriptionStatusCard.tsx` (line 46)
- `src/components/PlanUsageCard.tsx` (line 213)
- `src/components/UpgradePrompt.tsx` (lines 31, 136)
- `src/pages/Pricing.tsx` (line 26)
- `src/pages/Submit.tsx` (line 234)

Pattern: `const isIOSApp = /iPad|iPhone|iPod/.test(navigator.userAgent);` → `import { isIOSApp } from "@/lib/platform";` and call `isIOSApp()` at the use site (or assign once at top of component).

`src/hooks/usePWA.tsx` already has its own `isIOS()` for install prompt logic — leave it untouched (different concern; it's used to render iOS install instructions on the web, not for compliance gating).

---

## 2. Auth / sign-in screen — `src/pages/Auth.tsx`

When `isIOSApp()` is true:

1. **Force sign-in mode and disable the toggle.** Initialise `isSignUp = false` and skip the toggle on iOS so the state can never flip to sign-up.
2. **Hide the "Don't have an account? Sign up" toggle button** (lines 317–326) — render nothing on iOS.
3. **Replace it with plain text** below the form (no `<Link>`, no `<a href>`, no `onClick` to open URLs):
   > New to Suggistit? Visit suggistit.com in your browser to create your account.
4. **Remove pre-auth marketing copy.** Replace the "If you see something, Suggistit" tagline (line 222–224) on iOS with neutral copy:
   > Sign in to Suggistit. Enter your email and password to continue.
5. **Card heading** (line 234): force `"Welcome back"` on iOS (already correct when `isSignUp === false`, but make it unconditional for safety).
6. **Belt-and-braces guard in `handleAuth`:** if `isIOSApp() && isSignUp`, early-return with a toast — defends against any state manipulation.

The form fields, validation, submit button, terms-of-service footer, and overall styling stay identical. Non-iOS behaviour is untouched.

---

## 3. Workspace / organisation creation

### `src/components/CreateOrganizationDialog.tsx`

When `isIOSApp()` is true and the dialog opens, replace the entire form body (lines 186–308) and footer with a compliance message:

> **Workspaces are created on the web.**
> Visit suggistit.com in your browser to set up a workspace.
> If you have been invited to an existing workspace, sign in to open it.

Footer reduces to a single in-app **"Close"** button. No external links, no buttons that call `window.open`. The `handleCreate` path is never reachable on iOS.

### `src/components/NoOrganizationScreen.tsx` (the no-workspace onboarding state)

When `isIOSApp()` is true, replace the two-card layout entirely with the spec text:

> **You haven't been added to a workspace yet.**
> Ask your administrator to invite you, or visit suggistit.com in your browser to create a workspace.

No "Create Workspace" button, no `CreateOrganizationDialog` trigger. The "Join a workspace" card text stays in spirit (telling them to wait for an invitation email is fine), but the explicit "Create" CTA is removed. Plain text only — no clickable suggistit.com.

### `src/components/OrganizationSwitcher.tsx`

When `isIOSApp()` is true, hide the "Create Workspace" / "Create new organization" item from the dropdown menu. Switching between existing workspaces stays available.

### `src/pages/Portfolio.tsx`

When `isIOSApp()` is true, hide the "Create Organisation" header button and the `CreateAccountDialog` trigger. Existing portfolio viewing/switching remains.

---

## 4. Teams / team creation — `src/pages/Teams.tsx`

When `isIOSApp()` is true:

- Hide the entire **"Create New Team"** card (lines 313–333).
- Hide the **"Add Member"** Select + Button row inside each expanded team (lines 393–425).
- Hide the **"Promote to Lead"** and **"Remove member"** action buttons (lines 446–462) — viewing is fine, mutations are not.
- Optionally render a single line of plain text at the top of the page:
  > Team management is handled on suggistit.com.

Team listing/expanding to view current members stays available so an iOS user can see who's in their workspace.

---

## 5. Invites & member management — `src/pages/Organization.tsx`

When `isIOSApp()` is true:

- Hide the **"Invite New Member"** form block (lines ~694–720) — Label, Input, Send Invite button.
- Replace it with plain text:
  > Team invitations are managed on suggistit.com.
- Hide the **"Allowed Email Domains"** add/remove controls (keep the read-only display of existing domains).
- Hide the **"Transfer Ownership"** button — ownership transfer implies billing/seat changes.
- Hide the **member delete (Trash2)** buttons — viewing the member list is fine, removing seats is not.
- The `handleInviteMember`, `handleAddDomain`, `handleDeleteMember`, and ownership-transfer paths become unreachable from the UI on iOS. Add an `isIOSApp()` early-return guard at the top of each as defence-in-depth.

### `src/pages/OrganisationSettings.tsx`

When `isIOSApp()` is true, hide the billing-email edit controls (the Save action implies billing setup). Read-only display of org details, members, and linked workspaces stays. The `PlanUsageCard` already self-hides its upgrade button on iOS via the helper — no extra change needed there.

### `src/components/ElevateToLeadershipDialog.tsx` and `src/components/TransferOwnershipDialog.tsx`

When `isIOSApp()` is true, render the same "managed on suggistit.com" plain-text message and a single Close button instead of the form. They're already only opened from gated triggers above, but this is belt-and-braces.

---

## 6. Router guards — `src/App.tsx`

Currently there's no `/signup`, `/register`, `/create-workspace`, or `/onboarding` route in the router (signup is just a tab on `/auth`, workspace creation is dialog-only). To match the spec's intent and protect against future additions:

Wrap the `<Routes>` block with a small `IOSRouteGuard` component (defined in `src/App.tsx` or `src/components/IOSRouteGuard.tsx`) that:

1. Reads `useLocation()`.
2. If `isIOSApp()` and the pathname matches `/signup`, `/register`, `/create-workspace`, or `/onboarding`, returns `<Navigate to="/auth" replace />`.
3. Otherwise renders `children` unchanged.

Add explicit catch-all routes for `/signup`, `/register`, `/create-workspace`, `/onboarding` that on iOS redirect to `/auth` and on non-iOS fall through to `NotFound`. This makes the guard testable today even though those routes don't exist yet.

---

## 7. Pre-existing 3.1.1 fixes — verify, don't regress

After the helper migration, audit and confirm the following still hide payment/upgrade UI on iOS via `isIOSApp()`:

- `src/pages/Pricing.tsx` — full page replaced with compliance message ✓
- `src/components/SubscriptionStatusCard.tsx` — manage/upgrade button hidden ✓
- `src/components/PlanUsageCard.tsx` — manage subscription button hidden ✓
- `src/components/UpgradePrompt.tsx` and `UpgradeBanner` — "View Plans" CTA hidden ✓
- `src/components/Navbar.tsx` — Plan badge, Pricing dropdown item, public Pricing button hidden ✓
- `src/pages/Submit.tsx` — AI Enhancement Status card hidden ✓

All these get the import-and-call refactor; behaviour is unchanged.

---

## 8. Fix the NotificationSettings build error

`src/components/NotificationSettings.tsx` line 80 fails because `{ [key]: value, updated_at: ... }` produces a wide `string | boolean` index signature that Supabase's generated update type rejects.

Fix by typing the payload explicitly:

```ts
type PrefUpdate = Partial<
  Pick<NotificationPreferences, "in_app_enabled" | "email_enabled" | "push_enabled">
> & { updated_at: string };

const payload: PrefUpdate = {
  [key]: value,
  updated_at: new Date().toISOString(),
} as PrefUpdate;

const { error } = await supabase
  .from("notification_preferences")
  .update(payload)
  .eq("user_id", user!.id);
```

Behaviour identical, build passes.

---

## 9. App version bump — manual step (cannot do in code)

`package.json` is in Lovable's read-only list and we don't edit it. More importantly, **BuildNatively manages the iOS `CFBundleShortVersionString` and `CFBundleVersion` (build number) in its own dashboard**, not from this repo's package.json. So:

- After this change is published, you must go to **BuildNatively → your app → Build settings** and bump the **build number** (and optionally the version, e.g. `1.0.1`) before generating the new IPA. Apple requires a unique build number for each resubmission.

I'll remind you of this when handing off.

---

## Files to be created / modified

**New**
- `src/lib/platform.ts`
- `src/components/IOSRouteGuard.tsx` (small wrapper, optional — could inline in App.tsx)

**Modified**
- `src/App.tsx` (router guards, signup/register/create-workspace/onboarding redirects)
- `src/pages/Auth.tsx` (hide signup, plain-text pointer, neutral copy)
- `src/components/CreateOrganizationDialog.tsx` (iOS replacement content)
- `src/components/NoOrganizationScreen.tsx` (iOS replacement content)
- `src/components/OrganizationSwitcher.tsx` (hide Create on iOS)
- `src/pages/Portfolio.tsx` (hide Create Organisation button on iOS)
- `src/pages/Teams.tsx` (hide create-team, add-member, promote, remove on iOS)
- `src/pages/Organization.tsx` (hide invite, domain edits, member delete, transfer ownership on iOS)
- `src/pages/OrganisationSettings.tsx` (hide billing-email edit on iOS)
- `src/components/ElevateToLeadershipDialog.tsx` (compliance message on iOS)
- `src/components/TransferOwnershipDialog.tsx` (compliance message on iOS)
- `src/components/Navbar.tsx` (use shared helper)
- `src/components/SubscriptionStatusCard.tsx` (use shared helper)
- `src/components/PlanUsageCard.tsx` (use shared helper)
- `src/components/UpgradePrompt.tsx` (use shared helper)
- `src/pages/Pricing.tsx` (use shared helper)
- `src/pages/Submit.tsx` (use shared helper)
- `src/components/NotificationSettings.tsx` (TS payload typing fix)

---

## Out of scope / not changed

- Backend RPCs (`create_organization_with_owner`, `send-invitation` edge function) — left intact; they're still used by web users and protect via RLS regardless. We only hide the UI surfaces.
- `usePWA.tsx`'s own `isIOS()` — different purpose (install prompt instructions for web visitors), keep as-is.
- Non-iOS web/desktop UX — unchanged everywhere.
- `package.json` version — must be bumped manually in BuildNatively dashboard before resubmission.

## Verification after implementation

1. Visit `/auth` with an iOS user-agent string spoofed → only Sign In form, no toggle, plain-text pointer to suggistit.com.
2. Sign in as a user with no workspace → see iOS-compliant "ask your administrator" plain text, no Create button.
3. Visit `/teams`, `/organization`, `/organisation-settings` on iOS → no create/invite/promote/remove/transfer controls; viewing still works.
4. Try `/signup`, `/register`, `/create-workspace`, `/onboarding` on iOS → redirected to `/auth`.
5. Non-iOS browser → every flow above behaves exactly like today.
6. `npm run build` passes (NotificationSettings TS error gone).