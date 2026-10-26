const { test, expect } = require('@playwright/test');
test('homepage categories', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-cat="All"]').first()).toBeVisible();
  await expect(page.locator('[data-cat="Collectibles"]').first()).toBeVisible();
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
