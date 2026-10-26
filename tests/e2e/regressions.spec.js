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
test('inbox loads once and retains the selected conversation during background refresh',async({page})=>{
 await page.goto('/');
 // Isolated deterministic fixture: no network write or real authentication is performed.
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-seller'};window.inboxFixtureReads=0;
  const now=new Date().toISOString();
  supabaseClient.from=table=>{
   if(table==='collector_messages')window.inboxFixtureReads++;
   const data=table==='collector_messages'?[{id:'fixture-message',sender_id:'fixture-buyer',recipient_id:'fixture-seller',body:'Fixture message persists',read_at:now,created_at:now}]:table==='profiles'?[{id:'fixture-buyer',username:'fixture_buyer'}]:[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const name of ['select','order','limit','in','eq','is','update','insert','maybeSingle'])q[name]=()=>q;
   return q;
  };
  await showInboxPage();
 });
 expect(await page.evaluate(()=>window.inboxFixtureReads)).toBe(1);
 await page.locator('[data-conversation-id="fixture-buyer"]').click();
 await expect(page.locator('#conversationThread')).toContainText('Fixture message persists');
 await page.evaluate(()=>loadInbox());
 await expect(page.locator('#conversationThread')).toContainText('Fixture message persists');
 await expect(page.locator('#inboxPage')).toHaveClass(/thread-open/);
});
