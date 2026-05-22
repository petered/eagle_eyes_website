# Frontend Plan — Cart-style purchase page

**Target page**: `/account/purchase/` (purchase.html)
**Status**: draft — paired with the backend's `BACKEND_PURCHASE_CART_PLAN.md`. Frontend builds against stubs first, swaps to real endpoints when backend ships.

## Context

`/account/purchase/` currently uses a **mode picker** — four mutually-exclusive `purchaseMode` radios: `new` / `renew` / `add_devices` / `streaming`. Users land on this page from many entry points (account.html license cards, the credits widget, the trial-expired email, pricing.html) and the radio shape forces them to pick **one** intent per visit. Real journeys are often combinations: "renew **and** add credits", "extend devices **and** buy a Pro Bundle", "buy a new license **and** start an annual streaming subscription". Each requires the user to come back, pick a different mode, and pay separately. Three Stripe invoices when one would do.

We're switching the page to a **store / cart** model. Users add multiple items to a single order, edit them inline, and complete the whole thing with one of three pay methods. Deep-links from account.html and elsewhere pre-populate the cart instead of pre-selecting a mode. **The cart is the page**; the radio-button mode picker goes away.

The backend has locked a contract: three new endpoints — `create_purchase_checkout`, `create_purchase_invoice`, `create_purchase_quote` — all take the same `{ account_id, items[], invoice_details? }` payload and return a single Stripe object. A `pending_carts/{cart_id}` Firestore doc carries the cart contents; webhook dispatch fulfills items idempotently. Legacy endpoints stay alive during the cutover, so the current radio-button UI keeps working until we flip. Frontend builds against stubs first, swaps to real endpoints when backend ships.

## Catalog model — 3 high-level options

The "Add more to your order" panel is **kept deliberately simple**: three high-level options, each opens an inline picker to configure the specific item, then "Add" commits it to the cart. A fourth option appears only when there are zero active licenses on the account.

| Catalog option            | Picker                                                            | Maps to SKU                  |
|---------------------------|-------------------------------------------------------------------|------------------------------|
| **+ Renew a license**     | License dropdown (active, owner-of, ≤90d to expiry — same gate as today's Renew button) + editable device count (defaults to current `total_keys`, can be raised) | `license_renewal`            |
| **+ Add device slots to a license** | License dropdown (active, owner-of, `total_keys < 12`) + count stepper (1–10, capped at `12 − total_keys`) | `additional_devices`         |
| **+ Add streaming credits** | Sub-picker for PAYG ($ amount) / Pro Bundle | `streaming_topup_payg` / `streaming_topup_pro_bundle` |
| **+ Buy a new license** (only when account has zero active licenses) | Device count stepper (1–12) | `license_new` |

> **Annual Unlimited is out of scope for v1.** We're launching the cart with PAYG + Pro Bundle only. The `unlimited_*` SKUs and the `?add=unlimited` deep-link can be re-added later (backend can defer that path; legacy `subscribe_to_unlimited` endpoint stays alive for the few existing subscribers).

**Once an option is in the cart, that catalog row is hidden** — the user can't add two of the same kind in one cart. Removing the cart item brings the catalog row back. This keeps the page legible and matches the "one of each per order" mental model. Multiple-renewals or multi-license cases are an explicit *non-goal for v1* (they're rare today; come back and run a second cart, or we revisit later).

**One more catalog rule from the backend contract**: a single license cannot appear in **both** a `license_renewal` and an `additional_devices` item in the same cart (backend will 409 with `renewal_and_devices_same_license`). The catalog enforces this client-side: if license X is in a renewal item, the "Add device slots" picker filters X out of its license dropdown (and vice versa). User can raise device count on the renewal item itself via the editable `new_n_tokens` field.

`license_renewal.new_n_tokens` lets a renewal **also** raise device count in the same item (e.g. renew a 3-device license as a 5-device license), so users who want both don't need two cart slots. The renewal picker / cart card surfaces this as a "Devices" field — defaults to current count, can only be raised.

For the new-license edge case where an existing-license account *does* want a separate fresh license alongside other items: this is uncommon, and v1 doesn't handle it. The page just doesn't show "Buy a new license" when there are active licenses. We can add a small "Need a separate new license?" link later if usage shows demand.

## URL deep-link scheme

`?add=` is **stackable**. URLSearchParams.getAll('add') reads all values; each parses to one item shape and pushes to the cart (deduped by sku + key fields):

