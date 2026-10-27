const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));await page.goto('/');await page.waitForLoadState('networkidle')});
async function compose(page){await page.evaluate(()=>{
 currentUser={id:'fixture-sender'};syncInboxDraftUser();composeRecipient='fixture-recipient';composeListing=null;sendCollectorEmailForSource=async()=>{};window.composeWrites=0;
 supabaseClient.from=()=>{const q={select:()=>q,insert:()=>{composeWrites++;return q},single:async()=>await new Promise(resolve=>window.finishCompose=resolve)};return q};openModal('composeModal');
});await page.locator('#composeBody').fill('Keep this message')}
test('message dialog prevents duplicate pending submissions',async({page})=>{
 await compose(page);await page.evaluate(()=>{const form=document.getElementById('composeForm');form.requestSubmit();form.requestSubmit()});
 expect(await page.evaluate(()=>composeWrites)).toBe(1);await page.evaluate(()=>finishCompose({data:{id:'sent'},error:null}));await expect(page.locator('#composeModal')).not.toHaveClass(/open/);
});
test('message dialog preserves text and releases controls after a service exception',async({page})=>{
 await compose(page);await page.evaluate(()=>{supabaseClient.from=()=>{const q={insert:()=>q,select:()=>q,single:async()=>{throw Error('Message connection interrupted')}};return q}});
 await page.locator('#composeForm button[type="submit"]').click();await expect(page.locator('#composeStatus')).toContainText('Message connection interrupted');await expect(page.locator('#composeBody')).toHaveValue('Keep this message');await expect(page.locator('#composeForm button[type="submit"]')).toBeEnabled();
});
test('a completed older send does not clear a message opened for another collector',async({page})=>{
 await compose(page);await page.locator('#composeForm button[type="submit"]').click();
 await page.evaluate(()=>{closeModal('composeModal');composeRecipient='fixture-other';document.getElementById('composeBody').value='New recipient draft';openModal('composeModal')});
 await page.evaluate(()=>finishCompose({data:{id:'sent'},error:null}));await expect(page.locator('#composeModal')).toHaveClass(/open/);await expect(page.locator('#composeBody')).toHaveValue('New recipient draft');
});
async function profile(page){await page.evaluate(()=>{
 currentUser={id:'fixture-owner'};syncInboxDraftUser();window.pendingProfiles=[];
 supabaseClient.from=table=>{const q={then:(resolve,reject)=>(table==='profiles'?new Promise(done=>pendingProfiles.push(done)):Promise.resolve({data:table==='listings'?[{id:'listing',title:'Own listing',price:25,status:'active'}]:table==='wanted_posts'?[{id:'wanted',title:'Current wanted post'}]:[],error:null})).then(resolve,reject)};for(const key of ['select','eq','order','maybeSingle','limit','in'])q[key]=()=>q;return q};
})}
test('older profile results cannot replace the newly selected tab',async({page})=>{
 await profile(page);await page.evaluate(()=>{window.oldProfile=showCollectorPage('listings');window.newProfile=showCollectorPage('wanted')});await expect.poll(()=>page.evaluate(()=>pendingProfiles.length)).toBe(2);
 await page.evaluate(async()=>{pendingProfiles[1]({data:{username:'current_owner'},error:null});await newProfile});await expect(page.locator('#profilePageContent')).toContainText('Current wanted post');
 await page.evaluate(async()=>{pendingProfiles[0]({data:{username:'old_owner'},error:null});await oldProfile});await expect(page.locator('#profilePageContent')).toContainText('Current wanted post');await expect(page.locator('#pageHandle')).toHaveText('@current_owner');
});
test('sign-out hides the own-profile page and discards its pending result',async({page})=>{
 await profile(page);await page.evaluate(()=>{window.oldProfileError=null;window.oldProfile=showCollectorPage().catch(error=>{oldProfileError=error.message})});await expect.poll(()=>page.evaluate(()=>pendingProfiles.length)).toBe(1);
 await page.evaluate(()=>supabaseClient.auth.signOut({scope:'local'}));await page.evaluate(async()=>{pendingProfiles[0]({data:{username:'private_owner'},error:null});await oldProfile});
 await expect(page.locator('#collectorPage')).toBeHidden();expect(await page.evaluate(()=>oldProfileError)).toBeNull();await expect(page.locator('#pageHandle')).not.toContainText('private_owner');
});
test('switching dialogs waits for Back history before opening the next dialog',async({page})=>{
 await page.evaluate(()=>{openModal('authModal');closeModal('authModal');openModal('composeModal')});
 await expect(page.locator('#composeModal')).toHaveClass(/open/);await expect(page.locator('#authModal')).not.toHaveClass(/open/);
 await page.goBack();await expect(page.locator('#composeModal')).not.toHaveClass(/open/);await expect(page.locator('#authModal')).not.toHaveClass(/open/);
 await page.evaluate(()=>{openModal('authModal');closeModal('authModal');openModal('composeModal');closeModal('composeModal')});
 await expect.poll(()=>page.evaluate(()=>history.state.deckplayDepth)).toBe(0);await expect(page.locator('#composeModal')).not.toHaveClass(/open/);
});

for(const [label,loader,table,list,modal] of [
 ['price','loadPriceOffers','price_offers','priceOffersList','priceOffersModal'],
 ['trade','loadTradeOffers','trade_offers','tradeOffersList','tradesModal']
]){
 test(`${label} offers discard a former account response after account switching`,async({page})=>{
  await page.evaluate(({loader,table})=>{
   currentUser={id:'fixture-old'};syncInboxDraftUser();window.offerLoadError=null;
   supabaseClient.from=name=>{const q={then:(resolve,reject)=>(name===table?new Promise(done=>window.finishPrivateOffers=done):Promise.resolve({data:[],error:null})).then(resolve,reject)};for(const key of ['select','order','limit','in'])q[key]=()=>q;return q};
   window.pendingPrivateOffers=window[loader]().catch(error=>offerLoadError=error.message);
  },{loader,table});
  await page.evaluate(async()=>{
   currentUser={id:'fixture-new'};syncInboxDraftUser();
   finishPrivateOffers({data:[{id:'private-offer',listing_id:'old-listing',buyer_id:'fixture-old',seller_id:'old-other',sender_id:'fixture-old',recipient_id:'old-other',amount:37,status:'declined',offer_note:'Private old proposal',created_at:'2026-10-27',updated_at:'2026-10-27'}],error:null});await pendingPrivateOffers;
  });
  expect(await page.evaluate(()=>offerLoadError)).toBeNull();
  await expect(page.locator('#'+list)).not.toContainText('37.00');await expect(page.locator('#'+list)).not.toContainText('Private old proposal');
 });
 test(`${label} offers clear already rendered private details when signing out`,async({page})=>{
  await page.evaluate(({list,modal})=>{currentUser={id:'fixture-old'};syncInboxDraftUser();document.getElementById(list).textContent='Private negotiation';openModal(modal)}, {list,modal});
  await page.evaluate(()=>supabaseClient.auth.signOut({scope:'local'}));
  await expect(page.locator('#'+list)).toBeEmpty();await expect(page.locator('#'+modal)).not.toHaveClass(/open/);
 });
}
