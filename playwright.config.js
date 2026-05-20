// Playwright config for the Eagle Eyes Jekyll site.
//
// Run locally:
//   npm run e2e               # all tests, against http://localhost:4000
//   npm run e2e -- --headed   # watch the browser as tests run
//   npm run e2e:ui            # interactive UI mode (best for debugging)
//   npm run e2e:report        # open the last HTML report
//
// Assumes Jekyll is serving on localhost:4000. If not running,
// webServer below starts `bundle exec jekyll serve` and waits for it.

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }]
    ],
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000',
        // Capture artefacts only on failure so green runs stay fast.
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Pretend to be a real desktop so the navbar / sidebar render in their
        // primary layout (we have mobile breakpoints kicking in below 768px).
        viewport: { width: 1280, height: 800 },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
        // Add firefox / webkit projects later if needed; chromium is
        // enough for first-pass smoke + UI structural checks.
    ],
    // Auto-start Jekyll if it isn't already running. Reuses an existing
    // server when one's already up on localhost:4000 so dev sessions
    // don't fight over the port.
    webServer: {
        command: 'bundle exec jekyll serve --quiet --skip-initial-build',
        url: 'http://localhost:4000',
        reuseExistingServer: true,
        timeout: 90_000,
    },
});
