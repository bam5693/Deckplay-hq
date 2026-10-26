const { test, expect } = require('@playwright/test');

// Read-only smoke checks: safe to repeat, no accounts, purchases, or labels.
test('staging isolation, essential navigation, and no production database calls', async ({ page }) => {
  const expected = new URL(process.env.DECKPLAY_STAGING_URL);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  expect(new URL(page.url()).origin).toBe(expected.origin);
  await expect(page).toHaveTitle(/DeckPlay/i);
  await expect(page.locator('#search')).toBeVisible();
  await expect(page.locator('#market')).toBeAttached();
  await expect(page.locator('#wantedNav')).toBeAttached();
  await expect(page.locator('#inboxPage')).toBeAttached();
  await expect(page.locator('#collectorPage')).toBeAttached();
  await page.waitForLoadState('networkidle').catch(() => {});
  const productionCalls = requests.filter(url => /yffruutknztvdyioovmp\\.supabase\\.co/i.test(url));
  expect(productionCalls, 'Staging must not contact the production database').toEqual([]);
  const documentText = await page.locator('html').evaluate(el => el.outerHTML);
  expect(documentText).not.toContain('yffruutknztvdyioovmp');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('mobile layout exposes navigation without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#mobileDock')).toBeAttached();
  await expect(page.locator('#search')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'Unexpected horizontal scrolling on mobile').toBeLessThanOrEqual(2);
});
