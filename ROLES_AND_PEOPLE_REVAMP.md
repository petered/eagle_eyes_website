# Roles & People revamp — Admin / Manager / Member

## Context & decision

The portal has two role systems that today are named and managed separately,
which confuses users:

- **Account (billing):** one role, `owner`. Managed on **Billing → Account
  access** (`#view=access`).
- **Organization (team):** `admin` + `member`. Managed on **Organization →
  People**.

An **Account funds many Organizations** (1:N via `account.organization_ids[]`;
the org doc has no back-reference). Account ownership and org admin are
**independent** today — an account owner cannot manage team membership.

**Decision:** collapse the two systems into a single intuitive **ladder** and
manage everything from the **People** page:

| New name | = today's role | Scope | Can… |
|---|---|---|---|
| **Member** | org `member` | their org | use the apps: activate licenses, manage devices (disconnect/transfer), edit shared configs |
| **Manager** | org `admin` | their org | everything a Member can, **plus** add/remove Members and promote/demote Managers in **their** team |
| **Admin** | account `owner` | the whole account | everything a Manager can, across **every** team the account funds, **plus** billing (purchase, renew, invoices) and assigning Managers and other Admins |

Admin > Manager > Member is a true hierarchy, so the bare **Admin / Manager /
Member** badges are unambiguous.

**This requires a backend change** (account owners must be allowed to manage the
orgs their account funds) — see the backend section. Everything else is
frontend.

### In-portal roles explainer (final copy)

