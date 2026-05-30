# Backend changes: loginless training checkout + CAD pricing

Instructions for the **`eagle_eyes_firebase_functions`** repo, to support the new
website page `/training/flightreview/`:

- **training_id:** `6`
- **Stripe product:** `prod_Uc9cNrGIMVEulS`
- **Price:** **$250 CAD per person**

Two backend changes are needed:

1. Allow checkout **without** requiring the user to be logged in.
2. Let a training charge in **CAD** (the price lookup is currently hardcoded to USD).

All references below are to
`functions/licensing/firestore_helpers/stripe_request_handlers.py`, function
`create_training_checkout` (starts ~line 206), unless stated otherwise.

---

## How the endpoint works today

1. **Requires Firebase auth**, returns 401 if no valid token (lines ~215–224):
   ```python
   try:
       user_info = get_user_authenticated_user_info_from_request(req)
   except UserAuthenticationError:
       return https_fn.Response(json.dumps({"error": "auth_required"}), status=401, headers=headers)
   user_email = user_info.get('email', '')
   user_uid = user_info.get('uid', '')
   ```
2. Reads `training_id`, `qty`, `cancel_path` from the JSON body.
3. Looks up the training via Airtable (`get_training_by_id`,
   `airtable_utils.py:184`), requires `status == "Open"`.
4. Counts paid seats (`get_training_seats_sold`,
   `firestore_db_functions.py:4013`) and rejects with 409 if sold out.
5. Looks up the Stripe price — **hardcoded to USD** (line ~276):
   ```python
   prices = stripe.Price.list(product=training["product_id"], active=True, currency='usd', limit=1)
   ```
6. Creates the Checkout Session (custom fields: attendee names, contact phone,
   comments) and returns `{ "url": session.url }`.

### Why these changes are safe

- **uid/email are only written to Stripe `metadata`** (lines ~311–312). They are
  NOT used for pricing, eligibility, or seat counting.
- **Seat counting** (`get_training_seats_sold`) only matches `training_id` in
  Stripe session metadata and sums `qty` — independent of uid/email and currency.
- **The webhook** (`stripe_webhook` → training branch, lines ~1030–1048) reads
  only `category, training_id, product_id, training_name, training_date, qty`
  plus the custom fields — not uid/email.
- **Email is still collected**: the session never sets `customer_email`, so Stripe
  Checkout shows its own email field and sends the receipt. Attendee name(s) and
  phone are already captured via custom fields. No customer data is lost by
  removing login.

---

## Change 1 — Make authentication optional

Replace the hard 401 with a best-effort decode that proceeds anonymously when no
(or an invalid) token is present.

**Current (lines ~215–224):**
```python
# Require Firebase Auth — return 401 explicitly
try:
    user_info = get_user_authenticated_user_info_from_request(req)
except UserAuthenticationError:
    return https_fn.Response(
        json.dumps({"error": "auth_required"}),
        status=401, headers=headers,
    )
user_email = user_info.get('email', '')
user_uid = user_info.get('uid', '')
```

**Proposed:**
```python
# Authentication is OPTIONAL for training checkout.
# If a valid Firebase token is present we record uid/email in metadata for
# convenience, but anonymous purchases are allowed — Stripe Checkout collects the
# buyer's email itself, and seat counting does not depend on uid/email.
user_email = ''
user_uid = ''
try:
    user_info = get_user_authenticated_user_info_from_request(req)
    user_email = user_info.get('email', '') or ''
    user_uid = user_info.get('uid', '') or ''
except Exception:
    # No header, malformed header, or invalid/expired token → proceed anonymously.
    pass
```

Notes:
- `get_user_authenticated_user_info_from_request` (`request_handlers.py:300`)
  raises `UserAuthenticationError` when the `Authorization` header is missing, and
  may raise other exceptions from `auth.verify_id_token(...)` (or an `IndexError`
  from `authorization.split('Bearer ')[1]`) for malformed tokens. The broad
  `except Exception` intentionally degrades any of these to anonymous rather than
  500-ing. Narrow it if you prefer.
- Everything downstream already tolerates empty `user_email`/`user_uid`.

**Frontend impact:** once shipped, the website can call
`/create_training_checkout` with no `Authorization` header and no Firebase
sign-in. (We'll drop the auth gate on the page so "Register & Pay" always shows.)

---

## Change 2 — Support CAD pricing

Product `prod_Uc9cNrGIMVEulS` is priced at **250 CAD**, but the code only queries
USD prices, so it would fail with `No active price found for product ...`.

Choose one. **Option A is recommended.**

### Option A (recommended): read currency from the training record

`_normalize_training` (`airtable_utils.py:197`) currently returns only
`training_id, product_id, name, date, max_seats, status` — it does **not** expose
a currency. So Option A is two edits:

1. **Add a `currency` column** to the trainings table in Airtable (e.g. `cad`,
   blank = usd), and surface it in `_normalize_training`:
   ```python
   return {
       "training_id": fields.get("training_id"),
       "product_id": fields.get("product_id"),
       "name": fields.get("name", ""),
       "date": fields.get("date", ""),
       "max_seats": fields.get("max_seats", 0),
       "status": fields.get("status", "Closed"),
       "currency": (fields.get("currency") or "usd").lower(),   # NEW
   }
   ```
2. **Use it** in `create_training_checkout` (replace the hardcoded line ~276):
   ```python
   training_currency = (training.get("currency") or "usd").lower()
   prices = stripe.Price.list(
       product=training["product_id"], active=True, currency=training_currency, limit=1
   )
   if not prices.data:
       raise ValueError(
           f"No active {training_currency.upper()} price found for product {training['product_id']}"
       )
   price_id = prices.data[0].id
   ```

Backwards compatible: existing USD trainings (1, 2, …) default to `usd`.

### Option B (minimal): don't filter by currency

If each product has exactly one active price, just drop the filter:
```python
prices = stripe.Price.list(product=training["product_id"], active=True, limit=1)
if not prices.data:
    raise ValueError(f"No active price found for product {training['product_id']}")
price_id = prices.data[0].id
```
Risk: non-deterministic if a product ever has multiple active prices (e.g. USD + CAD).

### Stripe setup (either option)

- Ensure `prod_Uc9cNrGIMVEulS` has **exactly one active CAD price of 250.00 CAD**
  in the correct mode (live vs test — see `STRIPE_IN_TEST_MODE`).

---

## Test checklist

1. **Signed-out browser:** open `/training/flightreview/`, click Register & Pay →
   reaches Stripe Checkout (no 401), shows **CAD 250.00**, prompts for email +
   custom fields.
2. **Signed-in:** still works; session metadata carries `uid`/`email`.
3. **Webhook:** complete a test payment → training branch runs, Charge gets merged
   metadata, Airtable sync / confirmation email behave as before.
4. **Seat limit:** `seats_remaining` still decrements; 409 sold-out still fires at
   `max_seats`.
5. **Regression:** Operator Day (ids 1/2, USD) still works.

---

## Summary

- `create_training_checkout` currently **hard-requires Firebase auth** and
  **hardcodes USD**. Both must change for the flight-review page.
- **Auth → optional:** wrap the auth call in try/except, default uid/email to
  empty, proceed anonymously. Nothing downstream depends on uid/email; Stripe
  still collects the buyer's email.
- **CAD:** prefer a `currency` field on the training record (Option A; needs the
  Airtable column + `_normalize_training` update + the price-lookup change);
  otherwise drop the currency filter (Option B). Ensure the product has one active
  250 CAD price.
- No changes needed to the webhook or seat-counting logic.
