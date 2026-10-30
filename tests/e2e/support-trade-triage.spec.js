const {test,expect}=require('@playwright/test');
const path=require('node:path');
// T8.6 isolated buyer-facing triage. All RPCs are local fakes; no Supabase writes.
async function boot(page){
 await page.setContent('<footer></footer><div id="accountMenu"><button id="signOutButton">Sign out</button></div><div id="authModal" class="modal"><button data-close="authModal">Cancel</button></div>');
 await page.evaluate(()=>{
  window.currentUser={id:'buyer'};
  window.__calls=[];
  window.openModal=id=>document.getElementById(id).classList.add('open');
  window.closeModal=id=>document.getElementById(id).classList.remove('open');
  window.supabaseClient={
   auth:{onAuthStateChange:cb=>{window.__auth=cb}},
   rpc:async(name,args)=>{
    if(name==='is_deckplay_moderator')return {data:false,error:null};
    if(name==='create_support_ticket'){
     window.__calls.push(args);
     return {data:'synthetic-ticket',error:null};
    }
    return {error:{message:'Unexpected RPC: '+name}};
   },
   from:()=>{
    const q={select(){return q},order(){return q},range(){return q},eq(){return q},
      then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};
    return q;
   }
  };
 });
 await page.addScriptTag({path:path.resolve(__dirname,'../../support-center.js')});
}
test('T8.6: proposed trade, preview confusion and payment pressure use correct private support routing',async({page})=>{
 await boot(page);
 for(const [kind,prefix,category] of [
  ['proposal','','offers_trades'],
  ['shipping','[Shipping preview] ','offers_trades'],
  ['pressure','[Payment pressure] ','safety']
 ]){
  await page.getByRole('button',{name:'Help & support'}).last().click();
  const concernHelp=page.locator('details').filter({hasText:'What if a trade or shipping arrangement goes wrong?'});
  if(!await concernHelp.evaluate(node=>node.open))await concernHelp.locator('summary').click();
  await page.getByRole('button',{name:'Get help with a trade or shipping concern'}).click();
  await expect(page.locator('#supportTradeConcernFields')).toBeVisible();
  await expect(page.locator('#supportCategoryField')).toBeHidden();
  await page.locator('#supportTradeConcernKind').selectOption(kind);
  if(kind==='pressure')await expect(page.locator('#supportTradeConcernHint')).toContainText('Do not send money');
  await page.locator('#supportDescription').fill('Synthetic concern about a proposed collectible trade without personal information.');
  await page.getByRole('button',{name:'Create private ticket'}).click();
  await expect(page.locator('#supportCreateStatus')).toContainText('Ticket created');
  const call=await page.evaluate(()=>window.__calls.at(-1));
  expect(call.p_category).toBe(category);
  expect(call.p_subject).toBe(prefix+'Trade or shipping concern');
  expect(call.p_body).toContain('Concern: ');
  await page.locator('#supportClose').click();
 }
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTradeConcernFields')).toBeHidden();
 await expect(page.locator('#supportCategoryField')).toBeVisible();
 await expect(page.locator('#supportSubject')).toBeEmpty();
});
test('T8.6: private payment-pressure draft clears on account change',async({page})=>{
 await boot(page);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.getByText('What if a trade or shipping arrangement goes wrong?').click();
 await page.getByRole('button',{name:'Get help with a trade or shipping concern'}).click();
 await page.locator('#supportTradeConcernKind').selectOption('pressure');
 await page.locator('#supportDescription').fill('Private draft about a collector asking me to send payment.');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__auth('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTradeConcernFields')).toBeHidden();
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await expect(page.locator('#supportCategory')).toHaveValue('account');
});
