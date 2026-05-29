// UI gate for future-start (renewal) licenses.
//
// activate.html / setup.html are auth-gated, so we can't drive the real
// signed-in flow from a clean browser. Instead we load each page, set the
// in-memory license state, reveal the picker containers, and call the
// page's own render/guard functions directly. The state vars are reachable
// from the page's global scope (setup uses `var`; activate uses top-level
// `let`, which still lives in the shared global lexical environment, so an
// evaluated function can read+assign it).

const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'test-results', 'future-start');

// now + 30 days (pending) and now - 1 day (already started) in Unix seconds.
const FUTURE_AT = Math.floor(Date.now() / 1000) + 30 * 86400;
const PAST_AT = Math.floor(Date.now() / 1000) - 86400;
const EXPIRY_AT = Math.floor(Date.now() / 1000) + 395 * 86400;

test.describe('activate.html — future-start gate', () => {
    test('licenseIsPending + render functions disable pending licenses', async ({ page }) => {
        await page.goto('/activate/');
        await page.waitForFunction(
            () => typeof window.licenseIsPending === 'function'
                && typeof window.renderPrimaryLicense === 'function'
                && typeof window.renderOtherLicenseRow === 'function',
            { timeout: 10_000 }
        );

        const probe = await page.evaluate((args) => {
            const future = { start_at: args.future };
            const past = { start_at: args.past };
            const none = {};
            const isoFuture = { start_at_iso: new Date(args.future * 1000).toISOString().slice(0, 10) };
            return {
                pendingFuture: window.licenseIsPending(future),
                pendingPast: window.licenseIsPending(past),
                pendingNone: window.licenseIsPending(none),
                pendingIso: window.licenseIsPending(isoFuture),
                primaryPending: window.renderPrimaryLicense({
                    license_id: 'LIC-FUT', license_name: 'Renewal SAR (3)',
                    expiry_timestamp: args.expiry, remaining_keys: 3,
                    has_existing_key: false, start_at: args.future,
                    is_pending: true
                }),
                primaryNormal: window.renderPrimaryLicense({
                    license_id: 'LIC-NOW', license_name: 'Active SAR (3)',
                    expiry_timestamp: args.expiry, remaining_keys: 3,
                    has_existing_key: false, start_at: null,
                    is_pending: false
                }),
                otherPending: window.renderOtherLicenseRow({
                    license_id: 'LIC-FUT', license_name: 'Renewal SAR (3)',
                    expiry_timestamp: args.expiry, remaining_keys: 3,
                    has_existing_key: false, start_at: args.future,
                    is_pending: true
                })
            };
        }, { future: FUTURE_AT, past: PAST_AT, expiry: EXPIRY_AT });

        expect(probe.pendingFuture).toBe(true);
        expect(probe.pendingPast).toBe(false);
        expect(probe.pendingNone).toBe(false);
        expect(probe.pendingIso).toBe(true);

        // Pending primary: disabled button, "Available from", no onclick.
        expect(probe.primaryPending).toMatch(/Available from/);
        expect(probe.primaryPending).toMatch(/disabled/);
        expect(probe.primaryPending).not.toMatch(/onclick="selectLicense/);
        // Normal primary: active "Activate with this license" + onclick.
        expect(probe.primaryNormal).toMatch(/Activate with this license/);
        expect(probe.primaryNormal).toMatch(/onclick="selectLicense\('LIC-NOW'\)"/);
        // Pending other-row: disabled, "Available from", no onclick.
        expect(probe.otherPending).toMatch(/Available from/);
        expect(probe.otherPending).toMatch(/disabled/);
        expect(probe.otherPending).not.toMatch(/onclick="selectLicense/);
    });

    test('pending license is sorted last (never auto-primary) and renders disabled in the DOM', async ({ page }) => {
        await page.goto('/activate/');
        await page.waitForFunction(() => typeof window.displayLicenses === 'function', { timeout: 10_000 });

        await page.evaluate((args) => {
            // Assigning a top-level `let` binding from global scope mutates
            // the same binding the page's functions read.
            userLicenses = [
                { license_id: 'LIC-FUT', license_name: 'Renewal SAR (3)',
                  expiry_timestamp: args.expiry, remaining_keys: 3,
                  has_existing_key: false, start_at: args.future, is_pending: true },
                { license_id: 'LIC-NOW', license_name: 'Active SAR (3)',
                  expiry_timestamp: args.expiry, remaining_keys: 3,
                  has_existing_key: false, start_at: null, is_pending: false }
            ];
            // Reveal the licenses section and hide the sign-in gate so the
            // screenshot shows the rendered cards, not the auth panel.
            var authGate = document.getElementById('auth-required');
            if (authGate) authGate.style.display = 'none';
            var section = document.getElementById('license-selection-section');
            if (section) section.style.display = 'block';
            document.getElementById('licensesContainer').style.display = 'block';
            displayLicenses();
        }, { future: FUTURE_AT, expiry: EXPIRY_AT });

        // Primary must be the active license, not the pending renewal.
        const primary = page.locator('#primaryLicense');
        await expect(primary).toContainText('Active SAR (3)');
        await expect(primary.locator('button:not([disabled])')).toContainText('Activate with this license');

        // The pending renewal is in the "other" list, disabled.
        const other = page.locator('#otherLicensesList');
        await expect(other).toContainText('Renewal SAR (3)');
        await expect(other).toContainText('Available from');
        await expect(other.locator('button[disabled]')).toHaveCount(1);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'activate-pending-sorted-last.png'), fullPage: true });
    });

    test('confirmActivation refuses a pending license (no complete_activation POST)', async ({ page }) => {
        await page.goto('/activate/');
        await page.waitForFunction(() => typeof window.confirmActivation === 'function', { timeout: 10_000 });

        // Record any complete_activation POST. The guard should return before
        // jQuery.ajax is reached, so this stays empty.
        const result = await page.evaluate((args) => {
            const posts = [];
            // Intercept jQuery.ajax (the page uses $.ajax for the POST).
            const realAjax = window.$ && window.$.ajax;
            if (window.$) window.$.ajax = (opts) => { posts.push((opts && opts.url) || ''); return { done() {}, fail() {} }; };

            userLicenses = [
                { license_id: 'LIC-FUT', license_name: 'Renewal SAR (3)',
                  expiry_timestamp: args.expiry, remaining_keys: 3,
                  has_existing_key: false, start_at: args.future, is_pending: true }
            ];
            selectedLicense = 'LIC-FUT';
            // Minimal DOM the confirm/guard path touches.
            document.getElementById('inlineConfirmArea').innerHTML =
                '<div class="inline-confirm"><div class="confirm-actions"></div>' +
                '<p class="confirm-warning"></p>' +
                '<div id="activationLoading" style="display:none;"><p></p></div>' +
                '<div id="activationResult" style="display:none;"></div></div>';

            confirmActivation();

            const out = {
                posts: posts,
                resultHtml: document.getElementById('activationResult').innerHTML,
                resultVisible: document.getElementById('activationResult').style.display !== 'none'
            };
            if (window.$ && realAjax) window.$.ajax = realAjax;
            return out;
        }, { future: FUTURE_AT, expiry: EXPIRY_AT });

        expect(result.posts).toEqual([]);              // no complete_activation fired
        expect(result.resultVisible).toBe(true);
        expect(result.resultHtml).toMatch(/available from/i);
    });
});

