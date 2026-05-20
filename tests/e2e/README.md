# Playwright e2e tests

Lightweight smoke + structural tests against the Jekyll site. Goal is to catch markup regressions and wiring breakage between Jekyll builds, not to be a full UI test suite.

## Quick start

```bash
# One-time: install browser binaries (already done if you've run this repo's setup)
npx playwright install chromium

# Run all tests headlessly
npm run e2e

# Watch the browser as they run
npm run e2e:headed

# Interactive UI mode (best for debugging a failing test)
npm run e2e:ui

# Open the HTML report from the last run
npm run e2e:report
```

The config (`playwright.config.js`) auto-starts `bundle exec jekyll serve` on port 4000 and waits for it. If a Jekyll server is already running there, it reuses it (no port fight).

## What's covered

`tests/e2e/smoke.spec.js`:

- **Public pages** — home + pricing render their key elements.
- **Account-area signed-out shells** — `/account/`, `/account/billing/`, `/account/purchase/`, `/account/profile/` all render the right signed-out fallback. Sidebar is hidden via the pre-paint `ee-auth-hint` CSS rule when no signed-in localStorage hint exists.
- **Billing-address modal include** — its DOM is present and hidden on pages that include it; the country dropdown carries the spec's top-of-list (CA / US / GB / AU).
- **Purchase page structure** — reference-details panel renders the two seeded custom-field rows (PO Number + Reference), the Continue button is present, and the three payment-method radios are wired.

## What's intentionally NOT covered yet

Anything that requires Firebase auth. Tests here run as a logged-out visitor — they don't:

- Render the signed-in `/account/` dashboard, license cards, devices view, etc.
- Submit the billing-address modal (would create a real Stripe Customer)
- Submit a renew / invoice / quote (would create real Stripe artefacts)
- Test the per-uid `profileDraft` scoping

To cover those, the next step is wiring the Firebase Auth emulator (or a dedicated test account with a known credential) into the Playwright fixtures. Outline:

1. Add `firebase-tools` as a devDep + a `firebase emulators:exec` command in the test script.
2. Add a Playwright fixture that signs into the emulator with `signInWithEmailAndPassword` against a seeded test user.
3. Pass the resulting ID token to the backend stage so requests are authenticated.

Not blocking — most of the regressions I've seen on this repo have been markup / Liquid breakage that the current suite catches.

## Adding tests

One `*.spec.js` file per feature area. Existing patterns to follow:

- Use `page.locator(...)` (not `$$`).
- Assert with `expect(locator).toBeVisible()` etc. — Playwright auto-waits.
- For markup that's wired but hidden (modal includes, signed-in-only sections), check `toHaveCount(1)` + `toBeHidden()` rather than `toBeVisible()`.

## CI

`process.env.CI=true` flips the config into retry-twice + 2-workers mode and disables `--ui`. Plug into GitHub Actions when ready — Playwright's official action handles browser installation: `microsoft/playwright-github-action`.
