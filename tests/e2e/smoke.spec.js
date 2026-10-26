const { test, expect } = require('@playwright/test');
test('homepage categories', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-cat="All"]').first()).toBeVisible();
  await expect(page.locator('[data-cat="Trading Cards"]').first()).toBeVisible();
});
test('listing form UI', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.getElementById('sellModal').classList.add('open'));
  await expect(page.locator('#listingAddPhotos')).toBeVisible();
  await expect(page.locator('#listingTakePhoto')).toBeVisible();
  await page.locator('#category').selectOption('trading_cards');
  await expect(page.locator('#cardCondition')).toBeVisible();
  await page.locator('#cardCondition').selectOption('graded');
  await expect(page.locator('#gradingFields')).toBeVisible();
});

test('video games require a platform and never offer graded condition', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => document.getElementById('sellModal').classList.add('open'));
 await page.locator('#listingType').selectOption('game');
 await expect(page.locator('#gamePlatformFields')).toBeVisible();
 await expect(page.locator('#gamePlatform')).toHaveJSProperty('required', true);
 await page.locator('#gamePlatform').selectOption({label:'Nintendo Switch 2'});
 await expect(page.locator('#condition option[value="graded"]')).toHaveCount(0);
});

test('hardware listings let sellers choose console, controller or accessory', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => document.getElementById('sellModal').classList.add('open'));
 await page.locator('#listingType').selectOption('console');
 await expect(page.locator('#consoleItemTypeWrap')).toBeVisible();
 await page.locator('#consoleItemType').selectOption('Controller');
 await expect(page.locator('#consoleItemType')).toHaveValue('Controller');
 await expect(page.locator('#consoleFields')).toBeVisible();
 await expect(page.locator('#condition option[value="graded"]')).toHaveCount(0);
});
