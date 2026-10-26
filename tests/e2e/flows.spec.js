const { test, expect } = require('@playwright/test');
test('offer form validates amounts without sending an offer', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => document.getElementById('priceOfferModal').classList.add('open'));
 const amount=page.locator('#priceOfferAmount');
 await expect(amount).toBeVisible();
 await amount.fill('-1');
 await expect(amount).not.toBeValid();
 await amount.fill('25.00');
 await expect(amount).toBeValid();
});
test('checkout is only a preview, not a live payment form', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => document.getElementById('checkoutPreviewModal').classList.add('open'));
 await expect(page.locator('#checkoutPreviewModal')).toBeVisible();
 await expect(page.locator('#checkoutPreviewModal').getByText(/coming soon|not enabled|preview/i).first()).toBeVisible();
});
test('inbox page exists for private conversations', async ({ page }) => {
 await page.goto('/');
 await expect(page.locator('#inboxPage')).toHaveCount(1);
});
