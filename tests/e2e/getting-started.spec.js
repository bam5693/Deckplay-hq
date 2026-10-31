const {test,expect}=require('@playwright/test');

// Read-only local buyer/seller onboarding checks; no real Supabase accounts or API writes.
test.beforeEach(async({page})=>{
  await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
  await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',route=>route.fulfill({json:[]}));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('Tanner and Jayden: first-time buyer guide explains all-category discovery, saving and negotiation',async({page})=>{
  const guide=page.locator('#gettingStarted');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('trading cards');
  await expect(guide).toContainText('sports memorabilia');
  await expect(guide).toContainText('video games');
  await expect(guide).toContainText('consoles');
  await expect(guide).toContainText('controllers');
  await expect(guide).toContainText('accessories');
  await expect(guide).toContainText('other collectibles');
  await expect(page.locator('#guideBuyer')).toContainText('Saved items');
  await expect(page.locator('#guideBuyer')).toContainText('message the collector');
  await expect(page.locator('#guideBuyer')).toContainText('price offer');
  await expect(guide).toContainText('Checkout, payment, payouts, purchased shipping and shipping labels are disabled');
  await page.getByRole('button',{name:'Explore marketplace →'}).click();
  await expect(page.locator('body')).toHaveClass(/deckplay-market/);
  await expect(guide).toBeHidden();
  await expect(page.locator('#market')).toBeVisible();
});

test('Kyle: mobile and desktop seller guide has keyboard-operable tabs and real sign-in gate',async({page})=>{
  const buyer=page.locator('#guideBuyerTab'),seller=page.locator('#guideSellerTab');
  await buyer.focus();
  await page.keyboard.press('ArrowRight');
  await expect(seller).toHaveAttribute('aria-selected','true');
  await expect(seller).toBeFocused();
  await expect(page.locator('#guideBuyer')).toBeHidden();
  await expect(page.locator('#guideSeller')).toBeVisible();
  await expect(page.locator('#guideSeller')).toContainText('correct category');
  await expect(page.locator('#guideSeller')).toContainText('real photos');
  await expect(page.locator('#guideSeller')).toContainText('Inbox');
  await page.locator('#guideSeller').getByRole('button',{name:'Create a listing →'}).click();
  await expect(page.locator('#authModal')).toHaveClass(/open/);
  await expect(page.locator('#sellModal')).not.toHaveClass(/open/);
});

test('Charles: guidance never asks for payment details; footer can return from Marketplace to guide',async({page})=>{
  await page.getByRole('button',{name:'Explore marketplace →'}).click();
  await page.getByRole('button',{name:'Getting started: buyer and seller guide'}).click();
  await expect(page.locator('body')).toHaveClass(/deckplay-home/);
  await expect(page.locator('#gettingStarted')).toBeVisible();
  await expect(page.locator('#gettingStarted input')).toHaveCount(0);
  await expect(page.locator('#gettingStarted form')).toHaveCount(0);
  await expect(page.locator('#guideBuyerTab')).toHaveAttribute('aria-selected','true');
});

test('T5.4: keyboard users land on visible Marketplace content after leaving the guide',async({page})=>{
  await page.getByRole('button',{name:'Explore marketplace →'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/deckplay-market/);
  await expect(page.locator('#market > h2')).toBeFocused();
  await expect(page.locator('#gettingStarted')).toBeHidden();
  // Tab moves forward through marketplace controls, not hidden guide controls.
  await page.keyboard.press('Tab');
  await expect(page.locator('#marketFilterToggle')).toBeFocused();
});

test('T5.4: footer guide shortcut returns keyboard focus to the visible guide heading',async({page})=>{
  await page.getByRole('button',{name:'Explore marketplace →'}).click();
  const footerLink=page.getByRole('button',{name:'Getting started: buyer and seller guide'});
  await footerLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/deckplay-home/);
  await expect(page.locator('#guideTitle')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#guideBuyerTab')).toBeFocused();
});

test('T5.4: reduced-motion preference avoids animated guide navigation',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{
    window.__guideScrolls=[];
    window.__topScrolls=[];
    window.scrollTo=function(options){window.__topScrolls.push(options?.behavior)};
    Element.prototype.scrollIntoView=function(options) {
      window.__guideScrolls.push({id:this.id,behavior:options?.behavior});
    };
  });
  await page.getByRole('button',{name:'Explore marketplace →'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__guideScrolls.some(item=>item.id==='market'&&item.behavior==='auto'))).toBe(true);
  await page.getByRole('button',{name:'Getting started: buyer and seller guide'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__guideScrolls.some(item=>item.id==='gettingStarted'&&item.behavior==='auto'))).toBe(true);
  expect(await page.evaluate(()=>window.__topScrolls)).toEqual(expect.arrayContaining(['auto']));
  expect(await page.evaluate(()=>window.__topScrolls.every(behavior=>behavior==='auto'))).toBe(true);
});