| URL fragment                       | Adds to cart                                  |
|------------------------------------|-----------------------------------------------|
| `?add=renew:lic_abc`               | `license_renewal` for `lic_abc`               |
| `?add=devices:lic_abc:3`           | `additional_devices` (+3) on `lic_abc`        |
| `?add=credits:payg:50`             | `streaming_topup_payg` $50                    |
| `?add=credits:pro_bundle`          | `streaming_topup_pro_bundle`                  |
| `?add=new:sar_1y_3dev`             | `license_new` with that catalog product       |
| `?add=renew:lic_abc&add=credits:payg:50` | stacks both into the cart together     |

**Backward compat**: legacy params (`?mode=`, `?license_id=`, `?device_count=`, `?package=`) get translated into `?add=` items at page load, so existing email CTAs and bookmarks keep working without coordinated cutover. Both schemes can coexist on the same URL.

### Partial-license-id hints (e.g. from low-credit email links)

Some inbound links carry only the first 5 characters of a license id as a hint — the low-balance email's "top up credits" link is the canonical example. The URL shape:

```
https://eagleeyessearch.com/account/purchase/?mode=streaming&license_hint=<5-char prefix>
```

(e.g. `?mode=streaming&license_hint=MVSC4` — the value is illustrative; what matters is the **format**: `mode=streaming` + `license_hint=<5 chars>`.)

The email is sent when an account's credit balance drops, but at email-send time we may not know which Google account the recipient will use to sign in — so the link must work generically and resolve once the user signs in.

**Resolution flow** (frontend, runs after Firebase auth + dashboard load):

1. Parse `license_hint` from URL.
2. Scan `license_overview[]` from `get_account_dashboard` for licenses whose `license_id` startsWith the hint.
3. Cross-reference each match to its parent account, and that account's `is_owner` flag for the current user.
4. **Four outcomes**:
   - **Exactly one match, current user is owner of that account** → switch the page's active-account to that account, pre-add the cart item (e.g. `streaming_topup_payg` from `?mode=streaming`), and show a banner: *"Pre-filled from your low-balance email — credits will be added to MVSC4… on the SAR Alberta account."*
   - **One or more matches, but user has access via membership only (not owner)** → switch to that account but show the existing non-owner "contact an owner" panel, naming the license so the user knows which one the email referred to. *"This top-up needs an account owner. Owners of SAR Alberta: jane@…, bob@…"*
   - **Multiple matches across different accounts the user owns** (rare; only if 5-char prefix collides) → show a picker: *"Two of your licenses start with MVSC4 — pick one to top up."*
   - **No match** → generic message: *"This top-up link references a license we don't see on your accounts. The email was sent to the account that owns it — sign out and sign in with that email, or contact info@eagleeyessearch.com."* Do not confirm whether the hint references a real license that the user simply lacks access to (no existence leak).
5. The user remains free to ignore the hint and use the cart normally — the banner is dismissable.

`?mode=streaming` and `?license_hint=MVSC4` both go through the existing backward-compat translator: `mode=streaming` becomes an `add=credits:payg` item by default (user picks the specific package in the picker), and `license_hint` runs through the resolver above.

## Files modified

**purchase.html** — full rewrite of `<body>` markup + the inline JS module. Same path. Replaces:
- The four `mode-row` blocks (lines 644–781) and their state machine
- The payment-method radio group (lines 789–855) — now three discrete CTA buttons at the bottom
- The single-mode summary computation (`recomputeSummary`, lines 1440–1494) — now sums over cart items via `preview_cart`
- The four mode-specific submit branches (`onCard` / `onInvoice` / `onQuote`) — now one branch per CTA, posting the full cart payload

Kept and reused: dashboard/auth loading (`loadDashboard` at line 1973, `readActiveAccountId` at line 1942, `applyOwnerVisibility` at line 2047), price math helpers for client-side estimation (`priceForNew`, `priceForAddDevices`, `streamingPricing`, `remainingMonthsFor`, `formatPrice`), the streaming-credits balance loader (`loadCredits`), the billing-address-required 409 modal (already used by `request_invoice_for_self`).

