import { test, expect } from '@playwright/test';

test('boots and reaches a race without console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => {
    // ignore the harmless favicon 404
    if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
  });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByText('START').click();
  await expect(page.getByText('SELECT TRACK')).toBeVisible();
  await page.locator('.tk').first().click();
  await page.waitForTimeout(1500); // race renders + countdown
  await expect(page.locator('#lap')).toContainText('LAP');
  expect(errors).toEqual([]);
});
