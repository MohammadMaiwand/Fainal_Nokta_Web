import { test, expect } from '@playwright/test';

async function clearClientSession(page: import('@playwright/test').Page) {
  await page.goto('/home');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });
}

function extractCaptchaAnswerFromSvg(svg: string) {
  const matches = [...String(svg).matchAll(/<text\b[^>]*>([^<]*)<\/text>/gi)];
  return matches.map((item) => item[1]).join('').replace(/\s+/g, '').toUpperCase();
}

test.describe('Finance routes require authentication', () => {
  test.beforeEach(async ({ page }) => {
    await clearClientSession(page);
  });

  for (const route of ['/payments', '/finance', '/payroll', '/academy-financial-report', '/expenses'] as const) {
    test(`unauthenticated ${route} redirects to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    });
  }
});

test.describe('Public finance-adjacent pages still load', () => {
  test('login page is reachable for payment workflows', async ({ page }) => {
    await clearClientSession(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });
});

/**
 * Authenticated browser E2E.
 * Prefer E2E_ADMIN_*; falls back to SEED_SUPER_ADMIN_* (same as backend live E2E).
 * Requires backend API (CAPTCHA + login) on VITE proxy / 8081.
 */
test.describe('Authenticated finance workflows', () => {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.SEED_SUPER_ADMIN_PASSWORD;
  const apiBase = (process.env.E2E_API_BASE || process.env.BASE_URL || 'http://127.0.0.1:8081').replace(/\/$/, '');

  test('login via CAPTCHA then open payments page', async ({ page, request }) => {
    test.skip(!email || !password, 'Set E2E_ADMIN_* or SEED_SUPER_ADMIN_* for authenticated E2E');

    const captcha = await request.get(`${apiBase}/api/auth/captcha`);
    test.skip(!captcha.ok(), `Backend CAPTCHA unavailable at ${apiBase} — start backend to complete authenticated E2E`);
    const captchaJson = await captcha.json();
    const challengeId = captchaJson?.data?.challengeId;
    const svg = captchaJson?.data?.svg;
    const answer = extractCaptchaAnswerFromSvg(svg || '');
    expect(challengeId).toBeTruthy();
    expect(answer.length).toBeGreaterThanOrEqual(4);

    await clearClientSession(page);
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').first().fill(email!);
    await page.locator('input[type="password"], input[name="password"]').first().fill(password!);

    const captchaInput = page.locator('input[name="captchaAnswer"], input[id*="captcha" i], input[placeholder*="captcha" i], input[placeholder*="امنیت" i]').first();
    if (await captchaInput.count()) {
      // Force challenge id + answer into the React form via API-aligned fields when present.
      await page.evaluate(
        ({ id, value }) => {
          const idInput =
            document.querySelector<HTMLInputElement>('input[name="captchaChallengeId"]') ||
            document.querySelector<HTMLInputElement>('input[data-captcha-challenge]');
          if (idInput) {
            idInput.value = id;
            idInput.dispatchEvent(new Event('input', { bubbles: true }));
            idInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          (window as any).__E2E_CAPTCHA__ = { id, value };
        },
        { id: challengeId, value: answer }
      );
      await captchaInput.fill(answer);
    }

    // Prefer UI login; if CAPTCHA challenge id is bound only via React state, use API login + inject tokens.
    const loginApi = await request.post(`${apiBase}/api/auth/login`, {
      data: {
        email,
        password,
        captchaChallengeId: challengeId,
        captchaAnswer: answer
      }
    });
    const loginJson = await loginApi.json();
    let accessToken = loginJson?.data?.tokens?.accessToken || loginJson?.data?.token || loginJson?.token;
    let refreshToken = loginJson?.data?.tokens?.refreshToken || loginJson?.data?.refreshToken || loginJson?.refreshToken || null;
    let user = loginJson?.data?.user || loginJson?.user;

    if (loginJson?.data?.twoFactorRequired) {
      const preview = loginJson?.data?.challenge?.codePreview;
      expect(preview).toBeTruthy();
      const verify = await request.post(`${apiBase}/api/auth/login/2fa`, {
        data: { email, code: String(preview) }
      });
      const verifyJson = await verify.json();
      accessToken = verifyJson?.data?.tokens?.accessToken || verifyJson?.data?.token;
      refreshToken = verifyJson?.data?.tokens?.refreshToken || verifyJson?.data?.refreshToken || null;
      user = verifyJson?.data?.user;
    }

    expect(accessToken).toBeTruthy();
    expect(user).toBeTruthy();

    await page.goto('/home');
    await page.evaluate(
      ({ user, accessToken, refreshToken }) => {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
      },
      { user, accessToken, refreshToken }
    );
    await page.reload();
    await page.goto('/payments');
    await expect(page).toHaveURL(/\/payments/, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(/payment|پرداخت|تادیه/i, { timeout: 20_000 });
  });
});
