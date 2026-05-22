# Device Release — Backend Changes Requested

## Context

The frontend (`eagle_eyes_website`, `account.html` devices view) is implementing the user-facing device-release flow. The existing `release_device_token` endpoint already covers the core operation; this doc lists the additions needed to complete the UX, plus what we are deliberately *not* asking for.

See `device-token-rotation-spec.md` in the frontend repo for the full integration spec and UX context.

## What to build

### 1. Audit log: append-only release history

On every successful release, write one document capturing who released what when. Atomic with the existing `releases_used` increment.

**Location**: either `licenses/{license_id}/releases/{release_id}` (subcollection) or a top-level `releases/{release_id}` keyed by `license_id` — whichever matches existing conventions. Frontend doesn't care.

**Document shape**:
```
{
  release_id: <auto>,
  license_id: "LIC123",
  license_name: "1-Year SAR (3 devices)",     // snapshot at release time
  account_id: 50430539,
  token_id: "abc...",
  machine_id: "XXXXX",
  device_display_name: "Patrick's RC Plus",   // snapshot
  device_email: "patrick@example.com",        // who was using the slot
  released_by_uid: "<firebase uid>",
  released_by_email: "joep@eagleeyessearch.com",
  released_at: <server timestamp>
}
```

The snapshots (`license_name`, `device_display_name`, `device_email`) are intentional. If the license later expires or the device gets renamed/wiped, the audit row should still read correctly without joins.

**Why**: auth model is permissive (any team member can release any other team member's device — `_caller_can_write_device` in `device_endpoints.py`). Without an audit trail, "who released Patrick's drone last Tuesday?" is unanswerable. Forensic, not operational.

**Implementation notes**:
- Write inside the same transaction/batch as the `releases_used` increment so the audit row and the counter never diverge.
- Append-only. No edits, no deletes. Firestore rules can enforce.
- No backfill — start fresh from when this ships.

### 2. `GET /list_license_releases`

Read endpoint for the audit log.

**Two query forms** (implement both; frontend uses each in different places):
- `?license_id=LIC123` — releases on a specific license (used in the per-license foldout)
- `?account_id=50430539` — every release across every license funded by an account (used if we add an account-wide history view later)

**Response**:
```json
{
  "releases": [
    {
      "release_id": "...",
      "license_id": "LIC123",
      "license_name": "1-Year SAR (3 devices)",
      "machine_id": "XXXXX",
      "device_display_name": "Patrick's RC Plus",
      "device_email": "patrick@example.com",
      "released_by_email": "joep@eagleeyessearch.com",
      "released_at": 1716000000
    }
  ],
  "next_cursor": "..."
}
```

- **Auth**: same permissive model as `list_account_devices` / `release_device_token` — any team member of the account, members of funded orgs, or site admins.
- **Sort**: newest-first by `released_at`.
- **Paging**: cursor-based, default limit 50. Eagle Eyes Search (143 devices) will accumulate hundreds of entries over a license year; frontend will page lazily.
- **Timestamp shape**: match whatever `list_account_devices` uses for `first_activated_at` / `last_activated_at` (currently seconds-since-epoch). Stay consistent within the device-endpoints family.

**Why**: without a read endpoint the audit log is invisible. The frontend will surface this as a "Release history" expandable inside each license card on `/account/`.

### 3. `release_device_token` returns `keys_left` in the 200 body

Add the license's post-release `keys_left` to the existing success response:

```json
{
  "success": true,
  "token_id": "...",
  "license_id": "LIC123",
  "license_name": "1-Year SAR (3 devices)",
  "machine_id": "XXXXX",
  "email": "user@example.com",
  "releases_used": 1,
  "releases_budget": 6,
  "releases_remaining": 5,
  "keys_left": 1                              // NEW
}
```

Field name matches `license_overview.keys_left` (`firestore_db_functions.py`).

**Why**: the devices view shows "X / Y slots used" per license in the section header. Without `keys_left` in the response, every release forces a fresh `get_account_dashboard` call just to refresh that counter. Trivial add; saves a round-trip.

## Cleanup (nice to have, not blocking)

`compute_license_overview` in `firestore_db_functions.py` (~`:597–606` and `:723–749`) re-implements the release-budget formula twice. Now that `_compute_release_budget` exists in `device_endpoints.py`, those two call sites should import the canonical helper — or move the helper to `pricing.py` next to `LICENSING_POLICY`. Drift-risk only; already flagged in the integration spec's follow-up.

## What we are deliberately *not* asking for

- **No `/send_activation_link` endpoint.** After release, the next user activates from the app the same way they always have. No dashboard-driven email follow-up — keeps the page strictly about freeing the slot.
- **No `reason` field on `release_device_token`.** We considered capturing "moving / stolen / decommissioned" but the dropdown adds UI friction for marginal value. Audit log captures *who* and *when*; *why* stays out of band.
- **No undo / soft-delete.** Frontend uses an inline confirm panel before firing the request; that's the off-ramp.
- **No changes to `rename_device`.** Endpoint stays shipped, frontend hides the button. Revisit only if a customer asks.

## Verification

1. Release a token → audit doc exists with all snapshot fields populated; 200 body contains `keys_left` reflecting the new free-slot count.
2. `GET /list_license_releases?license_id=…` returns that row newest-first with `next_cursor: null`.
3. `GET /list_license_releases?account_id=…` returns the same row plus any others across the account's licenses.
4. Two concurrent releases by different callers → two distinct audit docs with correct per-caller `released_by_email`; `releases_used` increments by exactly 2.
5. Non-team-member calling either endpoint → 403.
6. Cursor paging is deterministic across repeated calls.
7. License with a `releases_budget_override` set: audit and counter still behave correctly; `keys_left` in the 200 reflects the override-aware budget.
