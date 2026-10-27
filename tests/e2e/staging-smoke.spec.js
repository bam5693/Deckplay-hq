const { test, expect } = require('@playwright/test');

// Read-only smoke checks: safe to repeat, no accounts, purchases, or labels.
test('staging isolation, essential navigation, and no production database calls', async ({ page }) => {
  const expected = new URL(process.env.DECKPLAY_STAGING_URL);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/',{waitUntil:'domcontentloaded',timeout:30000});
  expect(new URL(page.url()).origin).toBe(expected.origin);
  await expect(page).toHaveTitle(/DeckPlay/i);
  await expect(page.locator('#search')).toBeVisible();
  await expect(page.locator('#market')).toBeAttached();
  await expect(page.locator('#wantedNav')).toBeAttached();
  await expect(page.locator('#inboxPage')).toBeAttached();
  await expect(page.locator('#collectorPage')).toBeAttached();
  await page.waitForLoadState('networkidle',{timeout:3000}).catch(() => {});
  const productionCalls = requests.filter(url => { try { return new URL(url).hostname === 'yffruutknztvdyioovmp.supabase.co'; } catch { return false; } });
  expect(productionCalls, 'Staging must not contact the production database').toEqual([]);
  const documentText = await page.locator('html').evaluate(el => el.outerHTML);
  expect(documentText).not.toContain('yffruutknztvdyioovmp');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('mobile layout exposes navigation without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/',{waitUntil:'domcontentloaded',timeout:30000});
  await expect(page.locator('#mobileDock')).toBeAttached();
  await expect(page.locator('#search')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'Unexpected horizontal scrolling on mobile').toBeLessThanOrEqual(2);
});

test('staging login UI does not expose production auth endpoints', async ({ page }) => {
  const production = [];
  page.on('request', request => {
    try {
      if (new URL(request.url()).hostname === 'yffruutknztvdyioovmp.supabase.co') production.push(request.url());
    } catch {}
  });
  await page.goto('/',{waitUntil:'domcontentloaded',timeout:30000});
  await expect(page.locator('#authModal')).toBeAttached();
  await expect(page.locator('#authEmail')).toBeAttached();
  const html = await page.content();
  expect(html).toContain('prrrzeelltmyugssqnzk.supabase.co');
  expect(html).not.toContain('yffruutknztvdyioovmp.supabase.co');
  expect(production).toEqual([]);
});

test('deployed homepage matches the staging branch being tested',async({request})=>{
  // Detect a stale deployment before reporting branch changes as browser-verified.
  const {execFileSync}=require('node:child_process');
  const {readFileSync}=require('node:fs');
  const {createHash}=require('node:crypto');
  execFileSync(process.execPath,['scripts/build-staging.cjs'],{env:{...process.env,DECKPLAY_STAGING_SUPABASE_URL:'https://prrrzeelltmyugssqnzk.supabase.co',DECKPLAY_STAGING_SUPABASE_KEY:'sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh'},stdio:'pipe'});
  const response=await request.get('/');expect(response.status()).toBe(200);
  const digest=value=>createHash('sha256').update(value).digest('hex');
  expect(digest(await response.text()),'Deploy the current staging homepage before certifying its UI').toBe(digest(readFileSync('dist-staging/index.html','utf8')));
});
