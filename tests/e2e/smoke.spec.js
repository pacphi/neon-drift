import { test, expect } from '@playwright/test';

test('boots and reaches a race without console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => {
    // ignore the harmless favicon 404
    if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
  });
  await page.goto('/');
  // Surface a boot-time crash (e.g. failed WebGL context) instead of a vague
  // "canvas not found" timeout — assert no errors before waiting on the canvas.
  await expect(page.locator('canvas')).toBeVisible();
  expect(errors, `boot errors:\n${errors.join('\n')}`).toEqual([]);
  await page.getByText('START').click();
  await expect(page.getByText('SELECT TRACK')).toBeVisible();
  await page.locator('.tk').first().click();
  await page.waitForTimeout(1500); // race renders + countdown
  // The HUD fills in only after the 3 s countdown. Under software WebGL (SwiftShader)
  // on a CI runner, newer headless Chromium renders slowly enough that this takes
  // ~8 s, so allow well beyond the default 5 s expect timeout.
  await expect(page.locator('#lap')).toContainText('LAP', { timeout: 20_000 });
  expect(errors).toEqual([]);
});
