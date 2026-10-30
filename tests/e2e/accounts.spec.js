const { test, expect } = require('@playwright/test');
const accounts = [
  ['seller', 'DECKPLAY_TEST_SELLER_EMAIL', 'DECKPLAY_TEST_SELLER_PASSWORD'],
  ['buyer', 'DECKPLAY_TEST_BUYER_EMAIL', 'DECKPLAY_TEST_BUYER_PASSWORD']
];
for (const [role, emailKey, passwordKey] of accounts) {
  test(role + ' can sign in through the normal protected login', async ({ page }) => {
    const email = process.env[emailKey], password = process.env[passwordKey];
    if (process.env.DECKPLAY_STAGING_URL && (!email || !password)) throw new Error('Staging credentials missing');
    test.skip(!email || !password, 'Configure dedicated GitHub Actions secrets');
    await page.goto('/',{waitUntil:'domcontentloaded',timeout:30000});
    if (process.env.DECKPLAY_STAGING_URL) {
      const actual = new URL(page.url());
      const expected = new URL(process.env.DECKPLAY_STAGING_URL);
      expect(actual.origin, 'Staging login must never redirect to production').toBe(expected.origin);
    }
    const opener=await page.locator('#accountButton').isVisible()?page.locator('#accountButton'):page.locator('[data-dock="profile"]');await opener.click();
    await page.locator('#authEmail').fill(email);
    await page.locator('#authPassword').fill(password);
    // Do not bypass or forge Cloudflare Turnstile. A real challenge may block CI.
    await expect(page.locator('#authSubmit')).toBeVisible();
    await page.waitForFunction(()=>typeof signupCaptchaToken!=='undefined'&&!!signupCaptchaToken,{},{timeout:20000});
    const captchaReady = await page.evaluate(() => typeof signupCaptchaToken !== 'undefined' && !!signupCaptchaToken);
    if (process.env.DECKPLAY_STAGING_URL && !captchaReady) throw new Error('STAGING NOT VERIFIED: Turnstile challenge did not complete. Configure approved staging test keys.');
    test.skip(!captchaReady, 'Production Turnstile did not automatically verify this test browser; staging test keys are required');
    await page.locator('#authSubmit').click();
    await expect(page.locator('#authModal')).not.toHaveClass(/open/, { timeout: 20000 });
    await expect.poll(()=>page.evaluate(()=>currentUser?.email)).toBe(email);
  });
}
