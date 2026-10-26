const {test,expect}=require('@playwright/test');
test('login validation recovers without an unrelated listing-button error',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await page.evaluate(()=>{setAuthMode('signin');openModal('authModal');signupCaptchaToken='';});
 await page.locator('#authEmail').fill('invalid@deckplay.test');await page.locator('#authPassword').fill('Wrong-password1!');
 await page.locator('#authSubmit').click();
 await expect(page.locator('#authStatus')).toContainText('security check');
 await expect(page.locator('#authForm')).not.toHaveClass(/busy/);
 await expect(page.locator('#authSubmit')).toBeEnabled();
 expect(errors).toEqual([]);
});
test('built page is isolated and scripts initialize all late handlers',async({page})=>{
 const errors=[],production=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('yffruutknztvdyioovmp'))production.push(r.url())});
 await page.goto('/');
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow');
 expect(await page.evaluate(()=>!!supabaseClient)).toBe(true);
 expect(errors).toEqual([]);expect(production).toEqual([]);
});
test('dialogs contain keyboard focus and restore it when closed',async({page})=>{
 await page.goto('/');const opener=await page.locator('#accountButton').isVisible()?page.locator('#accountButton'):page.locator('[data-dock="profile"]');await opener.click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 const close=page.locator('#authModal button.close');await close.focus();await page.keyboard.press('Shift+Tab');
 expect(await page.locator('#authModal').evaluate(el=>el.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('#authModal')).not.toHaveClass(/open/);
 await expect(opener).toBeFocused();
});
test('mobile and desktop home categories navigate to the marketplace without overflow',async({page})=>{
 await page.goto('/');await page.locator('[data-cat="Trading Cards"]').first().click();
 await expect(page.locator('#market')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});
test('a late Turnstile ready callback initializes the widget',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.goto('/');
 const widget=await page.evaluate(()=>{window.turnstile={render:()=>99,reset:()=>{}};window.deckplayTurnstileReady();return signupCaptchaWidget});
 expect(widget).toBe(99);
});
