import { test, expect } from '@playwright/test';

test.describe('Payments access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // ignore
      }
    });
  });

  test('unauthenticated /payments redirects to login', async ({ page }) => {
    await page.goto('/payments');
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });

  test('unauthenticated /academy-financial-report redirects to login', async ({ page }) => {
    await page.goto('/academy-financial-report');
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });
});
