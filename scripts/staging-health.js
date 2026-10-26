// Bounded staging-only scheduled probes. No checkout, shipping, email or production calls.
const STAGING_API='https://prrrzeelltmyugssqnzk.supabase.co';
const STAGING_KEY='sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh';
async function runStagingHealth(env) {
 const checks=[];let seller;
 async function request(path,token,body) {
  const response=await fetch(STAGING_API+path,{method:body?'POST':'GET',headers:{apikey:STAGING_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(path.split('?')[0]+' returned HTTP '+response.status);
  const raw=await response.text();return raw?JSON.parse(raw):null;
 }
 let error=null;
 try {
  if(!env.TEST_SELLER_PASSWORD||!env.TEST_BUYER_PASSWORD)throw new Error('Staging health credentials missing');
  seller=await request('/auth/v1/token?grant_type=password',null,{email:'deckplay-seller@deckplay.test',password:env.TEST_SELLER_PASSWORD});checks.push('seller password authentication');
  const buyer=await request('/auth/v1/token?grant_type=password',null,{email:'deckplay-buyer@deckplay.test',password:env.TEST_BUYER_PASSWORD});checks.push('buyer password authentication');
  if(seller.user.id===buyer.user.id)throw new Error('Test accounts are not distinct');
  for(const table of ['profiles','listings','wanted_posts','saved_listings','collector_messages','collector_notifications','price_offers','trade_offers']){
   await request('/rest/v1/'+table+'?select=*&limit=1',seller.access_token);checks.push(table+' API readable');
  }
  const privateMessages=await request('/rest/v1/collector_messages?select=id&limit=1');
  if(privateMessages.length)throw new Error('Anonymous user could read private messages');checks.push('anonymous messages denied');
 }catch(e){error=e.message}
 const report={user_id:seller?.user.id,suite:'scheduled-staging-health',passed:!error,checks,error};
 if(seller){try{await request('/rest/v1/staging_test_runs',seller.access_token,report)}catch(e){error=(error?error+'; ':'')+'Could not save health report: '+e.message;report.passed=false;report.error=error}}
 console.log(JSON.stringify({event:'staging-health',passed:report.passed,checks:checks.length,error}));
 return {passed:report.passed,checks,error};
}
