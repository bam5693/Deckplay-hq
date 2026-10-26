const { test, expect } = require('@playwright/test');
const accounts = [
  ['seller', 'DECKPLAY_TEST_SELLER_EMAIL', 'DECKPLAY_TEST_SELLER_PASSWORD'],
  ['buyer', 'DECKPLAY_TEST_BUYER_EMAIL', 'DECKPLAY_TEST_BUYER_PASSWORD']
];
for (const [role, emailKey, passwordKey] of accounts) {
  test(role + ' can sign in through the normal protected login', async ({ page }) => {
    const email = process.env[emailKey], password = process.env[passwordKey];
    test.skip(!email || !password, 'Configure dedicated GitHub Actions secrets');
    await page.goto('/');
    await page.evaluate(() => { document.getElementById('authModal').classList.add('open'); });
    await page.locator('#authEmail').fill(email);
    await page.locator('#authPassword').fill(password);
    // Do not bypass or forge Cloudflare Turnstile. A real challenge may block CI.
    await expect(page.locator('#authSubmit')).toBeVisible();
    await page.waitForTimeout(3000);
    const captchaReady = await page.evaluate(() => typeof signupCaptchaToken !== 'undefined' && !!signupCaptchaToken);
    test.skip(!captchaReady, 'Production Turnstile did not automatically verify this test browser; staging test keys are required');
    await page.locator('#authSubmit').click();
    await expect(page.locator('#authModal')).not.toHaveClass(/open/, { timeout: 20000 });
  });
}
