const {test,expect}=require('@playwright/test');
// Exactly one inexpensive test. No account sign-in, fixtures, uploads, or state changes.
test('private staging denies anonymous access and accepts configured browser Basic Auth',async({page})=>{
 const origin=process.env.DECKPLAY_STAGING_URL;
 const anonymous=await fetch(origin,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(10000)});
 expect(anonymous.status,'Anonymous staging access must remain denied').toBe(401);
 expect(anonymous.headers.get('www-authenticate')).toContain('Basic');
 const response=await page.goto('/',{waitUntil:'domcontentloaded',timeout:15000});
 expect(response.status(),'Configured staging Basic Auth was rejected; stop before account tests').toBe(200);
 await expect(page).toHaveTitle(/DeckPlay/);
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
 await expect(page.locator('#search')).toBeVisible();
 console.log('Private gate smoke passed: anonymous HEAD 401, credentialed browser GET 200. No credentials logged.');
});
