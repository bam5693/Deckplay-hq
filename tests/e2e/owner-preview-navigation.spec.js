const {test,expect}=require('@playwright/test');
const OWNER='22222222-2222-4222-8222-222222222222';
test.beforeEach(async({page})=>{
  await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
  await page.route('https://*.supabase.co/rest/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
});
test('public preview includes navigation, profile and onboarding but no unsupported support submission',async({page})=>{
  await expect(page.locator('#accountButton')).toBeVisible();
  await expect(page.locator('#signOutButton')).toHaveCount(1);
  await expect(page.locator('#profileSignOut')).toHaveCount(1);
  await expect(page.locator('#settingsSignOut')).toHaveCount(1);
  await expect(page.locator('#shareOwnProfileLink')).toHaveCount(1);
  await expect(page.locator('#previewOwnPublicProfile')).toHaveCount(1);
  await expect(page.locator('script[src="share-links.js"]')).toHaveCount(1);
  await expect(page.locator('script[src="getting-started.js"]')).toHaveCount(1);
  await expect(page.locator('script[src="support-center.js"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await expect(page.locator('[data-market-search-feedback],[data-listing-discovery-feedback]')).toHaveCount(0);
});
test('owner profile sharing offers a single public collector URL',async({page})=>{
  await page.evaluate(id=>{
    currentUser={id};
    const el=document.getElementById('collectorPage');el.hidden=false;el.style.display='block';
    window.ownerShares=[];
    Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.ownerShares.push(payload)}});
  },OWNER);
  await page.locator('#shareOwnProfileLink').click();
  await expect.poll(()=>page.evaluate(()=>window.ownerShares.length)).toBe(1);
  const url=await page.evaluate(()=>window.ownerShares[0].url);
  expect(new URL(url).searchParams.get('collector')).toBe(OWNER);
  expect(new URL(url).searchParams.size).toBe(1);
});
test('owner public profile preview opens the selected collector, never Inbox',async({page})=>{
  await page.evaluate(id=>{
    currentUser={id};
    const el=document.getElementById('collectorPage');el.hidden=false;el.style.display='block';
    window.previewedCollectors=[];
    window.showPublicProfile=async value=>{window.previewedCollectors.push(value)};
  },OWNER);
  await page.locator('#previewOwnPublicProfile').click();
  await expect.poll(()=>page.evaluate(()=>window.previewedCollectors.length)).toBe(1);
  expect(await page.evaluate(()=>window.previewedCollectors)).toEqual([OWNER]);
});
test('profile sign out remains reachable and invokes safe auth signout',async({page})=>{
  await page.evaluate(id=>{
    currentUser={id};
    const el=document.getElementById('collectorPage');el.hidden=false;el.style.display='block';
    window.previewSignouts=0;
    window.confirm=()=>true;
    supabaseClient.auth.signOut=async()=>{window.previewSignouts++;return {error:null}};
  },OWNER);
  await page.locator('#profileSignOut').click();
  await expect.poll(()=>page.evaluate(()=>window.previewSignouts)).toBe(1);
  await expect(page.locator('#collectorPage')).toBeHidden();
});
