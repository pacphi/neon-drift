import { defineConfig, devices } from '@playwright/test';

// Drives Firefox. Run `pnpm exec playwright install firefox` once to fetch the browser.
export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'pnpm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:5173' },
  projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
});
