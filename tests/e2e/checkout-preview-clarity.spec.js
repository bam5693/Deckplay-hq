const {test,expect}=require('@playwright/test');

async function openPreview(page,item){
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/');
 await page.evaluate(value=>showDetails(value),item);
 await page.getByRole('button',{name:'Preview checkout · No purchase'}).click();
 await expect(page.locator('#checkoutPreviewModal')).toHaveClass(/open/);
}

test('Tanner: sports-card preview never asks for a real address or invents a payable total',async({page})=>{
 await openPreview(page,{n:'Synthetic sports single',p:2.5,c:'Sports Cards',imageUrls:[]});
 await expect(page.locator('#simulationStepOne')).toContainText('No real name, address or ZIP code');
 await expect(page.locator('#simulationStepOne input')).toHaveCount(0);
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationStepTwo')).toBeVisible();
 await expect(page.locator('#previewShippingMethod option')).toHaveCount(3);
 await page.locator('#previewShippingMethod').selectOption('envelope');
 await page.locator('#simulationNext').click();
 const summary=page.locator('#simulationSummary');
 await expect(summary).toContainText('Synthetic sports single ($2.50)');
 await expect(summary).toContainText('Economy envelope (untracked)');
 await expect(summary).toContainText('Shipping rate: not available');
 await expect(summary).toContainText('Platform fee: not configured');
 await expect(summary).toContainText('Taxes: not calculated');
 await expect(summary).toContainText('Total payable: unavailable');
 await expect(summary).not.toContainText('Demo total:');
 await expect(summary).not.toContainText('sample $5.00');
 await page.locator('#simulationFinish').click();
 await expect(page.locator('#simulationStepDone')).toContainText('No charge, order, shipping label, or message was created');
});

test('Jayden: TCG and game checkout previews distinguish tracked and priority without payment fields',async({page})=>{
 await openPreview(page,{n:'Synthetic TCG deck',p:38,c:'Trading Cards',imageUrls:[]});
 await page.locator('#simulationNext').click();
 await page.locator('#previewShippingMethod').selectOption('tracked');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationSummary')).toContainText('Tracked parcel');
 await expect(page.locator('#simulationSummary')).toContainText('($38.00)');
 await page.locator('#simulationBack').click();
 await page.locator('#previewShippingMethod').selectOption('priority');
 await page.locator('#simulationNext').click();
 await expect(page.locator('#simulationSummary')).toContainText('Priority parcel');
 await expect(page.locator('#simulationCheckoutForm input')).toHaveCount(0);
 await expect(page.locator('#simulationSummary')).not.toContainText('Payment: demo card');
});
