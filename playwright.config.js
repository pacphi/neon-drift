import { defineConfig, devices } from '@playwright/test';

// Drives Firefox. Run `pnpm exec playwright install firefox` once to fetch the browser.
export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'pnpm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173',
    // Headless CI runners have no GPU; force-enable WebGL so Three.js can get a
    // context via software rendering (Mesa llvmpipe) instead of throwing on boot.
    launchOptions: {
      firefoxUserPrefs: {
        'webgl.force-enabled': true,
        'webgl.disabled': false,
        'gfx.webrender.software': true,
      },
    },
  },
  projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
});
