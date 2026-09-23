import { test, expect } from '@playwright/test';

test.describe('Public smoke', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/home/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('privacy and terms pages load', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/terms');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
