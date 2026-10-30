const {test,expect}=require('@playwright/test');
const path=require('node:path');
// Isolated UI/API contract test: no Supabase traffic, no private credentials, no quota usage.
async function boot(page){
 await page.setContent('<footer></footer><div id="accountMenu"><button id="signOutButton">Sign out</button></div><div id="authModal" class="modal"><button type="button" data-close="authModal">Close sign in</button></div>');
 await page.evaluate(()=>{
  window.currentUser=null;
  window.__db={tickets:[],replies:[],calls:[]};
  window.openModal=id=>document.getElementById(id).classList.add('open');
  window.closeModal=id=>document.getElementById(id).classList.remove('open');
  window.supabaseClient={
   auth:{onAuthStateChange:callback=>{window.__authCallback=callback}},
   rpc:async(name,args)=>{
    window.__db.calls.push({name,args});
    if(name==='is_deckplay_moderator')return {data:window.currentUser?.id==='staff',error:null};
    if(name==='create_support_ticket'){
     const id='ticket-'+(window.__db.tickets.length+1);
     window.__db.tickets.push({id,owner_id:window.currentUser.id,category:args.p_category,subject:args.p_subject,body:args.p_body,status:'open',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
     return {data:id,error:null};
    }
    if(name==='reply_support_ticket'){
     const ticket=window.__db.tickets.find(t=>t.id===args.p_ticket_id);
     if(!ticket||(!window.currentUser||ticket.owner_id!==window.currentUser.id&&window.currentUser.id!=='staff'))return {error:{message:'Not allowed'}};
     window.__db.replies.push({id:'reply-'+(window.__db.replies.length+1),ticket_id:args.p_ticket_id,author_id:window.currentUser.id,is_staff:window.currentUser.id==='staff',body:args.p_body,created_at:new Date().toISOString()});
     ticket.status=window.currentUser.id==='staff'?'waiting_on_user':'waiting_on_staff';
     return {data:'reply-ok',error:null};
    }
    if(name==='set_support_ticket_status'){
     if(window.currentUser?.id!=='staff')return {error:{message:'Not allowed'}};
     window.__db.tickets.find(t=>t.id===args.p_ticket_id).status=args.p_status;
     return {error:null};
    }
    return {error:{message:'Unexpected RPC'}};
   },
   from:table=>{
    const state={filters:[]};
    const query={
     select(){return query},
     order(){return query},
     limit(){return query},
     eq(field,value){state.filters.push([field,value,false]);return query},
     neq(field,value){state.filters.push([field,value,true]);return query},
     then(resolve,reject){
      const all=table==='support_tickets'?window.__db.tickets:window.__db.replies;
      const rows=all.filter(row=>state.filters.every(([k,v,not])=>not?row[k]!==v:row[k]===v))
       .filter(row=>table==='support_tickets'?(row.owner_id===window.currentUser?.id||window.currentUser?.id==='staff'):
        window.__db.tickets.some(t=>t.id===row.ticket_id&&(t.owner_id===window.currentUser?.id||window.currentUser?.id==='staff')));
      return Promise.resolve({data:rows,error:null}).then(resolve,reject);
     }
    };return query;
   }
  };
 });
 await page.addScriptTag({path:path.resolve(__dirname,'../../support-center.js')});
}
async function signIn(page,id){
 await page.evaluate(id=>{window.currentUser={id};window.__authCallback('SIGNED_IN',{user:{id}})},id);
}
test('signed-out Help Center explains all categories and forbids fake checkout',async({page})=>{
 await boot(page);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.getByText('Can I pay or print a shipping label?').click();
 await expect(page.getByText('No payment, payout, shipping label or purchase')).toBeVisible();
 await expect(page.locator('#supportPrivate')).toBeHidden();
 await expect(page.getByText('Sign in to send feedback or open and follow private support tickets.')).toBeVisible();
});
test('collector creates, reads and replies to private ticket, account switch clears view',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportCategory').selectOption('offers_trades');
 await page.locator('#supportSubject').fill('Synthetic trade help');
 await page.locator('#supportDescription').fill('Synthetic trade question about a game collectible.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('Synthetic trade help');
 await page.locator('#supportReplyBody').fill('Please review my test trade.');
 await page.getByRole('button',{name:'Send reply'}).click();
 await expect(page.locator('#supportReplies')).toContainText('Please review my test trade.');
 await page.locator('#supportSubject').fill('Private unsent draft');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await expect(page.locator('#supportTicketBody')).toBeEmpty();
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await expect(page.locator('#supportReplies')).toBeEmpty();
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList')).not.toContainText('Synthetic trade help');
});
test('verified staff sees queue, responds privately and resolves ticket',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportSubject').fill('Synthetic account support');
 await page.locator('#supportDescription').fill('Synthetic request for account access guidance.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await page.evaluate(()=>{window.currentUser={id:'staff'};window.__authCallback('SIGNED_IN',{user:{id:'staff'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportStaff')).toBeVisible();
 await page.locator('#supportStaff').click();
 await page.locator('#supportTicketList button').first().click();
 await page.locator('#supportReplyBody').fill('We can help with that.');
 await page.getByRole('button',{name:'Send reply'}).click();
 await expect(page.locator('#supportReplies')).toContainText('We can help with that.');
 await page.locator('#supportStatusSelect').selectOption('resolved');
 await page.getByRole('button',{name:'Save status'}).click();
 await expect(page.locator('#supportTicketState')).toContainText('Resolved');
 await expect(page.locator('#supportReplyForm')).toBeHidden();
});

