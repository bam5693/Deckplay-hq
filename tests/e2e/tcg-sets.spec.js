const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>document.getElementById('sellModal').classList.add('open'));});
test('Pokemon sellers can select era, set and card number',async({page})=>{
 await page.locator('#tcgGame').selectOption('pokemon');
 await expect(page.locator('#tcgSetFields')).toBeVisible();
 await page.locator('#tcgEra').selectOption('Sun & Moon');
 await page.locator('#tcgSet').selectOption('Hidden Fates');
 await page.locator('#tcgCardNumber').fill('SV49/SV94');
 await expect(page.locator('#tcgSet')).toHaveValue('Hidden Fates');
 await expect(page.locator('#tcgCardNumber')).toHaveValue('SV49/SV94');
});
test('One Piece sellers can select OP and PRB sets',async({page})=>{
 await page.locator('#tcgGame').selectOption('one_piece');
 await page.locator('#tcgEra').selectOption('Main booster sets');
 await page.locator('#tcgSet').selectOption('OP-05 Awakening of the New Era');
 await page.locator('#tcgCardNumber').fill('OP05-119');
 await page.locator('#tcgVariant').selectOption('Manga Rare');
 await expect(page.locator('#tcgSet')).toHaveValue('OP-05 Awakening of the New Era');
 await page.locator('#tcgEra').selectOption('Premium boosters');
 await expect(page.locator('#tcgSet')).toHaveValue('');
 await page.locator('#tcgSet').selectOption('PRB-02 The Best Vol. 2');
 await expect(page.locator('#tcgSet')).toHaveValue('PRB-02 The Best Vol. 2');
});
test('set metadata is optional and hidden on video game listings',async({page})=>{
 await page.locator('#tcgGame').selectOption('pokemon');
 await expect(page.locator('#tcgSet')).not.toHaveAttribute('required','');
 await page.locator('#listingType').selectOption('game');
 await expect(page.locator('#tcgSetFields')).toBeHidden();
 await expect(page.locator('#gamePlatformFields')).toBeVisible();
});
