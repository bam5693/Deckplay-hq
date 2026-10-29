const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
});
async function recovery(page){await page.evaluate(()=>openModal('passwordRecoveryModal'));await page.locator('#recoveryPassword').fill('New-password1!');await page.locator('#recoveryPasswordConfirm').fill('New-password1!')}
test('recovery rejects mismatched and weak passwords without a service call',async({page})=>{
 await recovery(page);await page.evaluate(()=>{window.recoveryCalls=0;supabaseClient.auth.updateUser=async()=>{recoveryCalls++;return {error:null}}});
 await page.locator('#recoveryPasswordConfirm').fill('Different-password1!');await page.locator('#passwordRecoveryForm button').click();
 await expect(page.locator('#recoveryPasswordStatus')).toContainText('do not match');
 await page.locator('#recoveryPassword').fill('weakpassword');await page.locator('#recoveryPasswordConfirm').fill('weakpassword');await page.locator('#passwordRecoveryForm button').click();
 await expect(page.locator('#recoveryPasswordStatus')).toContainText('uppercase');expect(await page.evaluate(()=>recoveryCalls)).toBe(0);
});
test('recovery service exception preserves fields and allows retry',async({page})=>{
 await recovery(page);await page.evaluate(()=>{supabaseClient.auth.updateUser=async()=>{throw Error('Connection interrupted')}});
 await page.locator('#passwordRecoveryForm button').click();await expect(page.locator('#recoveryPasswordStatus')).toContainText('Connection interrupted');
 await expect(page.locator('#passwordRecoveryForm button')).toBeEnabled();await expect(page.locator('#recoveryPassword')).toHaveValue('New-password1!');
 await page.evaluate(()=>{supabaseClient.auth.updateUser=async()=>({error:{message:'Recovery session expired'}})});
 await page.locator('#passwordRecoveryForm button').click();await expect(page.locator('#recoveryPasswordStatus')).toContainText('expired');await expect(page.locator('#passwordRecoveryModal')).toHaveClass(/open/);
});
test('recovery submits once and clears password fields after success',async({page})=>{
 await recovery(page);await page.evaluate(()=>{window.recoveryCalls=0;supabaseClient.auth.updateUser=async()=>{recoveryCalls++;return await new Promise(resolve=>window.finishRecovery=resolve)}});
 await page.locator('#recoveryPasswordConfirm').press('Enter');await page.locator('#recoveryPasswordConfirm').press('Enter');expect(await page.evaluate(()=>recoveryCalls)).toBe(1);
 await page.evaluate(()=>finishRecovery({data:{user:{id:'fixture'}},error:null}));await expect(page.locator('#passwordRecoveryModal')).not.toHaveClass(/open/);await expect(page.locator('#recoveryPassword')).toHaveValue('');
});
test('forgot password requires email and security verification before requesting reset',async({page})=>{
 await page.evaluate(()=>{setAuthMode('signin');openModal('authModal');window.resetCalls=0;supabaseClient.auth.resetPasswordForEmail=async()=>{resetCalls++;return {error:null}}});
 await page.locator('#authForgotPassword').click();await expect(page.locator('#authStatus')).toContainText('valid email address');expect(await page.evaluate(()=>resetCalls)).toBe(0);
 await page.locator('#authEmail').fill('fixture@deckplay.test');await page.locator('#authForgotPassword').click();await expect(page.locator('#authStatus')).toContainText('security check');expect(await page.evaluate(()=>resetCalls)).toBe(0);
});
test('forgot password sends staging redirect and captcha, then recovers from a network exception',async({page})=>{
 await page.evaluate(()=>{setAuthMode('signin');openModal('authModal');signupCaptchaToken='fixture-security-token';supabaseClient.auth.resetPasswordForEmail=async(email,options)=>{window.resetPayload={email,options};throw Error('Reset connection failed')}});
 await page.locator('#authEmail').fill('fixture@deckplay.test');await page.locator('#authForgotPassword').click();await expect(page.locator('#authStatus')).toContainText('Reset connection failed');await expect(page.locator('#authForgotPassword')).toBeEnabled();await expect(page.locator('#authSubmit')).toBeEnabled();
 expect(await page.evaluate(()=>resetPayload)).toEqual({email:'fixture@deckplay.test',options:{redirectTo:'http://127.0.0.1:8765',captchaToken:'fixture-security-token'}});
 await page.evaluate(()=>{signupCaptchaToken='fixture-retry-token';supabaseClient.auth.resetPasswordForEmail=async()=>({error:null})});await page.locator('#authForgotPassword').click();await expect(page.locator('#authStatus')).toContainText('If an account');
});
test('settings reset releases the button after a thrown service error',async({page})=>{
 await page.evaluate(()=>{currentUser={id:'fixture',email:'fixture@deckplay.test'};openModal('settingsModal');supabaseClient.auth.resetPasswordForEmail=async()=>{throw Error('Settings network error')}});
 await page.locator('#settingsResetPassword').click();await expect(page.locator('#settingsSecurityStatus')).toContainText('Settings network error');await expect(page.locator('#settingsResetPassword')).toBeEnabled();
});
test('rapid sign-in submission makes one authentication request',async({page})=>{
 await page.evaluate(()=>{setAuthMode('signin');openModal('authModal');signupCaptchaToken='fixture-security-token';window.loginCalls=0;supabaseClient.auth.signInWithPassword=async()=>{loginCalls++;return await new Promise(resolve=>window.finishLogin=resolve)}});
 await page.locator('#authEmail').fill('fixture@deckplay.test');await page.locator('#authPassword').fill('Fixture-password1!');
 await page.locator('#authPassword').press('Enter');await page.locator('#authPassword').press('Enter');expect(await page.evaluate(()=>loginCalls)).toBe(1);
 await page.evaluate(()=>finishLogin({error:{message:'Invalid login credentials'}}));await expect(page.locator('#authStatus')).toContainText('not recognized');await expect(page.locator('#authForm')).not.toHaveClass(/busy/);
});