test.describe('setup.html — future-start gate', () => {
    async function primeSetup(page, mode) {
        await page.goto('/setup/');
        await page.waitForFunction(
            () => typeof window.lpDisplayLicenses === 'function'
                && typeof window.lpConfirmActivation === 'function',
            { timeout: 10_000 }
        );
        await page.evaluate((args) => {
            window.lpMode = args.mode;
            window.lpUserLicenses = [
                { license_id: 'LIC-FUT', license_name: 'Renewal SAR (3)',
                  expiry_timestamp: args.expiry, remaining_keys: 3,
                  has_existing_key: false, start_at: args.future, is_pending: true },
                { license_id: 'LIC-NOW', license_name: 'Active SAR (3)',
                  expiry_timestamp: args.expiry, remaining_keys: 3,
                  has_existing_key: false, start_at: null, is_pending: false }
            ];
            var section = document.getElementById('licensePickerSection');
            if (section) section.style.display = 'block';
            document.getElementById('lpLoading').style.display = 'none';
            document.getElementById('lpContainer').style.display = 'block';
            lpDisplayLicenses();
        }, { mode, future: FUTURE_AT, expiry: EXPIRY_AT });
    }

    test('activate mode: pending sorted last, rendered disabled', async ({ page }) => {
        await primeSetup(page, 'activate');
        const primary = page.locator('#lpPrimary');
        await expect(primary).toContainText('Active SAR (3)');
        await expect(primary.locator('button:not([disabled])')).toContainText('Activate with this license');

        const other = page.locator('#lpOtherList');
        await expect(other).toContainText('Renewal SAR (3)');
        await expect(other).toContainText('Available from');
        await expect(other.locator('button[disabled]')).toHaveCount(1);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'setup-pending-sorted-last.png'), fullPage: true });
    });

    test('select mode: pending license is also disabled in the picker', async ({ page }) => {
        await primeSetup(page, 'select');
        const other = page.locator('#lpOtherList');
        await expect(other).toContainText('Renewal SAR (3)');
        await expect(other).toContainText('Available from');
        await expect(other.locator('button[disabled]')).toHaveCount(1);
    });

    test('lpConfirmActivation refuses a pending license (no complete_activation call)', async ({ page }) => {
        await primeSetup(page, 'activate');
        const result = await page.evaluate(() => {
            const calls = [];
            const realApi = window.apiCall;
            window.apiCall = (endpoint) => { calls.push(endpoint); return Promise.resolve({}); };

            window.lpSelectedLicense = 'LIC-FUT';
            // lpConfirmActivation expects a confirm area; build the minimum.
            document.getElementById('lpConfirmArea').innerHTML =
                '<div class="lp-confirm"><div class="lp-confirm-actions"></div>' +
                '<div id="lpActivationLoading" style="display:none;"></div>' +
                '<div id="lpActivationResult" style="display:none;"></div></div>';

            const ret = window.lpConfirmActivation();
            const finish = () => ({
                calls,
                resultHtml: document.getElementById('lpActivationResult').innerHTML,
                resultVisible: document.getElementById('lpActivationResult').style.display !== 'none'
            });
            // lpConfirmActivation is async but the guard returns synchronously
            // before any await; resolve on next tick to be safe.
            return Promise.resolve(ret).then(() => {
                const out = finish();
                window.apiCall = realApi;
                return out;
            });
        });

        expect(result.calls).toEqual([]);             // complete_activation never called
        expect(result.resultVisible).toBe(true);
        expect(result.resultHtml).toMatch(/available from/i);
    });

    test('get_license_overview path: start_at_iso marks a license pending', async ({ page }) => {
        await page.goto('/setup/');
        await page.waitForFunction(() => typeof window.licenseIsPending === 'function', { timeout: 10_000 });
        const res = await page.evaluate((args) => {
            // Mirror the mapping lpLoadUserLicenses does for the overview path.
            const o = {
                license_id: 'LIC-FUT',
                license_name: 'Renewal SAR (3)',
                expiry_date: new Date(args.expiry * 1000).toISOString().slice(0, 10),
                total_keys: 3, keys_left: 3,
                start_at_iso: new Date(args.future * 1000).toISOString().slice(0, 10)
            };
            const mapped = {
                license_id: o.license_id,
                license_name: o.license_name,
                expiry_timestamp: Math.floor(new Date(o.expiry_date).getTime() / 1000),
                n_tokens: o.total_keys, remaining_keys: o.keys_left,
                has_existing_key: false, start_at_iso: o.start_at_iso
            };
            return window.licenseIsPending(mapped);
        }, { future: FUTURE_AT, expiry: EXPIRY_AT });
        expect(res).toBe(true);
    });
});
