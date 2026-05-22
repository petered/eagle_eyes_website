// UI smoke for the device-release flow.
//
// /account/ is auth-gated so we can't drive the real signed-in surface
// from a clean browser. Instead we (a) load /account/ signed-out and
// confirm the page boots cleanly (no JS error from my edits), and
// (b) reach into window-scope helpers with synthetic state to render
// the Devices view from mocks and screenshot the new UI in each of its
// interesting states.

const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'test-results', 'release-flow');

function mockDeviceFixture() {
    // license_overview shape mirrors firestore_db_functions.compute_license_overview
    // — only the fields the new code touches are populated.
    const license_overview = [{
        license_id: 'LIC-DEMO-1',
        license_name: '1-Year SAR (3 devices)',
        expiry_date: '2027-01-05',
        total_keys: 3,
        n_tokens: 3,
        keys_left: 0,
        keys_used_by: ['patrick@example.com', 'maria@example.com', 'jordan@example.com'],
        releases_used: 1,
        releases_budget: 6,
        releases_remaining: 5
    }];
    // A second license, one releases remaining, used for the "warn" color.
    license_overview.push({
        license_id: 'LIC-DEMO-2',
        license_name: '1-Year SAR (2 devices)',
        expiry_date: '2026-12-01',
        total_keys: 2,
        n_tokens: 2,
        keys_left: 0,
        keys_used_by: ['alex@example.com', 'sam@example.com'],
        releases_used: 3,
        releases_budget: 4,
        releases_remaining: 1
    });
    // Third license, exhausted, to test the "No releases left" branch.
    license_overview.push({
        license_id: 'LIC-DEMO-3',
        license_name: 'Trial (1 device)',
        expiry_date: '2027-06-01',
        total_keys: 1,
        n_tokens: 1,
        keys_left: 0,
        keys_used_by: ['casey@example.com'],
        releases_used: 2,
        releases_budget: 2,
        releases_remaining: 0
    });

    const devices = [
        {
            machine_id: 'MACHINE-AAA',
            name: "Patrick's RC Plus",
            display_name: "Patrick's RC Plus",
            device_identifier: 'DJI RC Plus',
            android_version: '13',
            dji_device_type: 'Mavic 3T',
            is_dji_device: true,
            account_id: 12345678,
            organization_id: 87654321,
            emails: ['patrick@example.com'],
            n_active_tokens: 1,
            latest_license_id: 'LIC-DEMO-1',
            first_activated_at: 1740000000,
            last_activated_at: 1747900000,
            tokens: [{
                token_id: 'TOK-AAA',
                license_id: 'LIC-DEMO-1',
                license_name: '1-Year SAR (3 devices)',
                tier: 'SAR',
                email: 'patrick@example.com',
                expiry_date: '2027-01-05',
                expiry_timestamp: 1830000000,
                last_activated_at: 1747900000
            }]
        },
        {
            machine_id: 'MACHINE-BBB',
            name: null,
            display_name: 'Android Tablet',
            device_identifier: 'Android Tablet',
            android_version: '12',
            dji_device_type: null,
            is_dji_device: false,
            account_id: 12345678,
            organization_id: 87654321,
            emails: ['alex@example.com'],
            n_active_tokens: 1,
            latest_license_id: 'LIC-DEMO-2',
            first_activated_at: 1741000000,
            last_activated_at: 1747500000,
            tokens: [{
                token_id: 'TOK-BBB',
                license_id: 'LIC-DEMO-2',
                license_name: '1-Year SAR (2 devices)',
                tier: 'SAR',
                email: 'alex@example.com',
                expiry_date: '2026-12-01',
                expiry_timestamp: 1820000000,
                last_activated_at: 1747500000
            }]
        },
        {
            machine_id: 'MACHINE-CCC',
            name: "Casey's iPad",
            display_name: "Casey's iPad",
            device_identifier: 'iPad',
            android_version: null,
            dji_device_type: null,
            is_dji_device: false,
            account_id: 12345678,
            organization_id: 87654321,
            emails: ['casey@example.com'],
            n_active_tokens: 1,
            latest_license_id: 'LIC-DEMO-3',
            first_activated_at: 1742000000,
            last_activated_at: 1746000000,
            tokens: [{
                token_id: 'TOK-CCC',
                license_id: 'LIC-DEMO-3',
                license_name: 'Trial (1 device)',
                tier: 'SAR',
                email: 'casey@example.com',
                expiry_date: '2027-06-01',
                expiry_timestamp: 1840000000,
                last_activated_at: 1746000000
            }]
        }
    ];

    const source = {
        org: {
            org_id: 87654321,
            name: 'Test Org',
            licenses: license_overview.map(function(l) { return { license_id: l.license_id }; })
        }
    };

    return { license_overview, devices, source };
}