> **Roles** — Two things are going on: a **team** that uses Eagle Eyes and an
> **account** that pays for it.
> - **Member** — Uses Eagle Eyes: activates licenses, manages devices, edits the
>   team's shared configurations. Can see everyone on the team.
> - **Manager** — A Member who also runs the team: add and remove Members, and
>   promote or demote Managers. (The last Manager can't step down.)
> - **Admin** — Runs the account: manages every team it funds (add/remove
>   Members, assign Managers and other Admins) and handles billing — purchases,
>   renewals and invoices. (The last Admin can't be removed.) Being an Admin is
>   about running the account; they only *use* Eagle Eyes if they're also added
>   as a Member.

---

## Backend recommendations (`eagle_eyes_firebase_functions`)

All paths under `functions/licensing/firestore_helpers/`.

### B1 (required) — let an Admin manage any org their account funds

Add a helper that answers "is `email` an owner of an account that funds this
org?", and OR it into the org-management permission checks.

1. **New helper** (in `organization_endpoints.py`, near `_can_manage_org` at
   `:92`), e.g.:
   ```python
   def _is_account_admin_for_org(email, org) -> bool:
       # An account funds an org when org.id is in account.organization_ids.
       for account in get_accounts_funding_org(org["id"]):
           if _is_account_owner(email, account):   # account_endpoints.py:1087
               return True
       return False
   ```
   - `get_accounts_funding_org(org_id)`: Firestore query
     `accounts.where("organization_ids", "array_contains", org_id)`. Add it in
     `account_endpoints.py` (reuse if a reverse lookup already exists).

2. **Wire it into the two gates** so all four endpoints inherit it:
   - `_can_manage_org(email, org)` (`organization_endpoints.py:92`) →
     `return _is_org_admin(...) or is_admin(email) or _is_account_admin_for_org(email, org)`
   - `_can_add_member(email, org)` (`:108`) → also allow
     `_is_account_admin_for_org(...)`.

   This automatically covers `add_member` (`:373`), `remove_member` (`:434`),
   `add_admin` (`:542`), `remove_admin` (`:610`) — they already delegate to
   those two helpers.

3. **Keep the guards:** last-admin (org) and last-owner (account) invariants are
   unchanged. An Admin removing the last Manager of a team is allowed (the Admin
   still covers it); only block an Admin/Manager from demoting **themselves** as
   the last one of their kind.

### B2 (recommended) — surface "can manage" on the dashboard

`get_account_dashboard` (`account_endpoints.py:1017`) returns each org with an
`is_admin` convenience flag for the caller. Extend it so `is_admin` (or a new
`caller_can_manage`) is **true when the caller is an Admin of a funding
account**, not only when they're an org admin. The frontend uses this flag to
decide whether to show edit controls.

> Optional: the frontend can derive this itself from `accounts[].members` +
> `accounts[].organization_ids[]`, so B2 is a convenience, not a blocker. B1 is
> the hard requirement — without it the management calls 403.

### Roles values unchanged

No Firestore role-value changes. `owner` / `admin` / `member` stay as stored
values; only the **labels** change, and only in the frontend. The
`add_account_owner` / `remove_account_owner` and org endpoints keep their current
request/response shapes.

---

## Frontend plan (`account.html`, `_includes/account-sidebar.html`)

### F1 — Relabel (badges, toasts, legend)

- **People badges** (`buildMemberRow` ~`account.html:9523`; CSS
  `.people-role-badge.admin/.member` ~`:2139`): org admin → **Manager**, org
  member → **Member**.
- **Account-owner badge** "Owner" (`renderAccountInfo` ~`:3955`) → **Admin**.
- **Toasts** (`orgPromote` ~`:9823`, `orgDemote` ~`:9836`): "Promoted X to
  Manager." / "Demoted X to Member."
- **Roles legend** (~`:3234–3268`): replace the Owner/Admin/Member copy with the
  ladder explainer above.
- Section hints / headers that say "admin(s)".

### F2 — People = one roster, visible to everyone

- **Relax the view gate.** `renderActiveMembers` (~`:9279`) currently returns
  empty unless `source.is_admin`. Render for **any** org member; gate the
  *controls*, not the *view*.
- **Merge in the Admins.** Resolve the funding account client-side: find the
  account in `cachedAccounts` whose `organization_ids` includes this `org_id`;
  add its owners to the roster badged **Admin**. One row per email — someone who
  is both shows **two** badges (e.g. `Admin` + `Manager`). Sort Admin → Manager
  → Member.
- **Per-viewer controls** (compute once):
  - `callerCanManageTeam` = caller is org admin **or** Admin of the funding
    account.
  - `callerIsAccountAdmin` = caller is owner of the funding account.

  | Row is… | Control | Shown to |
  |---|---|---|
  | Member | Promote to Manager · Remove | `callerCanManageTeam` |
  | Manager | Demote to Member · Remove | `callerCanManageTeam` (not self if last Manager) |
  | any team row | Make Admin | `callerIsAccountAdmin` |
  | Admin | Remove Admin | `callerIsAccountAdmin` (not self if last Admin) |

  - **Add member** form: `callerCanManageTeam` only (this tightens today's
    behavior — adding is no longer open to plain members).
  - **Add admin** form: `callerIsAccountAdmin` only — calls `add_account_owner`
    with the funding account's `account_id` (reuses `onAddAccountOwnerSubmit`
    logic, now living in People). Remove Admin → `remove_account_owner`.

### F3 — Retire Account access from the everyday sidebar

- Remove the **Account access** nav item (`data-view="access"`) from
  `_includes/account-sidebar.html` (Billing group).
- **Fallback for the no-org Admin:** keep the `#view=access` route/code; render
  the sidebar link only when `cachedOrganizations.length === 0` (an Admin on no
  team still needs somewhere to manage Admins). Everyone else manages Admins in
  People.

### F4 — Gate the Billing area to Admins

- In `account-sidebar.html`, hide the whole **Billing** group (Licenses &
  credits, Purchase / Renew, Purchase history) for non-Admins; today only the
  CTAs are owner-gated (`applyOwnerGatedCtas` ~`:3882`). Extend that gating to
  the nav group + the views themselves.
- **Decision:** the entire account **Billing** group is Admin-only. A separate
  **org-scoped "Licenses & credits"** page (under Organization, visible to
  everyone) will be built **as its own follow-up** — out of scope here. So we
  gate the account Billing group fully now; Members see entitlements on that
  future org page, not the account billing area.

### F5 — Guards (reuse what exists)

- Org last-Manager: existing `canDemote` / `isOnlyAdmin` (~`:9287`, `:9736`).
- Account last-Admin: existing `canRemove` / `isLastOwner` + backend 409
  (~`:3945`, `:3111`).

---

## Rollout order

1. Backend **B1** ships (the management calls would 403 without it).
2. Frontend F1–F5 (F1 relabel + F4 gating + the read-only roster can land
   first; the Admin-side management controls light up once B1 is live).

## Implementation status (frontend)

- **F1 Relabel — done.** Badges, toasts, button titles, last-Manager alert,
  "You are a Manager/Member" header, add-member hint, and the roles legend now
  read Admin / Manager / Member (`account.html`).
- **F2 People roster — done.** `renderActiveMembers` now renders for **all**
  org members; merges the funding account's Admins into one roster (two badges
  when someone is both); per-viewer controls (Managers run their team; account
  Admins get Make/Remove Admin + an Add-Admin card). New helpers
  `resolveFundingAccount`, `peopleMakeAdmin`, `peopleRemoveAdmin`,
  `peopleAddAdmin`, `refreshPeopleAfterAdminChange`.
  - **Flag:** `ACCOUNT_ADMIN_CAN_MANAGE_TEAM = false` near `renderActiveMembers`.
    Flip to `true` once backend **B1** ships so an Admin who isn't also a Manager
    gets the team controls (until then they'd 403). Make/Remove Admin already
    work (account-owner endpoints), so they're not behind the flag.
  - **Assumption to confirm:** the dashboard returns the funding `account`
    (with its `members` map) to plain team members, so they can see the Admins.
    Backend access rule says yes (member of a funded org → account access); if a
    member ever sees no Admins, that's the gap to check.
- **F3 Account access retired — done.** Sidebar item
  (`#sidebarAccountAccessItem`) hidden; shown only when the user has **zero
  orgs** (fallback for a no-team Admin). Route/view kept.
- **F4 Billing group gated — done.** Sidebar Billing group shows only to
  account Admins (`account-area.html` `showAccountGroup(isAccountAdmin)` +
  `eeIsAccountAdmin` pre-paint hint in `head.html`/`navbar-main.html`).

- **F5 Default landing for non-Admins — done.** `applyHashToState`
  (`account.html`) now redirects a non-Admin away from any account-scope
  (Billing) view to their team's **People** view via `redirectNonAdminToOrg()`
  (`viewerIsAccountAdmin()` + `pickDefaultOrgId()`). Admins still land on the
  Billing overview. A non-Admin with **no** org falls through to overview
  (rare; resolves once the org-scoped Licenses & credits page exists).

### Page architecture (reference)
`/account/` is a **single page** (`account.html`). "Organization" and "Billing"
are **not** separate HTML pages — they're *views* within it, switched by the URL
hash (`#view=…&org=…`): `applyHashToState()` sets `activeScope`
(`account`|`org`) + `activeView`, then `renderActiveView()` shows the one
matching `<section>` and hides the rest. The only genuinely separate pages are
`/account/purchase/`, `/account/billing/` (purchase history), and
profile/downloads/support. So "hiding Billing" = the sidebar group is hidden
(F4) **and** non-Admins are routed to an org view (F5); no page split needed.

## Verification

- **Visibility:** a Member opens People, sees the full roster (Members,
  Managers, Admins badged), no edit buttons; cannot see the Billing group.
- **Manager:** can add/remove Members and promote/demote Managers in their team;
  cannot Make Admin; cannot see Billing.
- **Admin (multi-org account):** can manage **every** funded team's People and
  assign Managers/Admins; can purchase; Account access is gone from the sidebar.
- **Guards:** last Manager can't self-demote; last Admin can't be removed.
- **No-org Admin:** still reaches Admin management via the conditional Account
  access fallback.
- Inline-script syntax check (`node -e` over the `<script>` block) → 0 errors;
  `bundle exec jekyll build` → OK.
