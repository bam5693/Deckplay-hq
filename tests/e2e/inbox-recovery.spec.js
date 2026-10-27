const {test,expect}=require('@playwright/test');
async function inbox(page){
 await page.goto('/');
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'fixture-seller'};
  const now=new Date().toISOString();window.fixtureWrites=0;
  supabaseClient.from=table=>{
   let inserting=false;
   const data=table==='collector_messages'?['buyer-a','buyer-b'].map((id,i)=>({id:'message-'+i,sender_id:id,recipient_id:'fixture-seller',body:'Hello '+id,read_at:now,created_at:now})):table==='profiles'?['buyer-a','buyer-b'].map(id=>({id,username:id})):[];
   const q={then:(resolve,reject)=>Promise.resolve({data,error:null}).then(resolve,reject)};
   for(const key of ['select','order','limit','in','eq','is','update','maybeSingle'])q[key]=()=>q;
   q.insert=()=>{inserting=true;window.fixtureWrites++;return q};
   q.single=async()=>{if(inserting)return await new Promise(resolve=>{window.finishFixtureSend=resolve});return {data:null,error:null}};
   return q;
  };
  sendCollectorEmailForSource=async()=>{};
  await showInboxPage('buyer-a');
 });
}
test('message drafts survive refresh, thread switching and inbox navigation',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('Draft for A');
 await page.evaluate(()=>loadInbox());await expect(page.locator('#chatInput')).toHaveValue('Draft for A');
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-b"]').click());
 await expect(page.locator('#chatInput')).toHaveValue('');await page.locator('#chatInput').fill('Draft for B');
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-a"]').click());
 await expect(page.locator('#chatInput')).toHaveValue('Draft for A');
 await page.evaluate(()=>showInboxPage('buyer-b'));await expect(page.locator('#chatInput')).toHaveValue('Draft for B');
});
test('rapid Enter submits once and a service exception allows retry without losing text',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('One message');
 await page.locator('#chatInput').press('Enter');await page.locator('#chatInput').press('Enter');
 expect(await page.evaluate(()=>fixtureWrites)).toBe(1);
 await page.evaluate(()=>finishFixtureSend(Promise.reject(Error('Connection lost'))));
 await expect(page.locator('.chat-send-status')).toContainText('Connection lost');
 await expect(page.locator('#chatInput')).toHaveValue('One message');await expect(page.locator('.chat-composer button')).toBeEnabled();
 await page.locator('#chatInput').press('Enter');expect(await page.evaluate(()=>fixtureWrites)).toBe(2);
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent'},error:null}));
 await expect(page.locator('#chatInput')).toHaveValue('');
});
test('finishing a send does not pull the reader out of another conversation',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('To A');await page.locator('#chatInput').press('Enter');
 await page.evaluate(()=>document.querySelector('[data-conversation-id="buyer-b"]').click());
 await page.locator('#chatInput').fill('Private draft B');
 await page.evaluate(()=>finishFixtureSend({data:{id:'sent'},error:null}));
 await expect(page.locator('.chat-composer')).toHaveAttribute('data-chat-recipient','buyer-b');
 await expect(page.locator('#chatInput')).toHaveValue('Private draft B');
});
test('loaded listing timestamps drive oldest and newest sorting',async({page})=>{
 await page.goto('/');await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();supabaseClient.from=table=>{const data=table==='listings'?[{id:'new',title:'New listing',created_at:'2026-10-20',price:25,category:'trading_cards'},{id:'old',title:'Old listing',created_at:'2026-09-01',price:25,category:'trading_cards'}]:[];const q={then:r=>Promise.resolve({data,error:null}).then(r)};for(const key of ['select','eq','order','in'])q[key]=()=>q;return q};await loadListings();showMainMarketplace();
 });
 await page.locator('#marketSort').selectOption('oldest');await expect(page.locator('#grid h3').first()).toHaveText('Old listing');
 await page.locator('#marketSort').selectOption('newest');await expect(page.locator('#grid h3').first()).toHaveText('New listing');
});
test('sign-out removes private conversation text and unsent drafts',async({page})=>{
 await inbox(page);await page.locator('#chatInput').fill('Secret draft');
 await page.evaluate(()=>supabaseClient.auth.signOut({scope:'local'}));
 await expect(page.locator('#messageInbox')).not.toContainText('Hello buyer-a');
 expect(await page.locator('#messageInbox textarea').count()).toBe(0);
});
test('marketplace search tolerates accents, case and extra spaces',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{items=[{id:'pokemon',n:'Pokémon Charizard',c:'Trading Cards',game:'pokemon',gameLabel:'Pokémon',p:25,s:'@fixture',cond:'Used',e:'🃏'},{id:'onepiece',n:'Luffy',c:'Trading Cards',game:'one_piece',gameLabel:'One Piece',p:25,s:'@fixture',cond:'Used',e:'🃏'}];showMainMarketplace();render()});
 await page.locator('#search').fill('  CHARIZARD   POKEMON  ');
 await expect(page.locator('#grid h3')).toHaveText(['Pokémon Charizard']);
 await page.locator('#search').fill('   ');await expect(page.locator('#grid h3')).toHaveCount(2);
});
