const { test, expect } = require('@playwright/test');
test('buyer can complete checkout simulation without a transaction', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => document.getElementById('checkoutPreviewModal').classList.add('open'));
 await expect(page.getByText('Checkout simulator')).toBeVisible();
 await page.evaluate(() => { window.deckplaySimulatedItem={title:'Test Card',price:40}; });
 await page.locator('#simulationRecipient').fill('Test Buyer');
 await page.locator('#simulationAddress').fill('123 Example Street');
 await page.locator('#simulationCity').fill('Test City');
 await page.locator('#simulationState').fill('AR');
 await page.locator('#simulationZip').fill('72000');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationStepTwo')).toBeVisible();
 await page.locator('#previewShippingMethod').selectOption('priority');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationSummary')).toContainText('Test Card');
 await expect(page.locator('#simulationSummary')).toContainText('$49.00');
 await expect(page.locator('#simulationSummary')).toContainText('Nothing is charged');
 await page.locator('#simulationFinish').click();
 await expect(page.locator('#simulationStepDone')).toBeVisible();
 await expect(page.locator('#simulationStepDone')).toContainText('No charge, order, shipping label, or message was created.');
 await expect(page.locator('#simulationTracking')).toContainText('Delivered — preview');
 await expect(page.locator('#simulationStepDone')).toContainText('DEMO-ONLY');
});

test('checkout requires valid address and ZIP before continuing', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => document.getElementById('checkoutPreviewModal').classList.add('open'));
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationStepOne')).toBeVisible();
 await page.locator('#simulationRecipient').fill('Demo Buyer');
 await page.locator('#simulationAddress').fill('123 Test Road');
 await page.locator('#simulationCity').fill('Example');
 await page.locator('#simulationState').fill('AR');
 await page.locator('#simulationZip').fill('bad zip');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationStepOne')).toBeVisible();
 await page.locator('#simulationZip').fill('72000');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationStepTwo')).toBeVisible();
});

test('buyer can go back, change shipping, and restart demo without an order', async ({ page }) => {
 await page.goto('/');
 await page.evaluate(() => { window.deckplaySimulatedItem={title:'Sample Collectible',price:20};document.getElementById('checkoutPreviewModal').classList.add('open'); });
 for (const [id,value] of Object.entries({simulationRecipient:'Demo',simulationAddress:'123 Test Rd',simulationCity:'Sampletown',simulationState:'AR',simulationZip:'72000'})) await page.locator('#'+id).fill(value);
 await page.locator('#simulationNext').click();
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationSummary')).toContainText('$25.00');
 await page.locator('#simulationBack').click();
 await page.locator('#previewShippingMethod').selectOption('priority');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationSummary')).toContainText('$29.00');
 await page.locator('#simulationFinish').click();
 await page.locator('#simulationReset').click();
 await expect(page.locator('#simulationStepOne')).toBeVisible();
 await expect(page.locator('#simulationRecipient')).toHaveValue('');
 await expect(page.locator('#simulationStepDone')).toBeHidden();
});
