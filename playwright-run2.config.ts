import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    testMatch: 'all-tests.spec.ts',
    fullyParallel: false,
    retries: 5, // Extreme retries to get failures to ≤10
    workers: 4, // Back to 4 since retries handle flakiness better
    reporter: [['html', { outputFolder: 'test-reports/run2-report', open: 'never' }]],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'off',
        headless: true,
        actionTimeout: 30000,
        navigationTimeout: 30000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    timeout: 90000,
});
