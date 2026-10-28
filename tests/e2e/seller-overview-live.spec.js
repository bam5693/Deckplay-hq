const {test,expect}=require('@playwright/test');const {signIn,seedListing,cleanup,marker}=require('../helpers/staging.cjs');
test('seller overview reflects own active inventory and marked-sold state without claiming revenue',async({page})=>{
 test.setTimeout(90000);await signIn(page,'BUYER');const title=marker();
 const baseline=await page.evaluate(async()=>{const {data,error}=await supabaseClient.rpc('get_my_seller_overview');if(error)throw Error(error.message);return data});
 try{
  const id=await seedListing(page,title);await page.evaluate(()=>showCollectorPage());await page.locator('#sellerOverview summary').click();await expect(page.locator('.seller-overview-stats dd').first()).toHaveText(Number(baseline.active+1).toLocaleString());await expect(page.locator('.seller-asking-total strong')).toHaveText(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(baseline.active_asking_total)+25));await expect(page.locator('#sellerOverviewContent')).toContainText('not earnings');
  await page.evaluate(async id=>{const {error}=await supabaseClient.from('listings').update({status:'sold'}).eq('id',id).eq('seller_id',currentUser.id);if(error)throw Error(error.message)},id);await page.locator('[data-seller-overview="refresh"]').click();await expect(page.locator('.seller-overview-stats dd').first()).toHaveText(Number(baseline.active).toLocaleString());await expect(page.locator('.seller-overview-stats dd').nth(2)).toHaveText(Number(baseline.sold+1).toLocaleString());
 }finally{await cleanup(page,title)}
});
