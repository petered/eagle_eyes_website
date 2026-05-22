# Device Token Rotation — Frontend Integration Spec

## Context

The frontend is wiring up a "Devices" management page where a user can release a device's activation so the license slot can be reused on a new device. Because auth is permissive (any team member can release any team member's device), the frontend also wants a per-license "Release history" feed so the team can answer *"who released Patrick's drone last Tuesday?"*. The backend already implements the release + budget half; this spec adds the audit-log half (A), a read endpoint for it (B), and a small response tweak so the slot count updates in place (C).

> See also: [[FRONTEND_DEVICES_INTEGRATION]] for the display-name fallback chain and existing rendering conventions.

## The flow, in plain English

1. **User opens "Devices" page** → frontend has `get_account_dashboard` in memory (contains `accounts[]`, `license_overview[]`) and fetches `list_account_devices?account_id=…`.
2. **User clicks "Release" on a token row** → frontend calls `release_device_token` with `{token_id}`. Backend:
   - Auth-checks the caller against the license's billing account.
   - Checks the license has release budget remaining; if not, returns a structured 409.
   - Deletes the `license_tokens/{token_id}` doc.
   - Increments `licenses/{id}.releases_used`.
   - Writes one audit doc to `releases/{auto_id}` with snapshot fields (license_name, device_display_name, device_email) so history reads correctly even if the license expires or the device is renamed later.
   - Writes a parallel entry to `user_logs` for staff/Airtable audit (unchanged).
   - Returns `releases_used / releases_budget / releases_remaining / keys_left`.
3. **User opens "Release history" foldout on a license card** → frontend calls `list_license_releases?license_id=…` (paged). Newest first.
4. **User activates a new device against the freed slot** → existing in-app flow (`request_token_from_license` → `complete_activation`). Unchanged.

## Where release-budget state lives

On the **license doc** (`licenses/{license_id}`):

- `releases_used` (int, default 0) — incremented on each successful release.
- `releases_budget_override` (int, optional) — admin escape hatch.
- Legacy: `swaps_used`, `swaps_budget_override` (still read for back-compat).

**Budget formula** (`device_endpoints._compute_release_budget`):

```
budget = releases_budget_override   if set
       = n_tokens × LICENSING_POLICY.releases_per_token   otherwise
remaining = max(0, budget - releases_used)
```

`LICENSING_POLICY.releases_per_token = 2` (`pricing.py:202`). Historical norm: two reinstalls per slot per license-year. Tuning is a policy decision, not a code change.

**Renewal resets the counter.** Each renewal creates a new `licenses/{id}` doc (`parent_license_id` points to old) starting at `releases_used = 0` (`pricing.py:200–201`).

**Frontend already has this data.** `get_account_dashboard.license_overview[*]` carries `releases_used / releases_budget / releases_remaining` per license (`firestore_db_functions.py:824–826`). Join on `device.tokens[i].license_id → license_overview[license_id]`. No extra fetch.

## Where release-history audit data lives

Two writes per release (dual-write):

1. **`user_logs/{auto_id}`** — staff/Airtable trail. Already happening via `log_user_activity(caller_email, "release_device_token", {...})`. Not exposed to customers.
2. **`releases/{auto_id}`** — **new**, customer-facing audit log. Schema:

```
releases/{release_id}
├─ release_id: <doc id>
├─ license_id: "LIC123"
├─ license_name: "1-Year SAR (3 devices)"    ← snapshot
├─ token_id: "abc..."
├─ machine_id: "XXXXX"
├─ device_display_name: "Patrick's RC Plus"  ← snapshot
├─ device_email: "patrick@example.com"        ← slot occupant at release time
├─ released_by_email: "joep@…"                ← caller
├─ released_by_uid: "<firebase uid>"
├─ released_at: <epoch seconds>               ← used as paging cursor
├─ released_at_iso: "2026-05-22T17:00:00Z"
└─ account_id: 50430539
```

Snapshots (license_name, device_display_name, device_email) are deliberate: if the license expires or the device is renamed/wiped later, history still reads correctly.

**Why a dedicated collection (not `user_logs`).** `user_logs` mixes ~15 unrelated event types into one giant collection. Surfacing slices of it to customers couples customer-visible UI to a staff-audit schema, and authorization-shape-wise it sets a bad precedent. The dedicated collection costs one extra Firestore write per (rare) release and gives us a clean schema, clean auth boundary, and a single composite-index query per page.

**Composite indexes** (firestore.indexes.json):
- `releases.(license_id ASC, released_at DESC)` — per-license history.
- `releases.(account_id ASC, released_at DESC)` — account-wide history.

## Backend endpoints — exact shapes

### `GET /list_account_devices?account_id=<int>`
Unchanged. Response carries devices + tokens; release-budget is read from `license_overview` (see above).

### `POST /release_device_token`
Body: `{ "token_id": "…" }` — always send `token_id`. `(license_id, machine_id)` is still accepted but ambiguous when a device carries tokens from multiple licenses or under different emails.

Success (200):
```json
{
  "success": true,
  "token_id": "…",
  "license_id": "LIC123",
  "license_name": "1-Year SAR (3 devices)",
  "machine_id": "XXXXX",
  "email": "patrick@example.com",
  "releases_used": 1,
  "releases_budget": 6,
  "releases_remaining": 5,
  "keys_left": 1,
  "release_id": "abc123..."
}
```
- `keys_left` = `n_tokens - active_tokens_remaining_on_license` (recomputed post-delete) — lets the "X/Y slots used" header update without re-fetching the dashboard.
- `release_id` = doc id of the just-written `releases/` entry. Frontend can use it to optimistically prepend to the history view.

