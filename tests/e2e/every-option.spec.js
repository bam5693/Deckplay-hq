const { test, expect } = require('@playwright/test');

// Exhaustively exercise each option without posting anything to the production database.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.getElementById('sellModal').classList.add('open'));
});

const controls = [
  ['listingType', null],
  ['category', null],
  ['tcgGame', 'trading_cards'],
  ['cardCondition', 'trading_cards'],
  ['collectibleSubcategory', 'collectibles'],
  ['gamePlatform', 'video_games'],
  ['consoleBrand', 'consoles']
];
for (const [id, category] of controls) {
  test('every '+id+' choice remains selectable and keeps the form usable', async ({ page }) => {
    if (category) await page.locator('#category').selectOption(category);
    const select = page.locator('#'+id);
    const options = await select.locator('option').evaluateAll(nodes =>
      nodes.filter(node => !node.disabled).map(node => node.value));
    expect(options.length).toBeGreaterThan(1);
    for (const value of options) {
      await select.selectOption(value);
      await expect(select).toHaveValue(value);
      await expect(page.locator('#sellModal')).toBeVisible();
      await expect(page.locator('#publishButton')).toBeVisible();
      const errors = await page.locator('#sellModal .error:visible').count();
      expect(errors).toBe(0);
    }
  });
}

test('collectibles categories never reveal card grading controls', async ({ page }) => {
  await page.locator('#category').selectOption('collectibles');
  const options = await page.locator('#collectibleSubcategory option').evaluateAll(nodes => nodes.map(x=>x.value));
  for (const value of options) {
    await page.locator('#collectibleSubcategory').selectOption(value);
    await expect(page.locator('#cardConditionWrap')).toBeHidden();
    await expect(page.locator('#gradingFields')).toBeHidden();
  }
});

test('repeated category switching does not leave stale specialist fields', async ({ page }) => {
  for (const category of ['trading_cards','video_games','consoles','collectibles','other','trading_cards']) {
    await page.locator('#category').selectOption(category);
    if(category==='trading_cards') await expect(page.locator('#cardConditionWrap')).toBeVisible(); else await expect(page.locator('#cardConditionWrap')).toBeHidden();
  }
});
