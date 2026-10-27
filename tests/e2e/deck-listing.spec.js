const {test,expect}=require('@playwright/test');
test('complete deck listing shows deck details and requires a photo',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>document.getElementById('sellModal').classList.add('open'));
 await page.locator('#listingType').selectOption('deck');
 await expect(page.locator('#category')).toHaveValue('trading_cards');
 await expect(page.locator('#deckFields')).toBeVisible();
 await page.locator('#item').fill('STAGING TEST — Complete One Piece deck');
 await page.locator('#deckLeader').fill('Black Yamato');
 await page.locator('#deckCardCount').fill('51');
 await page.locator('#deckList').fill('1x leader Yamato\n4x OP16-097 Yamato\n4x OP16-081 Otama');
 await page.locator('#price').fill('40');
 await expect(page.locator('#deckLeader')).toHaveValue('Black Yamato');
 await expect(page.locator('#deckCardCount')).toHaveValue('51');
 await expect(page.locator('#deckList')).toHaveValue(/OP16-097/);
 await page.locator('#publishButton').click();
 await expect(page.locator('#sellModal')).toHaveClass(/open/);
 await expect(page.locator('#listingPhotoCount')).toContainText('0 of 5');
});