Budget exhausted (409):
```json
{
  "success": false,
  "code": "no_release_budget_remaining",
  "message": "You've used all 6 of your device releases on this license. Contact support to request more, or get an additional device slot at your next renewal.",
  "releases_used": 6,
  "releases_budget": 6,
  "license_id": "LIC123",
  "license_name": "1-Year SAR (3 devices)"
}
```

Token already deleted (404): `{ "success": false, "message": "Token … not found" }`. Treat as a race — silently refetch.

### `GET /list_license_releases`
Query params (at least one of `license_id` / `account_id` required):
- `license_id=<str>` — per-license history.
- `account_id=<int>` — account-wide history.
- `limit=<int>` — default 50, max 200.
- `cursor=<float epoch>` — `released_at` of the last seen item; pass it back to get the next page.

Auth: same permissive model as `release_device_token`. When called with `license_id`, the endpoint resolves the license's `account_id` server-side and runs the standard `_caller_can_read_account` check.

Success (200):
```json
{
  "releases": [
    {
      "release_id": "abc123...",
      "license_id": "LIC123",
      "license_name": "1-Year SAR (3 devices)",
      "token_id": "…",
      "machine_id": "XXXXX",
      "device_display_name": "Patrick's RC Plus",
      "device_email": "patrick@example.com",
      "released_by_email": "joep@eagleeyessearch.com",
      "released_by_uid": "…",
      "released_at": 1747936800,
      "released_at_iso": "2026-05-22T17:00:00+00:00",
      "account_id": 50430539
    }
  ],
  "next_cursor": 1747850400
}
```
`next_cursor` is null when there are no more pages.

### `POST /rename_device`
Unchanged. Body: `{ "machine_id": "XXXXX", "name": "…" }` (`name: null` clears).

### Re-activation half (unchanged)
- `POST /request_token_from_license`
- `POST /complete_activation`

**Reinstall is free.** `complete_activation` returns existing `(license_id, email, machine_id)` tokens without creating a new one or bumping `releases_used` (`request_handlers.py:2613–2619`).

## Auth model

Permissive — per 2026-05-18 direction. Any team member of the account, any member of a funded org, or a site admin can call `list_account_devices`, `rename_device`, `release_device_token`, and `list_license_releases`. UX implication: confirm dialogs should explicitly name *who* (device email) and *what* (license name) before the click.

## What the frontend should know

1. **Budget is per-license.** Read `license_overview[token.license_id].releases_remaining` from the dashboard; no extra fetch.
2. **Always send `token_id` to `release_device_token`.**
3. **Preempt the 409.** Grey out Release when `releases_remaining === 0`; tooltip → contact support.
4. **404 on token → silent refetch.** Means another tab/user beat you to it; not an error.
5. **Reinstalls don't cost a release.** Confirm-dialog copy should distinguish.
6. **Optimistic update.** On success, use response `releases_used / releases_budget / releases_remaining / keys_left` to update license card in place; drop token row immediately; refetch `list_account_devices` after ~1s for trigger-recomputed device doc.
7. **Multi-token devices.** Release lives on the token row, never on the device row.
8. **Release stays visible even when slots are free** (legitimate revocation action).
9. **`account_id` ≠ `org_id`.** Source from `get_account_dashboard.accounts[*].account_id`.
10. **Release history.** Foldout under each license card. Empty state: "No releases yet on this license." Each row: `{released_at_iso · released_by_email released device_display_name (device_email)}`. Paged — render what comes back, no client-side filter. Optimistic prepend using the `release_id` returned in `release_device_token`'s 200.

## Frontend test matrix

| Scenario | Expected |
|---|---|
| Release succeeds (budget had room) | Token row disappears <1s; license `releases_remaining` decrements; `keys_left` updates header; new history entry appears in foldout. |
| Budget was 1 going in | Same + Release button on remaining tokens of that license greys out. |
| Budget already 0 | Button preemptively greyed; if forced, 409 with `code: "no_release_budget_remaining"` + contact-support CTA. |
| Multi-token device | Only the clicked token row disappears; device row stays. |
| Concurrent release by another tab | 404 → silent refetch. |
| Reinstall after release | Normal activation; no counter change. |
| Reinstall without release | Existing token returned by `complete_activation`; no counter change. |
| Release history empty | Empty state copy. |
| Release history paged | First page returns latest 50 with `next_cursor`; click "Load more" fetches with the cursor; UI appends. |
| License renewed → counter reset | History from the previous license still readable (snapshots intact); new license starts with empty history. |

## Verification

Smoke test (emulator or staging):
1. Release a token where budget > 0 → 200 with decremented `releases_remaining`, `keys_left` incremented, `release_id` present.
2. `GET /list_license_releases?license_id=…` → the new release appears as the first row with all snapshot fields.
3. Rename the device, release another token → second history row uses the new display name; first row still shows the old name (snapshot preserved).
4. Exhaust the budget; next release returns 409 with `license_id` + `license_name`.
5. Release a `token_id` that was already deleted → 404 "Token … not found".
6. Paging: write >50 release docs (script), then `GET /list_license_releases?license_id=…&limit=20` twice using `next_cursor`; assert no overlap, no gaps.
7. Account-wide: `GET /list_license_releases?account_id=…` returns entries across all licenses on the account, newest first.

## Follow-up (deferred)

Refactor `compute_license_overview` (firestore_db_functions.py:597–606 and :723–749) to call `_compute_release_budget`. Drift-risk only; no current bug.
