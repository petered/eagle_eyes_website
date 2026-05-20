// Smoke tests for the public + signed-out account-area surfaces.
//
// These run without any Firebase auth — they're meant to catch:
//   - markup regressions (selectors disappearing)
//   - the pre-paint hint flow (signed-out users not seeing the sidebar)
//   - obvious build / Liquid breakage
//
// Auth-required flows (the actual /account/ rendered content, billing
// address modal, purchase page submit paths) need a Firebase emulator
// or a test-account credential, which I haven't wired here yet. Add as
// a follow-on suite once the test-account setup is in place.

const { test, expect } = require('@playwright/test');

test.describe('Public pages render', () => {
    test('home page loads', async ({ page }) => {
        await page.goto('/');
        // The navbar's "Get Eagle Eyes" button should be visible for
        // signed-out visitors (it's hidden via the ee-auth-hint CSS
        // when a previous session has marked us as signed in).
        await expect(page.locator('#navGetEagleEyesBtn')).toBeVisible();
    });

    test('pricing page renders the pricing table', async ({ page }) => {
        await page.goto('/pricing/');
        await expect(page.locator('#purchaseLicenseButton')).toBeVisible();
    });
});

test.describe('Account-area signed-out shells', () => {
    test('/account/ shows the sign-in panel and hides the sidebar', async ({ page }) => {
        await page.goto('/account/');
        // The sign-in panel is the signed-out fallback; auth-checking
        // spinner only appears when localStorage.eeAuthHint is set
        // (no hint in a fresh browser).
        await expect(page.locator('#signinButtonSection')).toBeVisible();
        // Sidebar should be hidden — every link inside requires auth.
        await expect(page.locator('.account-sidebar')).toBeHidden();
    });

    test('/account/billing/ renders without auth (signed-out state)', async ({ page }) => {
        await page.goto('/account/billing/');
        // billing.html shows the signed-out fallback when no user.
        await expect(page.locator('#billingSignedOut')).toBeVisible({ timeout: 10_000 });
        // The billing-address modal include should be present in the DOM
        // (hidden) so the page is wired correctly.
        await expect(page.locator('#eeBillingAddressOverlay')).toHaveCount(1);
        await expect(page.locator('#eeBillingAddressOverlay')).toBeHidden();
    });

    test('/account/purchase/ renders without auth (signed-out state)', async ({ page }) => {
        await page.goto('/account/purchase/');
        await expect(page.locator('#purchaseSignedOut')).toBeVisible({ timeout: 10_000 });
        // The billing-address modal include is shared with billing.html.
        await expect(page.locator('#eeBillingAddressOverlay')).toHaveCount(1);
    });

    test('/account/profile/ shows the signed-out CTA', async ({ page }) => {
        await page.goto('/account/profile/');
        await expect(page.locator('#profileSignedOut')).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Billing-address modal markup is well-formed', () => {
    test('country dropdown is populated with the spec\'s top-of-list', async ({ page }) => {
        // The modal lives on /account/billing/. We open the page and
        // inspect the dropdown without interacting (modal is hidden by
        // default but DOM is present).
        await page.goto('/account/billing/');
        const countryOptions = await page.locator('#eeBaCountry option').allTextContents();
        // Spec §1 top countries should all appear.
        expect(countryOptions.join(' ')).toContain('Canada');
        expect(countryOptions.join(' ')).toContain('United States');
        expect(countryOptions.join(' ')).toContain('United Kingdom');
        expect(countryOptions.join(' ')).toContain('Australia');
    });
});

test.describe('Purchase page structure', () => {
    test('reference-details panel renders the two seeded custom-field rows', async ({ page }) => {
        await page.goto('/account/purchase/');
        // The signed-out fallback hides #purchaseContent so the custom-field
        // rows aren't visible to the user, but the markup should still be
        // present in the DOM (this catches Liquid / include regressions).
        const rows = page.locator('#invoiceCustomFieldRows .custom-field-row');
        await expect(rows).toHaveCount(2);
        // The two seeded names are PO Number and Reference.
        await expect(rows.nth(0).locator('.custom-field-name')).toHaveValue('PO Number');
        await expect(rows.nth(1).locator('.custom-field-name')).toHaveValue('Reference');
    });

    test('Continue button + payment-method radios are present', async ({ page }) => {
        await page.goto('/account/purchase/');
        await expect(page.locator('#ctaContinue')).toHaveCount(1);
        const payRows = page.locator('.pay-row');
        await expect(payRows).toHaveCount(3); // card / invoice / quote
    });
});