**account.html** — update three deep-links and remove the 12-device mailto fallback:
- Line ~4440 (license card "Renew for 1 year"): `/account/purchase/?add=renew:<id>` (was `?mode=renew&license_id=<id>`)
- Lines ~4463–4483 (license card "+ Add devices"): `/account/purchase/?add=devices:<id>` for **all** cases — drop the `addUrl = 'mailto:info@...'` branch for >12-device licenses. Backend validates the cap; the cart shows an inline "this license is at the device cap" error if needed.
- Line ~2669 + 2674 (streaming credits widget + empty state): `/account/purchase/?add=credits:payg` (was `?mode=streaming`)
- Line ~2692 (plans empty / "Buy one →"): `/account/purchase/` (unchanged — no items to preload for a brand-new user)

## Cart state

`localStorage` keyed by **`ee-cart:<account_id>`**. Persists across refresh, navigation, back-button. Cleared **after** a successful checkout submission (when we have a confirmed `checkout_url` / `hosted_url` back from the endpoint — not optimistically).

Shape:
```js
{
  account_id: 12345,
  items: [
    { id: 'uuid', sku: 'license_renewal', license_id: 'lic_abc', duration_days: 365, new_n_tokens: 5 },
    { id: 'uuid', sku: 'streaming_topup_pro_bundle' }
  ]
}
```

Account-scope switcher (existing `accountScopeChanged` listener) swaps which cart is shown — one cart per account, matching how checkout is account-scoped today.

## Page layout

```
┌──────────────────────────────────────────────────────────┐
│ Your order  (2 items)                                    │
│ ─────────────────────────────────────────────            │
│  ▢ Renew "Peter's License"  (5 devices, 1 year)  $850   │
│      Devices: [ 5 ▾ ]  (was 3, +2 to add)          [×]  │
│  ▢ Pro Bundle  ($500 → $600 credits)             $500   │
│                                                    [×]  │
│  ─────────────────────                                   │
│  Subtotal: $1,350   Final price + tax computed at checkout │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Add more to your order                                   │
│ ─────────────────────────────────────────────            │
│   [ + Add device slots to a license ]                    │
│   [ + Renew a license ]                                  │
│                                                          │
│ (Pro Bundle already in your cart — remove it to add a    │
│  different credits option.)                              │
└──────────────────────────────────────────────────────────┘
```

Clicking one of those buttons expands it inline into a picker:

```
┌──────────────────────────────────────────────────────────┐
│ + Add device slots to a license                          │
│ ─────────────────────────────────────────────            │
│   License: [ Peter's License (5 dev, exp. 2026-08) ▾ ]   │
│   Add devices: [ − ] [ 1 ] [ + ]   (max 7 available)     │
│   $20 / month / device, prorated to expiry  =  $140      │
│                                                          │
│           [ Cancel ]      [ Add to order ]               │
└──────────────────────────────────────────────────────────┘
```

For "Add streaming credits" the picker asks **which package** (PAYG / Pro Bundle), then shows the corresponding sub-fields (PAYG amount input, or just confirm for Pro Bundle). For "Renew a license", picker has the license dropdown + editable device count. For "Buy a new license" (zero-license accounts only), picker has the device-count stepper.

Bottom of the page:

```
┌──────────────────────────────────────────────────────────┐
│ Complete your order                                      │
│  [ Pay now ]     [ Email invoice ]     [ Request quote ] │
│                                                          │
│  (for invoice / quote)                                   │
│  Company:    [______________]                            │
│  PO Number:  [______________]   Reference: [__________]  │
│  VAT ID:     [______________]   (optional)               │
└──────────────────────────────────────────────────────────┘
```

Catalog rule: **once a SKU category is in the cart, its catalog button is hidden** (replaced with a short "already in your cart — remove to change" line). Remove the cart item → the catalog button returns.

When the cart is empty, the catalog buttons are the primary visual of the page. When the cart has items, the cart sits on top with the (shrunken) catalog beneath it.

## Validation (client-side; backend re-validates in `build_cart` / `preview_cart`)

