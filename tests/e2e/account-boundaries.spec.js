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

test('old blocked-collector requests cannot replace the new account block list',async({page})=>{
 await page.evaluate(()=>{
  currentUser={id:'former-collector'};syncInboxDraftUser();window.pendingBlocks={};
  supabaseClient.from=()=>{let owner;const q={select:()=>q,eq:(field,id)=>{owner=id;return q},then:(resolve,reject)=>new Promise(done=>pendingBlocks[owner]=done).then(resolve,reject)};return q};
  window.oldBlocks=loadBlockedCollectors();currentUser={id:'current-collector'};syncInboxDraftUser();window.newBlocks=loadBlockedCollectors();
 });
 await expect.poll(()=>page.evaluate(()=>Object.keys(pendingBlocks).length)).toBe(2);
 await page.evaluate(async()=>{pendingBlocks['current-collector']({data:[{blocked_id:'current-block'}],error:null});await newBlocks;pendingBlocks['former-collector']({data:[{blocked_id:'former-private-block'}],error:null});await oldBlocks});
 expect(await page.evaluate(()=>[...blockedCollectorIds])).toEqual(['current-block']);
});

test('old notification preferences cannot overwrite a switched collector settings',async({page})=>{
 await page.evaluate(()=>{
  currentUser={id:'former-collector'};syncInboxDraftUser();window.pendingPreferences={};
  supabaseClient.from=()=>{let owner;const q={select:()=>q,eq:(field,id)=>{owner=id;return q},maybeSingle:()=>new Promise(done=>pendingPreferences[owner]=done)};return q};
  window.oldPreferences=loadNotificationSettings();currentUser={id:'current-collector'};syncInboxDraftUser();window.newPreferences=loadNotificationSettings();
 });
 await page.evaluate(async()=>{
  pendingPreferences['current-collector']({data:{messages:false,trade_offers:false},error:null});await newPreferences;
  pendingPreferences['former-collector']({data:{messages:true,trade_offers:true},error:null});await oldPreferences;
 });
 await expect(page.locator('[data-notify-pref="messages"]')).not.toBeChecked();
 await expect(page.locator('[data-notify-pref="trade_offers"]')).not.toBeChecked();
});

test('a delayed block mutation cannot alter the next collector block list',async({page})=>{
 await page.evaluate(()=>{
  currentUser={id:'former-collector'};syncInboxDraftUser();
  supabaseClient.from=()=>({insert:()=>new Promise(done=>window.finishFormerBlock=done)});
  window.formerBlock=toggleUserBlock('former-private-block',false);
  currentUser={id:'current-collector'};syncInboxDraftUser();blockedCollectorIds.add('current-block');
 });
 await page.evaluate(async()=>{finishFormerBlock({error:null});await formerBlock});
 expect(await page.evaluate(()=>[...blockedCollectorIds])).toEqual(['current-block']);
});

test('notification preferences recover from service errors and ignore a former account save',async({page})=>{
 await page.evaluate(async()=>{
  currentUser={id:'former-collector'};syncInboxDraftUser();
  supabaseClient.from=()=>({select(){return this},eq(){return this},maybeSingle:async()=>{throw Error('Connection interrupted')}});
  await loadNotificationSettings();
 });
 await expect(page.locator('#notificationSettingsStatus')).toContainText('Could not load preferences');
 await expect(page.locator('[data-notify-pref="messages"]')).toBeDisabled();
 await page.evaluate(async()=>{
  supabaseClient.from=()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:null}),upsert:payload=>{window.savedPreferencesPayload=payload;return new Promise(done=>window.finishFormerPreferenceSave=done)}});
  await loadNotificationSettings();document.querySelector('[data-notify-pref="messages"]').checked=false;
  document.querySelector('[data-notify-pref="messages"]').dispatchEvent(new Event('change'));
 });
 await expect(page.locator('[data-notify-pref="messages"]')).toBeDisabled();
 expect(await page.evaluate(()=>savedPreferencesPayload.user_id)).toBe('former-collector');
 await page.evaluate(async()=>{
  currentUser={id:'current-collector'};syncInboxDraftUser();await loadNotificationSettings();
  finishFormerPreferenceSave({error:{message:'Former account save failed'}});
 });
 await expect(page.locator('[data-notify-pref="messages"]')).toBeChecked();
 await expect(page.locator('[data-notify-pref="messages"]')).toBeEnabled();
 await expect(page.locator('#notificationSettingsStatus')).toContainText('Preferences saved to your account');
 await page.evaluate(()=>{currentUser=null;syncInboxDraftUser()});
 await expect(page.locator('[data-notify-pref="messages"]')).not.toBeChecked();
 await expect(page.locator('[data-notify-pref="messages"]')).toBeDisabled();
 await expect(page.locator('#notificationSettingsStatus')).toBeEmpty();
});

