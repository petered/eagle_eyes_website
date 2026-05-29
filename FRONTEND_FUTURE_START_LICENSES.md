# Gate activation on future-start (start_at) licenses

**Audience:** frontend team working on `eagle_eyes_website` (`activate.html`, `setup.html`).
**Goal:** when a license's start date is in the future, the website must let the user *see* it but *not activate* a device against it until that date.

> Status: implemented. This doc is the reference for *why* and *where*; see the
> `licenseStartMs` / `licenseIsPending` helpers in both files.

---

## 1. Background — what's happening

When a customer renews, the backend creates a successor license whose billable period starts in the future:

- `start_at` = the current license's expiry (a future timestamp)
- `expiry` = `start_at` + duration
- `parent_license_id` = the license it renews

We deliberately allow the renewal token to be created/fetched early so a device can have it ready at cutover. But a future-dated license is **not active yet**, and the website used to list it, let the user pick it, and try to activate against it. That's gated in the UI now.

This is a **UX gate, by design — not a security check**. It's the customer's own paid renewal, and `expiry` is an absolute timestamp, so activating early steals no time. So we keep it simple and handle it in the frontend. The backend intentionally stays permissive so token pre-fetch keeps working; **do not** ask for a backend block.

---

## 2. Where to read the start date

The backend already returns it — but under different names and types depending on the endpoint. This mismatch is the main thing to get right:

| Endpoint | When used | Field | Type | Location in response |
|---|---|---|---|---|
| `check_available_licenses_and_tokens?machine_id=…` | Activation flow (machine_id present) — the one that matters for activate/setup | `start_at` | float, Unix seconds, or `null` | `licenses_and_dispensed[license_id].start_at` — a sibling of `.license`, next to `n_tokens_dispensed` |
| `get_license_overview` | `setup.html` config context (no machine_id) | `start_at_iso` | `"YYYY-MM-DD"` string, or `null` | top-level on each `overview[]` row |

Lineage fields also available for a "Renewal of…" breadcrumb if wanted: `is_successor_of` / `parent_license_id`, and (overview only) `successor_license_id` + `successor_starts_at_iso`.

`null` start date = active immediately (current behavior, left alone).

---

## 3. The rule

A license is **pending** (not activatable yet) when its start date is non-null and in the future. One shared helper, defined in both pages so they agree:

```js
// Handles both endpoint shapes: float seconds (start_at) and ISO string (start_at_iso).
function licenseStartMs(lic) {
  if (lic.start_at != null)  return lic.start_at * 1000;        // Unix seconds → ms
  if (lic.start_at_iso)      return new Date(lic.start_at_iso).getTime();
  return null;                                                  // no start date
}
function licenseIsPending(lic) {
  const startMs = licenseStartMs(lic);
  return startMs != null && startMs > Date.now();
}
```

---

## 4. Changes in `activate.html`

1. **Read it.** In `loadUserLicenses()` (and the parallel `processLicenseResponse()`) where it walks `licenses_and_dispensed`, the sibling `start_at` is pulled onto the per-license object and `is_pending = licenseIsPending(...)` computed.
2. **Don't auto-pick it.** The `displayLicenses()` sort ranks pending licenses last so a not-yet-started renewal is never auto-selected as primary.
3. **Show but disable.** `renderPrimaryLicense` / `renderOtherLicenseRow` render the row (don't hide it), disable the Activate/Reactivate button, and show: *"Available from {date} — your current license covers you until then."*
4. **Guard the action.** `confirmActivation()` early-returns (skipping the `complete_activation` POST) with the same message if the selected license is pending. Defense in depth with the disabled button — covers stale UI / double tabs.

## 5. Changes in `setup.html`

Same pattern, two read paths:

1. **Read it in `lpLoadUserLicenses()`:**
   - machine_id path (`check_available_licenses_and_tokens`): sibling `start_at`.
   - no-machine_id path (`get_license_overview`): `start_at_iso`. The existing expiry filter (`new Date(o.expiry_date).getTime() >= nowMs`) is mirrored for the start date as **flag-to-disable, not drop** — we keep pending renewals visible.
2. **Show but disable** pending rows in the picker (`lpRenderPrimary` / `lpRenderOtherRow`), in both `select` and activation modes, with the same label.
3. **Guard the action** at the top of `lpConfirmActivation()` before its `complete_activation` call. The other `complete_activation` calls (config-save paths) are left alone — they only run after a license is already active, and the picker disable prevents a pending license from ever becoming `currentLicenseId`.

## 6. Label / date formatting

Reuse the existing expiry formatter: `new Date(ms).toLocaleDateString()`. Example label:
`Available from ${new Date(licenseStartMs(lic)).toLocaleDateString()}`.

---

## 7. Do / Don't

- ✅ Show pending renewals (disabled) — the customer should see the renewal is queued.
- ✅ Treat `null`/past start dates exactly as today.
- ❌ Don't hide pending licenses entirely.
- ❌ Don't block token creation or ask the backend to reject future licenses — pre-fetch depends on it. Only the website's device-activation action is gated.
- ❌ Don't rely on this as a security boundary; it's UX. (The desktop Scan app has its own separate renewal handling — different repo, not in scope here.)

---

## 8. QA checklist

1. Seed/renew a license so it has `start_at` in the future (e.g. `start_at = now + 30d`, `expiry = now + 395d`, `parent_license_id` set).
2. `activate.html`: enter a device activation code → the future license shows disabled with "Available from {date}", is not auto-selected as primary, and a forced click does not fire `complete_activation`.
3. `setup.html`: same via the picker — verify both the machine_id path and the `get_license_overview` path mark it pending.
4. A normal active license (`null`/past `start_at`) still activates exactly as before.
5. The renewal token can still be created/fetched for the future license (pre-fetch unaffected) — only website device-activation is gated.
