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
  await page.getByRole('button',{name:'Create a listing →'}).click();
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