test('T8.3: signed-out trade or shipping concern returns to a private ticket after sign-in',async({page})=>{
 await boot(page);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.getByText('What if a trade or shipping arrangement goes wrong?').click();
 await expect(page.getByText('DeckPlay beta does not process payments')).toBeVisible();
 await page.getByRole('button',{name:'Get help with a trade or shipping concern'}).click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await signIn(page,'buyer');
 await page.evaluate(()=>closeModal('authModal')); // Application auth handler closes its own dialog.
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportCategory')).toHaveValue('offers_trades');
 await expect(page.locator('#supportSubject')).toHaveValue('Trade or shipping concern');
 await page.locator('#supportDescription').fill('Synthetic question about a proposed trade; no personal details.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('Trade or shipping concern');
 await expect(page.locator('#supportTicketBody')).toContainText('Synthetic question');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await expect(page.locator('#supportTicketBody')).toBeEmpty();
 await expect(page.locator('#supportSubject')).toBeEmpty();
});
test('T8.3: cancelling sign-in discards pending trade support navigation',async({page})=>{
 await boot(page);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.getByText('What if a trade or shipping arrangement goes wrong?').click();
 await page.getByRole('button',{name:'Get help with a trade or shipping concern'}).click();
 await page.locator('[data-close="authModal"]').click();
 await page.evaluate(()=>closeModal('authModal'));
 await signIn(page,'buyer');
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
});

test('T8.3: buyer and staff filter open/resolved tickets server-side without losing account isolation',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 for(const subject of ['Synthetic open collectible help','Synthetic resolved collectible help']){
  await page.locator('#supportSubject').fill(subject);
  await page.locator('#supportDescription').fill('Synthetic account question about a collectible listing.');
  await page.getByRole('button',{name:'Create private ticket'}).click();
 }
 // Authorized staff resolves one ticket; the other remains open.
 await page.evaluate(()=>{window.currentUser={id:'staff'};window.__authCallback('SIGNED_IN',{user:{id:'staff'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportStaff').click();
 await page.locator('#supportTicketList button').filter({hasText:'Synthetic resolved collectible help'}).click();
 await page.locator('#supportStatusSelect').selectOption('resolved');
 await page.getByRole('button',{name:'Save status'}).click();
 await page.locator('[data-support-filter="active"]').click();
 await expect(page.locator('#supportTicketList')).toContainText('Synthetic open collectible help');
 await expect(page.locator('#supportTicketList')).not.toContainText('Synthetic resolved collectible help');
 await expect(page.locator('[data-support-filter="active"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-support-filter="resolved"]').click();
 await expect(page.locator('#supportTicketList')).toContainText('Synthetic resolved collectible help');
 await expect(page.locator('#supportTicketList')).not.toContainText('Synthetic open collectible help');
 // Collector only sees their own tickets, including resolved history.
 await page.evaluate(()=>{window.currentUser={id:'buyer'};window.__authCallback('SIGNED_IN',{user:{id:'buyer'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('[data-support-filter="all"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-support-filter="resolved"]').click();
 await expect(page.locator('#supportTicketList')).toContainText('Synthetic resolved collectible help');
 await page.locator('[data-support-filter="active"]').click();
 await expect(page.locator('#supportTicketList')).toContainText('Synthetic open collectible help');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('[data-support-filter="resolved"]').click();
 await expect(page.locator('#supportTicketList')).not.toContainText('Synthetic resolved collectible help');
 await expect(page.locator('#supportListStatus')).toHaveText('No resolved tickets in this view.');
});

test('T7.6: collector submits typed private feedback for bugs, improvements and missing categories',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 for(const [kind,subject,prefix] of [
  ['bug','Marketplace filter broken','[Bug] '],
  ['idea','Improve collection sorting','[Idea] '],
  ['category','Please add vintage toys','[Category request] ']
 ]){
  await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
  await expect(page.locator('#supportFeedbackOptions')).toBeVisible();
  await expect(page.locator('#supportCategoryField')).toBeHidden();
  await expect(page.locator('#supportNewTitle')).toHaveText('Share private beta feedback');
  await page.locator('#supportFeedbackKind').selectOption(kind);
  await page.locator('#supportSubject').fill(subject);
  await page.locator('#supportDescription').fill('Synthetic feedback about cards, games and general collectibles.');
  await page.getByRole('button',{name:'Send private feedback'}).click();
  await expect(page.locator('#supportTicketTitle')).toHaveText(prefix+subject);
  const call=await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').at(-1));
  expect(call.args.p_category).toBe('other');
  expect(call.args.p_subject).toBe(prefix+subject);
 }
 // Returning to ordinary support must restore the full topic selector and clear the draft.
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportFeedbackOptions')).toBeHidden();
 await expect(page.locator('#supportCategoryField')).toBeVisible();
 await expect(page.locator('#supportNewTitle')).toHaveText('Open a new support ticket');
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList')).not.toContainText('Marketplace filter broken');
 await expect(page.locator('#supportTicketList')).not.toContainText('Please add vintage toys');
});

test('T7.6: signed-out feedback returns to the private form after login without carrying drafts',async({page})=>{
 await boot(page);
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportPrivate')).toBeHidden();
 await page.getByRole('button',{name:'Sign in to send feedback'}).click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 await signIn(page,'buyer');
 await page.evaluate(()=>closeModal('authModal'));
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportFeedbackOptions')).toBeVisible();
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await page.locator('#supportFeedbackKind').selectOption('idea');
 await page.locator('#supportSubject').fill('Add easier game filters');
 await page.locator('#supportDescription').fill('Synthetic suggestion for games, consoles and accessories.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('[Idea] Add easier game filters');
});

test('T7.6: feedback confirmation survives concurrent support-list refresh',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>{
  const original=window.supabaseClient.rpc;
  window.__resumeStaff=null;window.__resumeCreate=null;
  window.supabaseClient.rpc=async(name,args)=>{
   if(name==='is_deckplay_moderator')await new Promise(resolve=>{window.__resumeStaff=resolve});
   if(name==='create_support_ticket')await new Promise(resolve=>{window.__resumeCreate=resolve});
   return original(name,args);
  };
  document.dispatchEvent(new Event('deckplay:open-feedback'));
 });
 await page.locator('#supportSubject').fill('Marketplace search issue');
 await page.locator('#supportDescription').fill('Synthetic feedback about a missing console accessory search result.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await page.waitForFunction(()=>typeof window.__resumeStaff==='function'&&typeof window.__resumeCreate==='function');
 await page.evaluate(()=>window.__resumeStaff());
 await expect(page.locator('#supportListStatus')).toHaveText('No tickets in this view.');
 await page.evaluate(()=>window.__resumeCreate());
 await expect(page.locator('#supportTicketTitle')).toHaveText('[Bug] Marketplace search issue');
 await expect(page.locator('#supportCreateStatus')).toHaveText('Ticket created. You can follow replies below.');
});