// Known-pre-existing pageerrors that aren't from my code. Filter out
// so the strict "no JS errors" check can still catch regressions in
// the device-release flow without flagging template-level noise.
const IGNORED_PAGEERROR_RE = [
    // timber.master.min.js's fixedFooter init throws on this layout
    // when no footer element exists (unrelated to /account/).
    /reading 'top'/,
];
function isExpectedPageError(msg) {
    return IGNORED_PAGEERROR_RE.some(re => re.test(msg));
}

async function loadAndPrime(page) {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('pageerror', (err) => {
        const m = err.message || String(err);
        if (!isExpectedPageError(m)) pageErrors.push(m);
    });
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/account/');
    // Wait for the script block to finish wiring the page. We use
    // applyDashboardData since it's the real entry point and we'll need
    // it below — also confirms function declarations have hoisted.
    await page.waitForFunction(
        () => typeof window.renderDeviceCards === 'function'
            && typeof window.applyDashboardData === 'function'
            && typeof window.renderLicenseCards === 'function',
        { timeout: 10_000 }
    );
    return { consoleErrors, pageErrors };
}

// Caches like cachedLicenseOverview are `let`-declared inside the
// script — not on window. We can't assign them from page.evaluate's
// separate scope. Instead, call the real applyDashboardData, which is
// hoisted to window and mutates those closure-scoped vars internally.
// For cachedAccountDevices we don't need to set it — renderDeviceCards
// takes devices as an argument; only the release-budget lookup reads
// from the (now-primed) cachedLicenseOverview.
async function primeMockState(page, fixture) {
    await page.evaluate((fx) => {
        window.applyDashboardData({
            organizations: [{ org_id: fx.devices[0].organization_id, name: 'Test Org' }],
            accounts: [{ account_id: fx.devices[0].account_id, name: 'Test Account' }],
            license_overview: fx.license_overview,
            user_account_info: null,
            streaming_credits: null
        });
        // Force the tokens grid + its ancestors to render. The signed-out
        // page hides them; un-hide so the rendered HTML is visible to
        // toBeVisible() assertions and screenshots.
        const grid = document.getElementById('tokensGrid');
        if (grid) {
            grid.style.display = '';
            let p = grid.parentElement;
            while (p && p !== document.body) {
                if (p.style && p.style.display === 'none') p.style.display = '';
                p = p.parentElement;
            }
        }
        const empty = document.getElementById('tokensEmpty');
        if (empty) empty.style.display = 'none';
        window.renderDeviceCards(fx.devices, fx.source);
    }, fixture);
}

