const {test,expect}=require('@playwright/test');
test('signed-out buyer can inspect a seller profile and following asks for sign-in',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 const error=await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser=null;
  supabaseClient.from=table=>{const q={then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)};for(const key of ['select','eq','order','limit'])q[key]=()=>q;q.maybeSingle=async()=>({data:table==='profiles'?{username:'fixture-seller',bio:'Sports and TCG collector'}:null,error:null});return q};
  try{await showPublicProfile('fixture-seller');return null}catch(error){return error.message}
 });
 expect(error,'Public seller profile must load without an authenticated user').toBeNull();
 await expect(page.locator('#publicProfileTitle')).toHaveText('@fixture-seller');
 await page.locator('[data-follow-profile="fixture-seller"]').click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
});