async function reportDraft(page){
 await page.evaluate(()=>{
  currentUser={id:'fixture-reporter'};syncInboxDraftUser();window.reportWrites=0;
  supabaseClient.from=table=>table==='user_reports'?{insert:payload=>{reportWrites++;window.reportPayload=payload;return new Promise(done=>window.finishReport=done)}}:{select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:null})};
  startReport('fixture-reported');
 });
 await page.locator('#reportDetails').fill('Private synthetic report details');
}
test('report submissions prevent duplicate taps and preserve details after service errors',async({page})=>{
 await reportDraft(page);await page.locator('#reportReason').selectOption('counterfeit');
 await page.evaluate(()=>{reportForm.requestSubmit();reportForm.requestSubmit()});
 expect(await page.evaluate(()=>reportWrites)).toBe(1);
 expect(await page.evaluate(()=>reportPayload)).toMatchObject({reporter_id:'fixture-reporter',reported_id:'fixture-reported',reason:'counterfeit',details:'Private synthetic report details'});
 await page.evaluate(()=>finishReport(Promise.reject(Error('Report connection interrupted'))));
 await expect(page.locator('#reportStatus')).toContainText('Report connection interrupted');
 await expect(page.locator('#reportDetails')).toHaveValue('Private synthetic report details');
 await expect(page.locator('#reportForm button[type="submit"]')).toBeEnabled();
 await page.locator('#reportForm button[type="submit"]').click();await page.evaluate(()=>finishReport({error:null}));
 await expect(page.locator('#reportModal')).not.toHaveClass(/open/);
});
test('account switches erase report drafts and ignore former account submission results',async({page})=>{
 await reportDraft(page);await page.locator('#reportForm button[type="submit"]').click();
 await page.evaluate(()=>{window.reportConfirms=0;window.confirm=()=>{reportConfirms++;return true};currentUser={id:'next-reporter'};syncInboxDraftUser()});
 await expect(page.locator('#reportModal')).not.toHaveClass(/open/);
 await expect(page.locator('#reportDetails')).toHaveValue('');
 await page.evaluate(()=>finishReport({error:null}));
 expect(await page.evaluate(()=>reportConfirms)).toBe(0);
});
test('block-status lookups cannot overwrite the next report target',async({page})=>{
 await page.evaluate(()=>{
  currentUser={id:'fixture-reporter'};syncInboxDraftUser();window.reportBlockReplies={};
  supabaseClient.from=()=>{let target;return {select(){return this},eq(field,id){if(field==='blocked_id')target=id;return this},maybeSingle:()=>new Promise(done=>reportBlockReplies[target]=done)}};
  startReport('former-target');startReport('current-target');
 });
 await page.evaluate(()=>reportBlockReplies['current-target']({data:null,error:null}));
 await expect(page.locator('#reportBlockButton')).toHaveText('Block collector');
 await page.evaluate(()=>reportBlockReplies['former-target']({data:{blocked_id:'former-target'},error:null}));
 await expect(page.locator('#reportBlockButton')).toHaveText('Block collector');
});

test('a successful older report preserves newer edits and does not close another target',async({page})=>{
 await reportDraft(page);await page.locator('#reportForm button[type="submit"]').click();
 await page.locator('#reportDetails').fill('Newer evidence not yet submitted');
 await page.evaluate(()=>finishReport({error:null}));
 await expect(page.locator('#reportModal')).toHaveClass(/open/);
 await expect(page.locator('#reportDetails')).toHaveValue('Newer evidence not yet submitted');
 await expect(page.locator('#reportStatus')).toContainText('Your newer details have been kept');
 await page.locator('#reportForm button[type="submit"]').click();
 await page.evaluate(()=>startReport('different-reported-collector'));
 await page.locator('#reportDetails').fill('Different collector evidence');
 await page.evaluate(()=>finishReport({error:null}));
 await expect(page.locator('#reportModal')).toHaveClass(/open/);
 await expect(page.locator('#reportDetails')).toHaveValue('Different collector evidence');
});