- PAYG amount ≥ $25 — block "Add" + show inline error.
- Renewal `new_n_tokens` ≥ current `total_keys` — UI only allows raising, never lowering.
- Devices: `current_total_keys + additional_devices ≤ 12`. License at cap → disable "+ Add devices" with tooltip "License at device cap — contact info@eagleeyessearch.com to go higher."
- A license cannot appear in both `license_renewal` and `additional_devices` in the same cart (use the renewal's `new_n_tokens` to raise devices).
- Cart can't be empty when clicking a CTA — buttons disabled.
- Non-owner of active account: cart + catalog hidden, fall through to existing `applyOwnerVisibility` non-owner panel (unchanged).

## Checkout flow

1. User clicks one of the three CTAs (Pay now / Email invoice / Request quote).
2. For Invoice / Quote: check `account.address` on the active account. If missing, open the existing address-capture modal (reuse the modal already wired for the `billing_address_required` 409 case). On save, capture, then continue.
3. Read `invoice_details` from the form (Company, VAT ID, PO Number, Reference). Empty fields are stripped.
4. POST to the matching endpoint:
   - Pay now → `POST /create_purchase_checkout` → redirect to `checkout_url`.
   - Email invoice → `POST /create_purchase_invoice` → open `hosted_invoice_url` in a new tab + show "Invoice sent to your email" confirmation.
   - Request quote → `POST /create_purchase_quote` → open `hosted_quote_url` + same confirmation pattern.
5. On success: clear the cart for this account.
6. On failure: inline error in the checkout panel. Cart preserved so the user can adjust and retry. 501 (quotes not enabled) falls back to the existing `openMailto` quote-request path.

### Submit dedupe (frontend side)

Backend will hash `(account_id, items, intent)` and short-circuit duplicate submissions within a 60s window (returns the existing pending-cart record + Stripe URL instead of creating a duplicate). On the frontend side: standard "disable CTA + show spinner while in flight" is enough. No need for client-side dedupe keys.

## Stub-first development

Backend hasn't shipped the three endpoints yet. Until they do:
- Three CTA handlers point at mock functions that **validate the payload against the locked contract shape** (so we catch contract drift while building) and return placeholder URLs (`about:blank` or a dev test page) + log the payload.

**In-place rewrite of purchase.html.** No `/v2/` path. The new cart UI lives at the existing `/account/purchase/` from the first commit. Backward-compat URL translation (`?mode=` → `?add=`) means inbound links from account.html, pricing.html, and outbound emails keep landing on the right thing while we build. The legacy radio-button code is removed in the same change — we don't ship two UIs in parallel.

## Files / utilities to reuse

- `loadDashboard(user)` — purchase.html:1973 — fetches `get_account_dashboard`. Use as-is.
- `loadStreamingPackages(user)` — streaming package config overrides.
- `loadCredits(user)` — current balance + per-minute rate; informational on the catalog credits section.
- `readActiveAccountId(uid)` — purchase.html:1942 — sessionStorage active-account key.
- `applyOwnerVisibility()` — purchase.html:2047 — gates the page for non-owners.
- `priceForNew(n)` / `priceForAddDevices(lic, n)` / `streamingPricing` / `remainingMonthsFor(lic)` / `formatPrice` — pricing math (purchase.html ~1380–1530). Reused for the in-page cart-item descriptions; **authoritative totals come from `preview_cart`**.
- Billing-address-required modal — already exists for the `request_invoice_for_self` 409 path. Reused proactively for invoice / quote CTAs.
- `openMailto(subject, lines)` — preserved for the 501-quote fallback.
- account.html license-card rendering (~4380–4500) + `getLicenseOwnership` — keep using; only the URLs in renderActions change.
- The `accountScopeChanged` custom event the account scope switcher emits — listen on the cart page to re-render when the user switches active account.

---

## Backend endpoints required

What the frontend needs from the backend to ship this cart. Cross-references the backend's locked plan; repeated here in one place so both sides can review the integration surface in one document.

### Three new endpoints

| Endpoint                          | Returns                                                       |
|-----------------------------------|---------------------------------------------------------------|
| `POST /create_purchase_checkout`  | `{ checkout_url, session_id, cart_summary }`                  |
| `POST /create_purchase_invoice`   | `{ invoice_id, hosted_invoice_url, invoice_pdf, cart_summary }` |
| `POST /create_purchase_quote`     | `{ quote_id, hosted_quote_url, quote_pdf, cart_summary }`     |

All three accept the same body shape. Invoice and Quote also accept an `invoice_details` object.

### Request body

```jsonc
{
  "account_id": 12345,
  "items": [
    { "sku": "license_renewal",            "license_id": "lic_abc", "duration_days": 365, "new_n_tokens": 5 },
    { "sku": "additional_devices",         "license_id": "lic_xyz", "additional_devices": 3 },
    { "sku": "streaming_topup_payg",       "amount_usd": 50.00 },
    { "sku": "streaming_topup_pro_bundle" },
    { "sku": "license_new",                "product_id": "sar_1y_3dev" }
  ],
  "invoice_details": {                     // invoice / quote only
    "company":   "Acme SAR",
    "vat_id":    "GB123456789",
    "po_number": "PO-2026-042",
    "reference": "Project Alpha"
  },
  "is_emulator": false                     // top-level; required so dev/emulator runs don't hit prod Stripe
}
```

### Item shapes (frontend will only ever send these)

| `sku`                          | Fields                                                       | Notes                                                                 |
|--------------------------------|--------------------------------------------------------------|-----------------------------------------------------------------------|
| `license_renewal`              | `license_id`, `duration_days` (always 365 in v1), `new_n_tokens` (int) | `new_n_tokens` ≥ current `total_keys`. Frontend can also send equal to current count when not raising. |
| `additional_devices`           | `license_id`, `additional_devices` (int, ≥1)                 | Frontend enforces `current_total_keys + additional_devices ≤ 12`. Backend re-validates. |
| `streaming_topup_payg`         | `amount_usd` (number, ≥25)                                   |                                                                       |
| `streaming_topup_pro_bundle`   | —                                                            |                                                                       |
| `license_new`                  | `product_id` (catalog SKU from `get_product_catalog`, e.g. `sar_1y_3dev`) | v1 cart constraint: at most one `license_new` per cart.               |

> **`unlimited_subscription` deferred.** v1 ships PAYG + Pro Bundle only. The Unlimited SKU + its `unlimited_start` / `unlimited_extend` resolver, plus the `?add=unlimited` deep-link, are out of scope for the first cart launch. Existing subscribers continue via the legacy `subscribe_to_unlimited` endpoint, which stays alive.

In v1, the cart will only ever contain **at most one item per SKU category** (UI enforces this). Backend can still treat `items` as a general array.

### Validation errors (locked with backend)

Mirror the shape of the existing `billing_address_required` 409 so the frontend can handle them generically:

| Code                                  | When                                                        |
|---------------------------------------|-------------------------------------------------------------|
| `billing_address_required`            | Invoice or Quote called with no billing address on account (already exists, just reuse) |
| `payg_below_minimum`                  | PAYG amount < $25                                           |
| `license_device_cap_exceeded`         | `additional_devices` would push past the self-service device cap |
| `license_not_renewable_yet`           | Renewal requested >90d from expiry (>7d for trial)          |
| `license_not_owned`                   | Caller is not an owner of the referenced license            |
| `renewal_and_devices_same_license`    | Cart contains both `license_renewal` and `additional_devices` for the same `license_id` (raise device count via the renewal's `new_n_tokens` instead) |
| `license_already_has_renewal_queued`  | License has `successor_license_id` set (a renewal is already queued). Frontend hides the Renew button in this case; backend is defense-in-depth. |
| `unlimited_not_available_in_cart`     | Any `unlimited_*` SKU sent to a cart endpoint. v1 only — when Unlimited is re-enabled this code goes away. |
| `cart_empty`                          | `items` is empty                                            |

Frontend pre-validates every one of these before submit, but structured backend errors let us re-render the cart card with an inline message when state has shifted between cart-build and submit.

### `cart_summary` return field (locked shape)

Returned by all three submit endpoints + by `preview_cart`. Used by the cart for live subtotal and post-submit confirmation toast.

```jsonc
{
  "subtotal_usd": 1350.00,
  "tax_usd": null,             // Checkout: null OR positive (positive when billing address already on file at Session-create time); Invoice/Quote: concrete
  "total_usd": 1350.00,        // == subtotal when tax_usd is null, else subtotal + tax_usd
  "line_items": [
    { "description": "Renewal of Peter's License (5 devices, 1 year)",
      "amount_usd": 850.00,
      "sku": "license_renewal",
      "external_id": "cart:{cart_id}:item:0" },
    { "description": "Streaming Pro Bundle",
      "amount_usd": 500.00,
      "sku": "streaming_topup_pro_bundle",
      "external_id": "cart:{cart_id}:item:1" }
  ]
}
```

Frontend displays `tax_usd == null` as "Tax computed at checkout" in the order summary, and `tax_usd > 0` as a concrete tax line. Descriptions are backend-generated (frontend can't reconstruct license names from SKU alone for the Stripe-side output, though it builds its own descriptions for the in-page cart UI).

### `preview_cart` — required (not optional)

```
POST /preview_cart  →  { cart_summary }
```

Frontend calls this on every cart mutation (debounced ~250ms) and uses the returned `subtotal_usd` and `line_items[].amount_usd` for the displayed totals. **Reason it's required, not optional**: `additional_devices` is prorated to the license's remaining months. Frontend can approximate this client-side, but the authoritative number lives in backend `pricing.py`, and the proration math is subtle enough that any drift between frontend and backend totals erodes user trust at the moment of payment.

Validation also runs in `preview_cart` — so the cart UI surfaces `payg_below_minimum`, `license_device_cap_exceeded` etc. before the user clicks a CTA, with the same error codes the submit endpoints use.

### Partial-license-id resolver (frontend-only — no backend ask)

`?license_hint=<5 chars>` from the low-balance email is resolved entirely on the frontend using the existing `get_account_dashboard` response: scan `license_overview[]` for `license_id.startsWith(hint)`, cross-reference each match to its account's `is_owner` flag. Outcomes covered in the "Partial-license-id hints" section earlier. **No backend work needed for this**, unless backend wants to add a defensive `resolve_license_hint` endpoint to prevent the dashboard from revealing licenses the user has no relationship to — but the dashboard already only returns licenses the user has access to, so this is a non-issue today.

### What we'd like to keep using as-is

- `GET /get_account_dashboard` — already returns `accounts[].address`, `license_overview[]`, `accounts[].is_owner`, etc. No changes needed.
- `POST /set_billing_address` + `billing_address_required` 409 — reused as the proactive gate for Invoice / Quote CTAs (same modal as today).
- `GET /get_product_catalog` — used for `sar_1y_Ndev` product IDs when adding `license_new` to the cart.
- `POST /get_streaming_credits` — informational balance / per-minute display.
- Legacy endpoints (`renew_license`, `get_stripe_payment_link`, `top_up_streaming_credits`, `subscribe_to_unlimited`, `request_invoice_for_self`, `request_quote_for_self`) — stay alive during the cutover so the current radio-button purchase.html keeps working until we flip.

### Sequencing

1. **Now**: frontend builds the cart UI + stubs the three endpoints to validate payloads against the contract above and return placeholder URLs. Existing purchase.html stays live and unchanged.
2. **In parallel**: backend ships `create_purchase_checkout` / `_invoice` / `_quote` + `preview_cart` + the `pending_carts/{cart_id}` doc + webhook dispatcher.
3. **Cutover**: frontend swaps stubs for real endpoints, runs smoke tests, then updates account.html deep-links from `?mode=...` to `?add=...` and replaces purchase.html with the cart page.

---

## Backend answers (locked)

All open questions resolved with the backend. Decisions baked into the rest of this doc:

1. **PO Number / Reference on Pay Now** — collapsed "Add reference details (optional)" section appears on Pay Now as well as on Invoice / Quote. Backend stamps the values on the Checkout Session `metadata` **and** on `invoice_creation.invoice_data.metadata`, so they appear on the auto-generated Stripe invoice / receipt. We are **not** using Stripe Checkout `custom_fields` (those are user-fillable on the hosted page — the cart form is the data source).

2. **`cart_summary_hint` / `cart_pricing_changed`** — deferred to v2. Dropped from v1 error codes. Pricing changes ship via PR + deploy, so the stale-cart window is small.

3. **Duplicate short-circuit** — backend persists `checkout_url` / `hosted_invoice_url` / `hosted_quote_url` on `pending_carts/{cart_id}` at create-time. Dedupe lookup re-reads the doc and echoes the **same** `{ checkout_url|hosted_*, session_id|invoice_id|quote_id, cart_summary }` shape without re-creating the Stripe object. Verification step (rapid double-click → single Checkout) stands as written.

4. **Description templates** — backend's call. Per-SKU description builders live in `cart.py` and take cart item + license context (name, expiry date, etc.). No `description_template` field in `pricing.py`. Frontend continues to build its own UI-side descriptions for the in-page cart; backend-emitted descriptions go to Stripe.

5. **Already-queued renewal** — backend adds new error code `license_already_has_renewal_queued` (separate from `license_not_renewable_yet` — different cause, different remediation; user might want to cancel the queued one first). Frontend keeps the existing client-side gate (hides Renew button on account.html:4427 when `successor_license_id` is set); backend code is defense-in-depth.

6. **Annual Unlimited not in v1** — locked. Backend cart endpoints reject any `unlimited_*` SKU with `unlimited_not_available_in_cart`. Legacy `subscribe_to_unlimited` / `extend_unlimited_to_align` Checkout endpoints stay alive. Adding Unlimited later is a backend-only change.

### Pushbacks from backend (folded in below)

- **`tax_usd` is not always null on Checkout.** When the customer has a billing address on file at Session-create time, Stripe's `automatic_tax` computes `total_details.amount_tax` on the session object up front. Backend returns it when present, else `null`. Frontend's "Tax computed at checkout" copy is correct for the `null` case — just don't assert `null` in tests for Checkout; assert `null OR positive`.
- **Proration math gets a backend home.** `priceForAddDevices(lic, n)` + `remainingMonthsFor(lic)` are JS-only today in purchase.html. Backend is porting the proration logic into `cart.py` / `pricing.py` so `build_cart` / `preview_cart` are authoritative. Frontend client-side math becomes a debounce-window approximation only — `preview_cart` is source of truth.
- **`is_emulator` placement** — top-level of request body, confirmed correct.
- **Empty `invoice_details` fields** — frontend strips before submit; backend treats missing / `None` / empty string equivalently. No 400 for empty optional fields.
- **Partial-license-id resolver** — frontend-only, no backend ask. Confirmed no info-leak vector.
- **`license_renewal.new_n_tokens` always present**, even on a "pure renewal" at current device count. Frontend sends `new_n_tokens = current_total_keys` when not raising. One SKU shape, not two.
- **In-place rewrite of purchase.html** — backend has no concerns; legacy endpoints stay alive so cutover is risk-free on the backend side.

## Verification

1. Run the site locally (Jekyll). Confirm exact command with user.
2. Deep-link entries land items in the cart:
   - `?add=renew:<id>` — one renewal item.
   - `?add=renew:<id>&add=credits:payg:50` — two items.
   - `?add=devices:<id>:3` — extension item with quantity 3.
   - `?mode=renew&license_id=<id>` (legacy) — auto-translates to `add=renew:<id>`.
   - `?mode=streaming&license_hint=<5 chars>` — switches active account to the matching license's account, pre-adds a credits item, shows the resolution banner.
3. account.html links: click Renew, + Add devices, + Add credits — land in /account/purchase/ with the right item pre-added. For a >12-device license, Add devices still routes to the cart (cart shows inline `license_device_cap_exceeded` state).
4. Cart interactions: add, edit (change device count, PAYG amount), remove, persist across refresh, account-switcher swaps to other account's cart, cart clears after successful submit.
5. `preview_cart` round-trip on each cart change — subtotals match what the cart displays, `additional_devices` proration is authoritative (not approximated). For Checkout, the cart-summary `tax_usd` may be either `null` (no billing address on file at Session-create) or a positive number (address on file) — assert `null OR positive`, not strictly `null`.
6. Validation: PAYG <$25 blocked client-side AND backend returns `payg_below_minimum`; renewal device count can't shrink; devices > cap blocked; renewal + add-devices for the same license blocked at preview time with `renewal_and_devices_same_license`; renewal on a license with `successor_license_id` set returns `license_already_has_renewal_queued`.
7. Three CTAs each POST the right endpoint with the right payload (verify in network panel + the contract-validation log line from the stub).
8. Billing address gate: with no `account.address`, click "Email invoice" → modal opens → save → original request retries successfully.
9. Non-owner of active account: cart + catalog hidden, contact-owners panel shown (existing behavior).
10. Partial-license-id resolver: trigger all four outcomes (single owner match, membership-only match, multi-match disambiguation picker, no-match generic message).
11. Submit dedupe: rapid double-click on "Pay now" results in a single Stripe Checkout (backend returns the same `session_id` on the duplicate call).
12. Once backend ships: swap stubs for real endpoints, run a real Stripe test transaction end-to-end for each CTA. Confirm `pending_carts/{cart_id}` doc exists, webhook dispatches fulfillment idempotently, license / credits land in the account, replay of the same webhook event doesn't double-grant.

## Open items (UX-only, not backend-blocking)

- **Catalog layout**: 3 high-level catalog options with inline pickers (per the simplified design above). One-of-each-SKU per cart in v1.
- **Rollout**: in-place rewrite of purchase.html. No `/v2/` path. Backward-compat URL translation keeps inbound links working from commit one.
- **Empty-cart visuals**: when nothing is in the cart, the 3 catalog buttons are the primary visual. When the cart has items, the cart sits on top with the catalog (minus hidden rows) beneath it.