test.describe('Device release UI', () => {
    test('page boots without console errors and exposes the new helpers', async ({ page }) => {
        const { consoleErrors, pageErrors } = await loadAndPrime(page);
        // Sign-in panel is the visible shell when not authed; if it's not
        // there the page didn't render at all.
        await expect(page.locator('#signinButtonSection')).toBeVisible();
        // The new globals must be present (function declarations at the
        // top of the script become window-globals).
        const probe = await page.evaluate(() => ({
            release: typeof window.releaseDeviceToken,
            listReleases: typeof window.listLicenseReleases,
            getBudget: typeof window.getLicenseReleaseBudget,
            renderRows: typeof window.renderReleaseHistoryRows
        }));
        expect(probe.release).toBe('function');
        expect(probe.listReleases).toBe('function');
        expect(probe.getBudget).toBe('function');
        expect(probe.renderRows).toBe('function');
        // No JS errors during load.
        expect(pageErrors, 'pageerror events').toEqual([]);
        // Console errors that aren't network/auth chatter are a problem.
        const significant = consoleErrors.filter(t =>
            !/auth|firebase|favicon|404|net::|Failed to fetch/i.test(t)
        );
        expect(significant, 'significant console errors').toEqual([]);
    });

    test('by-license render exposes section header + per-token Release button + 0-budget state', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => {
            const m = err.message || String(err);
            if (!isExpectedPageError(m)) errors.push(m);
        });
        const fixture = mockDeviceFixture();
        await loadAndPrime(page);
        await primeMockState(page, fixture);

        const grid = page.locator('#tokensGrid');
        await expect(grid).toBeVisible();
        const sections = grid.locator('.device-license-section');
        await expect(sections).toHaveCount(3);

        // Section 1: 5 releases left (default color).
        const section1 = sections.filter({ hasText: '1-Year SAR (3 devices)' });
        await expect(section1.locator('.device-license-section-releases'))
            .toHaveText(/5 releases left/);
        await expect(section1.locator('.device-license-section-releases'))
            .not.toHaveClass(/warn|exhausted/);

        // Section 2: 1 release left → warn color.
        const section2 = sections.filter({ hasText: '1-Year SAR (2 devices)' });
        await expect(section2.locator('.device-license-section-releases'))
            .toHaveText(/1 release left/);
        await expect(section2.locator('.device-license-section-releases'))
            .toHaveClass(/warn/);

        // Section 3: 0 releases → exhausted color.
        const section3 = sections.filter({ hasText: 'Trial (1 device)' });
        await expect(section3.locator('.device-license-section-releases'))
            .toHaveText(/0 releases left/);
        await expect(section3.locator('.device-license-section-releases'))
            .toHaveClass(/exhausted/);

        // Open the keys dropdown on Patrick's row (active budget).
        const patrickRow = grid.locator('.device-row').filter({ hasText: 'patrick@example.com' });
        await patrickRow.locator('button.people-icon-btn', { hasText: /Show key/ }).click();
        const releaseBtn = patrickRow.locator('button.people-icon-btn.danger', { hasText: 'Release' });
        await expect(releaseBtn).toBeVisible();

        // Open the keys dropdown on Casey's exhausted-license row.
        const caseyRow = grid.locator('.device-row').filter({ hasText: 'casey@example.com' });
        await caseyRow.locator('button.people-icon-btn', { hasText: /Show key/ }).click();
        await expect(caseyRow.locator('.device-row-key-no-budget')).toContainText('No releases left');
        await expect(caseyRow.locator('.device-row-key-no-budget a'))
            .toHaveAttribute('href', /^mailto:support@eagleeyessearch\.com/);
        await expect(caseyRow.locator('button.people-icon-btn.danger', { hasText: 'Release' })).toHaveCount(0);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'section-headers-and-release-button.png'),
            fullPage: true
        });
        expect(errors, 'pageerror during render').toEqual([]);
    });

    test('clicking Release opens the inline confirm panel; Cancel restores', async ({ page }) => {
        const fixture = mockDeviceFixture();
        await loadAndPrime(page);
        await primeMockState(page, fixture);

        const grid = page.locator('#tokensGrid');
        const patrickRow = grid.locator('.device-row').filter({ hasText: 'patrick@example.com' });
        await patrickRow.locator('button.people-icon-btn', { hasText: /Show key/ }).click();
        await patrickRow.locator('button.people-icon-btn.danger', { hasText: 'Release' }).click();

        // Confirm panel: names device + user + license, mentions reinstall.
        const panel = patrickRow.locator('.device-row-key-confirm');
        await expect(panel).toBeVisible();
        await expect(panel).toContainText("Patrick's RC Plus");
        await expect(panel).toContainText('patrick@example.com');
        await expect(panel).toContainText('1-Year SAR (3 devices)');
        await expect(panel).toContainText(/Costs 1 of 5 releases left/);
        await expect(panel).toContainText(/Reinstalling/);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'release-confirm-panel.png'),
            fullPage: true
        });

        // Cancel restores the original action cluster.
        await panel.locator('button', { hasText: 'Cancel' }).click();
        await expect(panel).toHaveCount(0);
        await expect(patrickRow.locator('button.people-icon-btn.danger', { hasText: 'Release' })).toBeVisible();
    });

    test('Release-history toggle exists in the license card details', async ({ page }) => {
        const fixture = mockDeviceFixture();
        await loadAndPrime(page);

        // Seed cachedLicenseOverview via the real applyDashboardData (so
        // the closure-scoped var is mutated, not a shadowed window prop)
        // and call renderLicenseCards directly to write into plansPrimary
        // / plansOtherList without going through the auth-gated flow.
        await page.evaluate((fx) => {
            window.applyDashboardData({
                organizations: [{ org_id: fx.devices[0].organization_id, name: 'Test Org' }],
                accounts: [{ account_id: fx.devices[0].account_id, name: 'Test Account' }],
                license_overview: fx.license_overview,
                user_account_info: null,
                streaming_credits: null
            });
            ['plansPrimary', 'plansOtherList', 'plansExpandLink'].forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.style.display = '';
                let p = el.parentElement;
                while (p && p !== document.body) {
                    if (p.style && p.style.display === 'none') p.style.display = '';
                    p = p.parentElement;
                }
            });
            window.renderLicenseCards(fx.license_overview);
        }, fixture);

        // At least one card rendered (primary card or "other" row).
        const anyCard = page.locator('#plansPrimary, #plansOtherList').locator('*');
        await expect(anyCard.first()).toBeAttached({ timeout: 5_000 });

        // History toggle is generated for every license_id. The primary
        // card's details body is hidden by default (foldout); expand it
        // first by clicking the "Show details" toggle on the primary card.
        const detailsToggle = page.locator('#plansPrimary .plan-details-toggle').first();
        if (await detailsToggle.count()) await detailsToggle.click();

        const toggles = page.locator('.plan-release-history-toggle');
        await expect(toggles.first()).toBeVisible();
        await expect(toggles.first()).toHaveText(/Show release history/);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'license-card-with-history-toggle.png'),
            fullPage: true
        });
    });
});
