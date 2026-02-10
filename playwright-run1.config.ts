import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    testMatch: 'all-tests.spec.ts',
    fullyParallel: true,
    retries: 0,
    workers: 4,
    reporter: [['html', { outputFolder: 'test-reports/run1-report', open: 'never' }]],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'off',
        headless: true,
        actionTimeout: 150,
        navigationTimeout: 850,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    timeout: 850,
});
