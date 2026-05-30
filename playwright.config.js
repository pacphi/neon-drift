import { defineConfig, devices } from '@playwright/test';

// Drives Chromium. Run `pnpm exec playwright install chromium` once to fetch the browser.
// Chromium ships SwiftShader, a software GL backend, so WebGL works on the GPU-less
// CI runner — headless Firefox cannot reliably create a WebGL context there.
export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'pnpm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173',
    // Force software WebGL via SwiftShader so THREE.WebGLRenderer can get a
    // context on headless/GPU-less machines instead of throwing on boot.
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
