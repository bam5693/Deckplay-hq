const {test,expect}=require('@playwright/test');
async function openFixture(page,item){
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/');
 await page.evaluate(value=>showDetails(value),item);
}
test('Tanner: sports-card listing photo controls, USD price and keyboard zoom work',async({page})=>{
 const photos=['https://example.test/front.jpg','https://example.test/back.jpg','https://example.test/grade.jpg'];
 await openFixture(page,{n:'Synthetic graded sports card',p:24.5,c:'Sports Cards',cond:'Graded',imageUrls:photos});
 await expect(page.locator('.detail-price')).toHaveText('$24.50');
 await expect(page.locator('#detailPhotoCounter')).toHaveText('Photo 1 of 3');
 await expect(page.locator('[data-detail-photo="0"]')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Next listing photo'}).click();
 await expect(page.locator('#detailGalleryMain')).toHaveAttribute('src',photos[1]);
 await expect(page.locator('#detailGalleryMain')).toHaveAttribute('alt','Synthetic graded sports card — photo 2 of 3');
 await expect(page.locator('[data-detail-photo="1"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-detail-photo="0"]')).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'Previous listing photo'}).click();
 await expect(page.locator('#detailPhotoCounter')).toHaveText('Photo 1 of 3');
 await page.locator('[data-detail-photo="2"]').click();
 await expect(page.locator('#detailPhotoCounter')).toHaveText('Photo 3 of 3');
 await page.getByRole('button',{name:'Next listing photo'}).click();
 await expect(page.locator('#detailPhotoCounter')).toHaveText('Photo 1 of 3');
 await page.getByRole('button',{name:'Enlarge listing photo'}).click();
 await expect(page.locator('#detailPhotoZoom')).toBeVisible();
 await expect(page.locator('#detailPhotoZoom button')).toBeFocused();
 await page.keyboard.press('Tab');
 await expect(page.locator('#detailPhotoZoom button')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.locator('#detailPhotoZoom')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Enlarge listing photo'})).toBeFocused();
 await expect(page.locator('#detailModal')).toHaveClass(/open/);
 await page.getByRole('button',{name:'Enlarge listing photo'}).click();
 await page.evaluate(()=>closeModal('detailModal'));
 await expect(page.locator('#detailPhotoZoom')).toHaveCount(0);
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
});
test('Jayden: TCG and game listing details handle single or missing photos without navigation clutter',async({page})=>{
 await openFixture(page,{n:'Synthetic TCG deck',p:38,c:'Trading Cards',imageUrls:['https://example.test/deck.jpg']});
 await expect(page.locator('.detail-price')).toHaveText('$38.00');
 await expect(page.locator('[data-detail-step]')).toHaveCount(0);
 await expect(page.locator('#detailGalleryMain')).toHaveAttribute('alt','Synthetic TCG deck — photo 1 of 1');
 await page.evaluate(()=>showDetails({n:'Synthetic video game',p:12.75,c:'Video Games',imageUrls:[]}));
 await expect(page.locator('.detail-price')).toHaveText('$12.75');
 await expect(page.locator('.detail-photo-placeholder')).toBeVisible();
 await expect(page.locator('[data-detail-photo]')).toHaveCount(0);
});
