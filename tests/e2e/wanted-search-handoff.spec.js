const {test,expect}=require('@playwright/test');

// Isolated browser fixtures: no live Wanted posts or inventory writes.
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');
 await page.waitForLoadState('networkidle');
});

test('empty marketplace search offers Wanted handoff, but unsigned buyers must sign in',async({page})=>{
 await page.locator('#search').fill('Charizard VMAX');
 const action=page.locator('#grid [data-wanted-from-search]');
 await expect(action).toBeVisible();
 await action.click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 await expect(page.locator('#wantedModal')).not.toHaveClass(/open/);
 await expect(page.locator('#search')).toHaveValue('Charizard VMAX');
});

test('Jayden: signed buyer searches One Piece and opens a prefilled Wanted card request',async({page})=>{
 await page.evaluate(()=>{currentUser={id:'synthetic-jayden'};syncInboxDraftUser()});
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Trading Cards');
 await page.locator('#marketGame').selectOption('one_piece');
 await page.locator('#search').fill('OP05-119 Luffy');
 await page.locator('#grid [data-wanted-from-search]').click();
 await expect(page.locator('#wantedModal')).toHaveClass(/open/);
 await expect(page.locator('#wantedItem')).toHaveValue('OP05-119 Luffy');
 await expect(page.locator('#wantedGame')).toHaveValue('one_piece');
 await expect(page.locator('#wantedCardFields')).toBeVisible();
});

test('Tanner: existing Wanted draft is never overwritten by a later empty search',async({page})=>{
 await page.evaluate(()=>{
  currentUser={id:'synthetic-tanner'};syncInboxDraftUser();
  document.getElementById('wantedItem').value='Saved PSA sports card request';
  document.getElementById('wantedGame').value='sports_cards';
 });
 await page.locator('#search').fill('different sports card');
 await page.locator('#grid [data-wanted-from-search]').click();
 await expect(page.locator('#wantedModal')).toHaveClass(/open/);
 await expect(page.locator('#wantedItem')).toHaveValue('Saved PSA sports card request');
 await expect(page.locator('#wantedGame')).toHaveValue('sports_cards');
});

test('Kyle: video-game no-match forwards its category but never invents card fields',async({page})=>{
 await page.evaluate(()=>{currentUser={id:'synthetic-kyle'};syncInboxDraftUser()});
 await page.locator('#marketFilterToggle').click();
 await page.locator('#marketCategory').selectOption('Video Games');
 await page.locator('#search').fill('Dreamcast');
 await page.locator('#grid [data-wanted-from-search]').click();
 await expect(page.locator('#wantedItem')).toHaveValue('Dreamcast');
 await expect(page.locator('#wantedGame')).toHaveValue('video_games');
 await expect(page.locator('#wantedCardFields')).toBeHidden();
});

test('empty Saved scope and failed listing fetch never solicit unrelated Wanted requests',async({page})=>{
 await page.locator('#search').fill('no matching collectible');
 await page.evaluate(()=>{onlySavedListings=true;render()});
 await expect(page.locator('#grid [data-wanted-from-search]')).toHaveCount(0);
 await page.evaluate(()=>{onlySavedListings=false;listingSource='error';render()});
 await expect(page.locator('#grid [data-wanted-from-search]')).toHaveCount(0);
 await expect(page.locator('#grid [data-retry-marketplace]')).toBeVisible();
});
