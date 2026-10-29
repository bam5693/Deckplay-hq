const {test,expect}=require('@playwright/test');
// Deterministic UI contract tests. They simulate service replies and do not certify email delivery.
async function auth(page,mode='signin'){
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.goto('/');
 await page.evaluate(mode=>{setAuthMode(mode);openModal('authModal');signupCaptchaToken='fixture-test-token';},mode);
 await page.locator('#authEmail').fill('fixture@deckplay.test');await page.locator('#authPassword').fill('Fixture-password1!');
}
for(const [message,expected] of [['Invalid login credentials','Email or password not recognized'],['Email not confirmed','confirmation link'],['Network unavailable','Network unavailable']])test('simulated login error recovers: '+message,async({page})=>{
 await auth(page);await page.evaluate(message=>{supabaseClient.auth.signInWithPassword=async()=>({error:{message}})},message);
 await page.locator('#authSubmit').click();await expect(page.locator('#authStatus')).toContainText(expected);await expect(page.locator('#authForm')).not.toHaveClass(/busy/);await expect(page.locator('#authSubmit')).toBeEnabled();
});
test('simulated registration generates username and sends staging confirmation redirect',async({page})=>{
 await auth(page,'signup');await page.evaluate(()=>{
  supabaseClient.from=()=>{const q={select:()=>q,ilike:()=>q,limit:async()=>({data:[],error:null})};return q};
  supabaseClient.auth.signUp=async payload=>{window.signupFixturePayload=payload;return {data:{session:null},error:null}};
 });
 await page.locator('#authSubmit').click();await expect(page.locator('#authStatus')).toContainText('Check your email');await expect(page.locator('#authSubmit')).toBeDisabled();
 const payload=await page.evaluate(()=>window.signupFixturePayload);expect(payload.options.data.username).toMatch(/^[A-Za-z0-9_]{3,20}$/);expect(payload.options.emailRedirectTo).toBe('http://127.0.0.1:8765');
});
test('simulated signup email rate limit explains recovery and releases the form',async({page})=>{
 await auth(page,'signup');await page.evaluate(()=>{supabaseClient.from=()=>{const q={select:()=>q,ilike:()=>q,limit:async()=>({data:[],error:null})};return q};supabaseClient.auth.signUp=async()=>({error:{message:'email rate limit exceeded'}})});
 await page.locator('#authSubmit').click();await expect(page.locator('#authStatus')).toContainText('temporarily rate-limited');await expect(page.locator('#authForm')).not.toHaveClass(/busy/);await expect(page.locator('#authSubmit')).toBeEnabled();
});
test('simulated photo upload failure lets seller retry posting',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{currentUser={id:'fixture-seller'};ensureProfile=async()=>{};uploadPhotos=async()=>{throw Error('Simulated photo failure')};openModal('sellModal')});
 await page.locator('#item').fill('TEST ONLY upload recovery');await page.locator('#tcgGame').selectOption('one_piece');await page.locator('#cardCondition').selectOption('near_mint');await page.locator('#price').fill('25');
 await page.locator('#photos').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
 await page.locator('#publishButton').click();await expect(page.locator('#listingStatus')).toContainText('Simulated photo failure');await expect(page.locator('#publishButton')).toBeEnabled();await expect(page.locator('#listingForm')).not.toHaveClass(/busy/);
});
