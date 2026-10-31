const {test,expect}=require('@playwright/test');
const {signIn,marker}=require('../helpers/staging.cjs');

// Exactly one real, opted-in feedback ticket from a dedicated staging test account.
// There is deliberately NO test-time blanket delete. After the run, a maintainer
// removes only this ticket's UUID/marker with a scoped staging-only SQL operation.
// This test MUST NEVER run against public production or ordinary collectors.
test('T7.6 signed buyer submits private category feedback; seller and anonymous cannot read it',async({page,browser})=>{
 test.setTimeout(110000);
 if(process.env.DECKPLAY_STAGING_URL!=='https://deckplay-hq-staging.cstivers56.workers.dev')
  throw Error('Real feedback acceptance is staging-only');
 const title=marker();
 console.log('T7.6 synthetic marker for isolated cleanup: '+title);
 let sellerContext;
 try {
  await signIn(page,'BUYER');
  const buyer=await page.evaluate(()=>({id:currentUser?.id,email:currentUser?.email}));
  expect(buyer.email).toBe('deckplay-buyer@deckplay.test');
  await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
  await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
  await expect(page.locator('#supportFeedbackOptions')).toBeVisible();
  await page.locator('#supportFeedbackKind').selectOption('idea');
  await page.locator('#supportFeedbackArea').selectOption('sports_cards');
  await page.locator('#supportSubject').fill(title);
  const description='Real signed-in synthetic feedback: add better year and grading filters for sports cards.';
  await page.locator('#supportDescription').fill(description);
  await page.getByRole('button',{name:'Send private feedback'}).click();
  await expect(page.locator('#supportCreateStatus')).toContainText('Ticket created.',{timeout:25000});

  const row=await page.evaluate(async marker=>{
   const {data,error}=await supabaseClient.from('support_tickets')
    .select('id,owner_id,category,subject,body,status')
    .eq('subject','[Idea] '+marker).eq('owner_id',currentUser.id).single();
   if(error)throw Error('Real owner ticket lookup failed: '+error.message);
   return data;
  },title);
  expect(row.owner_id).toBe(buyer.id);
  expect(row.category).toBe('other');
  expect(row.subject).toBe('[Idea] '+title);
  expect(row.body).toBe('Area: Sports cards\\nDetails: '+description);
  expect(row.status).toBe('open');
  console.log('T7.6 synthetic ticket UUID for exact cleanup: '+row.id);
  await expect(page.locator('#supportTicketList')).toContainText(title);

  // No bearer token: anonymous PostgREST must not disclose the ticket.
  const anonymous=await page.evaluate(async id=>{
   const url=SUPABASE_URL+'/rest/v1/support_tickets?select=id&id=eq.'+encodeURIComponent(id);
   const response=await fetch(url,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});
   return {status:response.status,body:response.ok?await response.json():null};
  },row.id);
  expect(anonymous.status===401||anonymous.status===403||(anonymous.status===200&&Array.isArray(anonymous.body)&&anonymous.body.length===0)).toBe(true);

  sellerContext=await browser.newContext({
   baseURL:process.env.DECKPLAY_STAGING_URL,
   httpCredentials:{username:'deckplay',password:process.env.DECKPLAY_STAGING_ACCESS_PASSWORD},
   ignoreHTTPSErrors:!!process.env.CODEX_NETWORK_PROXY_ACTIVE
  });
  const seller=await sellerContext.newPage();
  await signIn(seller,'SELLER');
  const other=await seller.evaluate(async id=>{
   if(currentUser?.email!=='deckplay-seller@deckplay.test')throw Error('Unexpected seller identity');
   const {data,error}=await supabaseClient.from('support_tickets')
    .select('id').eq('id',id).maybeSingle();
   if(error)throw Error('Seller RLS query failed: '+error.message);
   return data;
  },row.id);
  expect(other).toBeNull();
 }finally{
  if(sellerContext)await sellerContext.close();
  console.log('T7.6 cleanup required: delete ONLY the dedicated bot ticket with this exact marker, then verify zero remain: '+title);
 }
});
