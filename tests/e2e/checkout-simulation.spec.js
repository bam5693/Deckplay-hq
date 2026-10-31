const { test, expect } = require('@playwright/test');

test('buyer can complete a private checkout preview without any transaction', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => {window.deckplaySimulatedItem={title:'Test Card',price:40};document.getElementById('checkoutPreviewModal').classList.add('open')});
 await expect(page.getByText('Checkout simulator')).toBeVisible();
 await expect(page.locator('#simulationStepOne input')).toHaveCount(0);
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationStepTwo')).toBeVisible();
 await page.locator('#previewShippingMethod').selectOption('priority');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationSummary')).toContainText('Test Card ($40.00)');
 await expect(page.locator('#simulationSummary')).toContainText('Shipping rate: not available');
 await expect(page.locator('#simulationSummary')).toContainText('Total payable: unavailable');
 await page.locator('#simulationFinish').click();
 await expect(page.locator('#simulationStepDone')).toBeVisible();
 await expect(page.locator('#simulationStepDone')).toContainText('No charge, order, shipping label, or message was created.');
 await expect(page.locator('#simulationTracking')).toContainText('Delivered — preview');
 await expect(page.locator('#simulationStepDone')).toContainText('DEMO-ONLY');
});

test('preview never requests personal delivery details or a card number', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => document.getElementById('checkoutPreviewModal').classList.add('open'));
 await expect(page.locator('#simulationStepOne')).toContainText('fictional');
 await expect(page.locator('#simulationCheckoutForm input')).toHaveCount(0);
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationStepTwo')).toBeVisible();
 await expect(page.locator('#previewPaymentMethod')).toHaveValue('demo');
 await expect(page.locator('#simulationStepTwo')).toContainText('Never enter payment details');
});

test('buyer can change illustrative shipping and restart without an order', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => {window.deckplaySimulatedItem={title:'Sample Collectible',price:20};document.getElementById('checkoutPreviewModal').classList.add('open')});
 await page.locator('#simulationNext').click();
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationSummary')).toContainText('Economy envelope (untracked)');
 await page.locator('#simulationBack').click();
 await page.locator('#previewShippingMethod').selectOption('priority');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationSummary')).toContainText('Priority parcel');
 await expect(page.locator('#simulationSummary')).not.toContainText('Demo total:');
 await page.locator('#simulationFinish').click();
 await page.locator('#simulationReset').click();
 await expect(page.locator('#simulationStepOne')).toBeVisible();
 await expect(page.locator('#previewShippingMethod')).toHaveValue('envelope');
 await expect(page.locator('#simulationStepDone')).toBeHidden();
});
