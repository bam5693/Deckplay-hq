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
    const state={filters:[],orders:[],start:0,end:null,limit:null,countOnly:false};
    const query={
     select(_fields,options={}){state.countOnly=options.count==="exact"&&options.head===true;return query},
     order(field,options={}){state.orders.push([field,options.ascending!==false]);return query},
     limit(count){state.limit=count;return query},
     range(start,end){state.start=start;state.end=end;return query},
     eq(field,value){state.filters.push([field,value,false]);return query},
     neq(field,value){state.filters.push([field,value,true]);return query},
     then(resolve,reject){
      const all=table==='support_tickets'?window.__db.tickets:window.__db.replies;
      let rows=all.filter(row=>state.filters.every(([k,v,not])=>not?row[k]!==v:row[k]===v))
       .filter(row=>table==='support_tickets'?(row.owner_id===window.currentUser?.id||window.currentUser?.id==='staff'):
        window.__db.tickets.some(t=>t.id===row.ticket_id&&(t.owner_id===window.currentUser?.id||window.currentUser?.id==='staff')));
      if(table==='support_tickets' && state.start===0 && window.__db.failFirstPageOnce){
       window.__db.failFirstPageOnce=false;
       return Promise.resolve({data:null,error:{message:'Simulated refresh interruption'}}).then(resolve,reject);
      }
      if(table==='support_tickets' && state.start>=40 && window.__db.failOlderOnce){
       window.__db.failOlderOnce=false;
       return Promise.resolve({data:null,error:{message:'Simulated temporary network error'}}).then(resolve,reject);
      }
      if(table==='support_ticket_replies' && state.start===0 && window.__db.failRepliesFirstOnce){
       window.__db.failRepliesFirstOnce=false;
       return Promise.resolve({data:null,error:{message:'Simulated reply load interruption'}}).then(resolve,reject);
      }
      if(table==='support_ticket_replies' && state.start>=40 && window.__db.failRepliesOlderOnce){
       window.__db.failRepliesOlderOnce=false;
       return Promise.resolve({data:null,error:{message:'Simulated older reply fetch error'}}).then(resolve,reject);
      }
      if(state.countOnly)return Promise.resolve({data:null,count:rows.length,error:null}).then(resolve,reject);
      rows.sort((a,b)=>{
       for(const [field,ascending] of state.orders){
        const left=a[field]??'',right=b[field]??'';
        const cmp=left<right?-1:left>right?1:0;
        if(cmp)return ascending?cmp:-cmp;
       }
       return 0;
      });
      if(state.end!==null)rows=rows.slice(state.start,state.end+1);
      else if(state.limit!==null)rows=rows.slice(0,state.limit);
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

test('T7.6: same-account beta feedback draft survives closing support and can be discarded',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await page.locator('#supportFeedbackKind').selectOption('category');
 await page.locator('#supportSubject').fill('Please add model kits');
 await page.locator('#supportDescription').fill('Synthetic request for Gundam models and other hobby collectibles.');
 await expect(page.locator('#supportFeedbackDiscard')).toBeVisible();
 await page.locator('#supportClose').click();
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await expect(page.locator('#supportFeedbackKind')).toHaveValue('category');
 await expect(page.locator('#supportSubject')).toHaveValue('Please add model kits');
 await expect(page.locator('#supportDescription')).toHaveValue(/Gundam models/);
 await page.locator('#supportFeedbackDiscard').click();
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await expect(page.locator('#supportFeedbackDiscard')).toBeHidden();
 await page.locator('#supportSubject').fill('Add retro game manuals');
 await page.locator('#supportDescription').fill('Synthetic request for vintage game manuals and strategy guides.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('[Bug] Add retro game manuals');
 await page.locator('#supportClose').click();
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await expect(page.locator('#supportFeedbackDiscard')).toBeHidden();
});

test('T7.6: search feedback cannot overwrite an unsent draft or expose it after account change',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await page.locator('#supportFeedbackKind').selectOption('idea');
 await page.locator('#supportSubject').fill('Improve sports memorabilia search');
 await page.locator('#supportDescription').fill('Synthetic draft about signed jerseys and vintage collectibles.');
 await page.locator('#supportClose').click();
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{detail:{
  outcome:'empty',category:'Video Games',hasFilters:true
 }})));
 await expect(page.locator('#supportSubject')).toHaveValue('Improve sports memorabilia search');
 await expect(page.locator('#supportDescription')).toHaveValue(/signed jerseys/);
 await expect(page.locator('#supportCreateStatus')).toContainText('Discard it before starting');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await expect(page.locator('#supportFeedbackDiscard')).toBeHidden();
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

test('T8.3: collector can browse all older private tickets with server-side filters',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  const now=Date.now();
  for(let i=0;i<95;i++){
   const timestamp=new Date(now-i*60000).toISOString();
   window.__db.tickets.push({
    id:'buyer-'+String(i).padStart(3,'0'),owner_id:'buyer',category:'listing',
    subject:'Buyer collectible ticket '+String(i).padStart(3,'0'),
    body:'Synthetic private support history',status:i%3===0?'resolved':'open',
    created_at:timestamp,updated_at:timestamp
   });
  }
  for(let i=0;i<7;i++){
   const timestamp=new Date(now-i*60000).toISOString();
   window.__db.tickets.push({
    id:'other-'+i,owner_id:'other',category:'account',subject:'Other collector private '+i,
    body:'Never visible to buyer',status:'open',created_at:timestamp,updated_at:timestamp
   });
  }
 });
 await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
 await expect(page.locator('#supportLoadMore')).toBeVisible();
 await page.locator('#supportLoadMore').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(80);
 await page.locator('#supportLoadMore').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(95);
 await expect(page.locator('#supportLoadMore')).toBeHidden();
 await expect(page.locator('#supportTicketList')).not.toContainText('Other collector private');
 await page.locator('[data-support-filter="resolved"]').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(32);
 await expect(page.locator('#supportLoadMore')).toBeHidden();
 await expect(page.locator('#supportTicketList')).not.toContainText('Other collector private');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(7);
 await expect(page.locator('#supportTicketList')).not.toContainText('Buyer collectible ticket');
 await expect(page.locator('#supportLoadMore')).toBeHidden();
});

test('T8.3: failed older-ticket page can be retried without losing visible tickets',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  for(let i=0;i<44;i++){
   const timestamp=new Date(Date.now()-i*60000).toISOString();
   window.__db.tickets.push({
    id:'older-'+i,owner_id:'buyer',category:'other',subject:'Historical collectible help '+i,
    body:'Synthetic history',status:'open',created_at:timestamp,updated_at:timestamp
   });
  }
 });
 await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
 await page.evaluate(()=>{window.__db.failOlderOnce=true});
 await page.locator('#supportLoadMore').click();
 await expect(page.locator('#supportListStatus')).toHaveText('Could not load older tickets. Retry.');
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
 await expect(page.locator('#supportLoadMore')).toBeEnabled();
 await page.locator('#supportLoadMore').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(44);
 await expect(page.locator('#supportLoadMore')).toBeHidden();
});

test('T8.3: 125 private replies load newest first and reveal older history without leaking accounts',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>{
  const start=Date.parse('2026-10-01T00:00:00Z');
  window.__db.tickets.push({id:'long-thread',owner_id:'buyer',category:'account',subject:'Long synthetic support conversation',body:'Synthetic support history, no real users.',status:'open',created_at:new Date(start).toISOString(),updated_at:new Date(start+125000).toISOString()});
  for(let i=0;i<125;i++)window.__db.replies.push({id:'reply-'+String(i).padStart(3,'0'),ticket_id:'long-thread',author_id:i%2?'staff':'buyer',is_staff:!!(i%2),body:'Synthetic reply '+String(i).padStart(3,'0'),created_at:new Date(start+i*1000).toISOString()});
 });
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportTicketList button').first().click();
 await expect(page.locator('#supportReplies article')).toHaveCount(40);
 await expect(page.locator('#supportReplies article').last()).toContainText('Synthetic reply 124');
 await expect(page.locator('#supportReplies article').first()).toContainText('Synthetic reply 085');
 await page.evaluate(()=>window.__db.failRepliesOlderOnce=true);
 await page.locator('#supportRepliesLoadMore').click();
 await expect(page.locator('#supportRepliesStatus')).toContainText('Retry');
 await expect(page.locator('#supportReplies article')).toHaveCount(40);
 for(const expected of [80,120,125]){
  await page.locator('#supportRepliesLoadMore').click();
  await expect(page.locator('#supportReplies article')).toHaveCount(expected);
 }
 await expect(page.locator('#supportReplies article').first()).toContainText('Synthetic reply 000');
 await expect(page.locator('#supportReplies article').last()).toContainText('Synthetic reply 124');
 await expect(page.locator('#supportRepliesLoadMore')).toBeHidden();
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportReplies')).toBeEmpty();
 await expect(page.locator('#supportRepliesLoadMore')).toBeHidden();
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList')).not.toContainText('Long synthetic support conversation');
});

test('T8.3: switching support tickets preserves only the matching unsent reply draft',async({page})=>{
  await boot(page);await signIn(page,'buyer');
  await page.evaluate(()=>{
    for(const [id,subject] of [['ticket-alpha','Alpha account help'],['ticket-beta','Beta video game help']]){
      window.__db.tickets.push({id,owner_id:'buyer',category:'other',subject,body:'Synthetic private help details.',status:'open',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
    }
  });
  await page.getByRole('button',{name:'Help & support'}).last().click();
  await expect(page.locator('#supportTicketList button')).toHaveCount(2);
  await page.locator('#supportTicketList button').filter({hasText:'Alpha account help'}).click();
  await page.locator('#supportReplyBody').fill('Unsent reply about my account');
  await page.locator('#supportTicketList button').filter({hasText:'Beta video game help'}).click();
  await expect(page.locator('#supportReplyBody')).toBeEmpty();
  await page.locator('#supportReplyBody').fill('Unsent reply about my video game');
  await page.locator('#supportTicketList button').filter({hasText:'Alpha account help'}).click();
  await expect(page.locator('#supportReplyBody')).toHaveValue('Unsent reply about my account');
  await page.locator('#supportTicketList button').filter({hasText:'Beta video game help'}).click();
  await expect(page.locator('#supportReplyBody')).toHaveValue('Unsent reply about my video game');
  await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
  await page.getByRole('button',{name:'Help & support'}).last().click();
  await expect(page.locator('#supportTicketList')).not.toContainText('Alpha account help');
  await expect(page.locator('#supportReplyBody')).toBeEmpty();
});

test('T8.3: delayed reply success clears only its ticket draft, not another ticket draft',async({page})=>{
  await boot(page);await signIn(page,'buyer');
  await page.evaluate(()=>{
    for(const [id,subject] of [['ticket-alpha','Alpha card help'],['ticket-beta','Beta sports help']]){
      window.__db.tickets.push({id,owner_id:'buyer',category:'other',subject,body:'Synthetic collectible help details.',status:'open',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
    }
    const original=window.supabaseClient.rpc;
    window.supabaseClient.rpc=(name,args)=>{
      if(name!=='reply_support_ticket')return original(name,args);
      return new Promise(resolve=>{window.__releaseSupportReply=()=>original(name,args).then(resolve);});
    };
  });
  await page.getByRole('button',{name:'Help & support'}).last().click();
  await page.locator('#supportTicketList button').filter({hasText:'Alpha card help'}).click();
  await page.locator('#supportReplyBody').fill('Sending an alpha ticket reply');
  await page.getByRole('button',{name:'Send reply'}).click();
  await expect(page.locator('#supportReplyStatus')).toHaveText('Sending…');
  await page.locator('#supportTicketList button').filter({hasText:'Beta sports help'}).click();
  await page.locator('#supportReplyBody').fill('Keep this beta draft untouched');
  await page.evaluate(()=>window.__releaseSupportReply());
  await expect(page.locator('#supportReplyForm button[type="submit"]')).toBeEnabled();
  await expect(page.locator('#supportReplyBody')).toHaveValue('Keep this beta draft untouched');
  await page.locator('#supportTicketList button').filter({hasText:'Alpha card help'}).click();
  await expect(page.locator('#supportReplyBody')).toBeEmpty();
  await expect(page.locator('#supportReplies')).toContainText('Sending an alpha ticket reply');
  await page.locator('#supportTicketList button').filter({hasText:'Beta sports help'}).click();
  await expect(page.locator('#supportReplyBody')).toHaveValue('Keep this beta draft untouched');
});


test('T8.4: signed-out collector requests a private moderation review without automatic reversal',async({page})=>{
 await boot(page);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.getByText('What if my listing or account was restricted?').click();
 await expect(page.getByText('Sending a request does not automatically reverse a restriction.')).toBeVisible();
 await page.getByRole('button',{name:'Request a moderation review'}).click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await signIn(page,'buyer');
 await page.evaluate(()=>closeModal('authModal'));
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportCategory')).toHaveValue('safety');
 await expect(page.locator('#supportSubject')).toHaveValue('Request a moderation review');
 await page.locator('#supportDescription').fill('Please review the restriction on my synthetic sports-card listing.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('Request a moderation review');
 const ticket=await page.evaluate(()=>window.__db.tickets.at(-1));
 expect(ticket).toMatchObject({owner_id:'buyer',category:'safety',subject:'Request a moderation review',status:'open'});
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await expect(page.locator('#supportTicketBody')).toBeEmpty();
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList')).not.toContainText('Request a moderation review');
});
test('T8.4: canceling moderation-review sign-in does not reopen a private ticket later',async({page})=>{
 await boot(page);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.getByText('What if my listing or account was restricted?').click();
 await page.getByRole('button',{name:'Request a moderation review'}).click();
 await page.locator('[data-close="authModal"]').click();
 await page.evaluate(()=>closeModal('authModal'));
 await signIn(page,'buyer');
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
});

const LISTING_REPORT_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function openSyntheticListingReport(page,id=LISTING_REPORT_ID){
 await page.evaluate(id=>{
  let detail=document.getElementById('detailContent');
  if(!detail){detail=document.createElement('div');detail.id='detailContent';document.body.append(detail)}
  const button=document.createElement('button');
  button.type='button';button.textContent='Report listing';
  button.dataset.reportListing=id;
  detail.replaceChildren(button);
 },id);
 await page.locator('#detailContent [data-report-listing]').click();
}
test('T8.4: signed-in buyer files a reason-coded private report tied to the exact listing',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await openSyntheticListingReport(page);
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportNewTitle')).toHaveText('Report this listing privately');
 await expect(page.locator('#supportCategory')).toHaveValue('safety');
 await expect(page.locator('#supportListingReportFields')).toBeVisible();
 await expect(page.locator('#supportReportListingIdentifier')).toContainText(LISTING_REPORT_ID);
 await expect(page.locator('#supportSubject')).toHaveValue('Listing report for safety review');
 await expect(page.locator('#supportSubject')).toHaveAttribute('readonly','');
 await page.locator('#supportReportReason').selectOption('counterfeit');
 await page.locator('#supportDescription').fill('The card photo and serial number do not match the claimed edition.');
 await page.getByRole('button',{name:'Send listing report'}).click();
 await expect(page.locator('#supportCreateStatus')).toHaveText('Ticket created. You can follow replies below.');
 const data=await page.evaluate(()=>window.__db);
 expect(data.tickets).toHaveLength(1);
 expect(data.tickets[0].owner_id).toBe('buyer');
 expect(data.tickets[0].category).toBe('safety');
 expect(data.tickets[0].subject).toBe('Listing report for safety review');
 expect(data.tickets[0].body).toContain('Listing ID: '+LISTING_REPORT_ID);
 expect(data.tickets[0].body).toContain('Reason: Counterfeit or misrepresented collectible');
 expect(data.tickets[0].body).toContain('serial number');
 expect(data.calls.filter(call=>call.name==='create_support_ticket')).toHaveLength(1);
 expect(data.calls.filter(call=>call.name.includes('ban')||call.name.includes('delete')||call.name.includes('moderate'))).toHaveLength(0);
 await expect(page.locator('#supportListingReportFields')).toBeHidden();
 await expect(page.locator('#supportSubject')).not.toHaveAttribute('readonly','');
});
test('T8.4: signed-out listing report returns after sign-in with only public listing ID preserved',async({page})=>{
 await boot(page);
 await openSyntheticListingReport(page);
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await signIn(page,'buyer');
 await page.evaluate(()=>closeModal('authModal'));
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportReportListingIdentifier')).toContainText(LISTING_REPORT_ID);
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await page.locator('#supportReportReason').selectOption('scam');
 await page.locator('#supportDescription').fill('The seller requested off-platform payment before discussing this item.');
 await page.getByRole('button',{name:'Send listing report'}).click();
 const data=await page.evaluate(()=>window.__db.tickets);
 expect(data).toHaveLength(1);
 expect(data[0].body).toContain('Reason: Possible scam or payment pressure');
 expect(data[0].body).toContain(LISTING_REPORT_ID);
});
test('T8.4: canceling sign-in forgets pending report and later sign-in stays on current page',async({page})=>{
 await boot(page);
 await openSyntheticListingReport(page);
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 await page.locator('[data-close="authModal"]').click();
 await page.evaluate(()=>closeModal('authModal'));
 await signIn(page,'buyer');
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await expect(page.locator('#supportListingReportFields')).toBeHidden();
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportNewTitle')).toHaveText('Open a new support ticket');
 await expect(page.locator('#supportSubject')).toBeEmpty();
});
test('T8.4: account switch clears report draft and invalid listing IDs cannot start a report',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await openSyntheticListingReport(page);
 await page.locator('#supportDescription').fill('Private note about a suspected counterfeit collection.');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportListingReportFields')).toBeHidden();
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await page.getByRole('button',{name:'Close help and support'}).click();
 await openSyntheticListingReport(page,'not-a-listing-id');
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>window.__db.tickets)).toHaveLength(0);
});

test('T8.4: staff safety queue filters reports before pagination and does not expose them to ordinary buyers',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  for(let i=0;i<90;i++){
   const safety=i<65;
   const date=new Date(Date.now()-i*1000).toISOString();
   window.__db.tickets.push({
    id:'queued-'+String(i).padStart(3,'0'),
    owner_id:'other',
    category:safety?'safety':'account',
    subject:safety?'Synthetic counterfeit report '+i:'Unrelated account issue '+i,
    body:'Synthetic test data only',
    status:i%9===0?'resolved':'open',
    created_at:date,updated_at:date
   });
  }
 });
 await signIn(page,'staff');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportStaffSafety')).toBeVisible();
 await page.locator('#supportStaffSafety').click();
 await expect(page.locator('#supportStaffSafety')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
 await expect(page.locator('#supportLoadMore')).toBeVisible();
 await page.locator('#supportLoadMore').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(65);
 await expect(page.locator('#supportTicketList')).toContainText('Synthetic counterfeit report');
 await expect(page.locator('#supportTicketList')).not.toContainText('Unrelated account issue');
 await page.locator('#supportStaff').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
 await expect(page.locator('#supportStaffSafety')).toHaveAttribute('aria-pressed','false');
 await page.locator('#supportLoadMore').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(80);
 await expect(page.locator('#supportTicketList')).toContainText('Unrelated account issue');
 await page.evaluate(()=>{window.currentUser={id:'buyer'};window.__authCallback('SIGNED_IN',{user:{id:'buyer'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportStaffSafety')).toBeHidden();
 await expect(page.locator('#supportStaff')).toBeHidden();
 await expect(page.locator('#supportTicketList')).not.toContainText('Synthetic counterfeit report');
});
test('T8.4: private staff safety queue combines status filters before selecting the first 40 rows',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  for(let i=0;i<86;i++){
   const timestamp=new Date(Date.now()-i*1000).toISOString();
   window.__db.tickets.push({
    id:'safety-'+i,owner_id:'other',category:'safety',
    subject:'Safety item '+i,body:'Synthetic evidence marker',
    status:i%2===0?'resolved':'open',
    created_at:timestamp,updated_at:timestamp
   });
  }
 });
 await signIn(page,'staff');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportStaffSafety').click();
 await page.locator('[data-support-filter="resolved"]').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
 await expect(page.locator('#supportLoadMore')).toBeVisible();
 await page.locator('#supportLoadMore').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(43);
 await expect(page.locator('#supportLoadMore')).toBeHidden();
 await expect(page.locator('#supportTicketList')).not.toContainText('Safety item 1 —');
 await page.locator('[data-support-filter="active"]').click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
 await expect(page.locator('#supportLoadMore')).toBeVisible();
 await page.locator('#supportMine').click();
 await expect(page.locator('#supportTicketList')).not.toContainText('Safety item');
 await expect(page.locator('#supportStaffSafety')).toHaveAttribute('aria-pressed','false');
});

test('T7.5: marketplace empty results offer explicit opt-in feedback, never silent telemetry',async({page})=>{
 const html=require('node:fs').readFileSync(path.resolve(__dirname,'../../index.html'),'utf8');
 expect(html).toContain('data-market-search-feedback="empty"');
 expect(html).toContain('data-market-search-feedback="results"');
 expect(html).toContain('deckplay:search-feedback');
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{detail:{
  outcome:'empty',category:'Trading Cards',hasText:true,hasGame:true,hasPrice:false,hasExtra:true,
  rawQuery:'SECRET PRIVATE SEARCH TERMS',listingId:'SECRET LISTING ID'
 }})));
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportSubject')).toHaveValue('Improve marketplace search results');
 await expect(page.locator('#supportDescription')).toHaveValue(/Category: Trading Cards/);
 const body=await page.locator('#supportDescription').inputValue();
 expect(body).toContain('Used game filter: yes');
 expect(body).not.toContain('SECRET');
 expect(body).toContain('What I hoped to find:');
 expect(await page.evaluate(()=>window.__db.calls.filter(x=>x.name==='create_support_ticket'))).toHaveLength(0);
 await page.locator('#supportDescription').fill(body+'A missing collectible from the supported category.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('Ticket created');
 const ticket=await page.evaluate(()=>window.__db.tickets[0]);
 expect(ticket.category).toBe('other');
 expect(ticket.subject).toBe('[Idea] Improve marketplace search results');
 expect(ticket.body).not.toContain('SECRET');
});
test('T7.5: signed-out search feedback and account changes never retain private search context',async({page})=>{
 await boot(page);
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{detail:{
  outcome:'results',category:'<private term>',hasText:true,hasGame:true,hasPrice:true,hasExtra:true,
  rawQuery:'SECRET SHOULD NEVER BE COPIED'
 }})));
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportSignIn')).toBeVisible();
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await page.locator('#supportSignInButton').click();
 await expect(page.locator('#authModal')).toHaveClass(/open/);
 await signIn(page,'buyer');
 await page.evaluate(()=>closeModal('authModal'));
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{detail:{
  outcome:'results',category:'Video Games',hasText:false,hasGame:false,hasPrice:true,hasExtra:false
 }})));
 await expect(page.locator('#supportSubject')).toHaveValue('Improve listing discovery');
 const body=await page.locator('#supportDescription').inputValue();
 expect(body).toContain('Category: Video Games');
 expect(body).not.toContain('SECRET');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await expect(page.locator('#supportDescription')).toBeEmpty();
 expect(await page.evaluate(()=>window.__db.tickets)).toHaveLength(0);
});

test('T7.5: listing-detail contact friction is opt-in, private and category-only',async({page})=>{
 const html=require('node:fs').readFileSync(path.resolve(__dirname,'../../index.html'),'utf8');
 expect(html).toContain('data-listing-discovery-feedback="${escapeHtml(item.c||"All")}"');
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>{
  const detail=document.createElement('div');
  detail.id='detailModal';detail.className='modal open';
  detail.innerHTML='<div id="detailContent"><button type="button" data-listing-discovery-feedback="Video Games">What would help you contact this seller?</button></div>';
  document.body.append(detail);
 });
 await page.locator('[data-listing-discovery-feedback]').click();
 await expect(page.locator('#detailModal')).not.toHaveClass(/open/);
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportSubject')).toHaveValue('Improve listing contact experience');
 const body=await page.locator('#supportDescription').inputValue();
 expect(body).toContain('Category: Video Games');
 expect(body).toContain('What would help me contact the seller:');
 expect(body).not.toMatch(/Listing ID|Seller ID|Account ID/);
 expect(await page.evaluate(()=>window.__db.calls.filter(x=>x.name==='create_support_ticket'))).toHaveLength(0);
 await page.locator('#supportDescription').fill(body+'I need clearer condition photos and an explanation of trade terms.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('Ticket created');
 const ticket=await page.evaluate(()=>window.__db.tickets[0]);
 expect(ticket.category).toBe('other');
 expect(ticket.subject).toBe('[Idea] Improve listing contact experience');
 expect(ticket.body).not.toContain('Listing ID:');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportDescription')).toBeEmpty();
});
test('T7.5: signed-out detail feedback never carries listing metadata into a later account',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  const detail=document.createElement('div');
  detail.id='detailModal';detail.className='modal open';
  detail.innerHTML='<div id="detailContent"><button type="button" data-listing-discovery-feedback="SECRET PRIVATE CATEGORY">Tell us more</button></div>';
  document.body.append(detail);
 });
 await page.locator('[data-listing-discovery-feedback]').click();
 await expect(page.locator('#supportSignIn')).toBeVisible();
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await page.locator('#supportSignInButton').click();
 await signIn(page,'buyer');
 await page.evaluate(()=>closeModal('authModal'));
 await expect(page.locator('#supportCenterModal')).toHaveClass(/open/);
 await expect(page.locator('#supportDescription')).toBeEmpty();
 expect(await page.evaluate(()=>window.__db.tickets)).toHaveLength(0);
});


test('T8.2 staff receives exact live ticket and safety totals with account isolation',async({page})=>{
 await boot(page);
 await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 for(const [topic,subject] of [['safety','Synthetic safety report'],['listing','Synthetic listing assistance']]){
  await page.locator('#supportCategory').selectOption(topic);
  await page.locator('#supportSubject').fill(subject);
  await page.locator('#supportDescription').fill('Synthetic test support request without any personal information.');
  await page.getByRole('button',{name:'Create private ticket'}).click();
 }
 await expect(page.locator('#supportStaffOverview')).toBeHidden();
 await page.evaluate(()=>{window.currentUser={id:'staff'};window.__authCallback('SIGNED_IN',{user:{id:'staff'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportStaffOverview')).toBeVisible();
 await expect(page.locator('#supportStaffOpenCount')).toHaveText('2');
 await expect(page.locator('#supportStaffSafetyCount')).toHaveText('1');
 await page.locator('#supportStaffSafety').click();
 await page.locator('#supportTicketList button').filter({hasText:'Synthetic safety report'}).click();
 await page.locator('#supportStatusSelect').selectOption('resolved');
 await page.getByRole('button',{name:'Save status'}).click();
 await expect(page.locator('#supportStaffOpenCount')).toHaveText('1');
 await expect(page.locator('#supportStaffSafetyCount')).toHaveText('0');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportStaffOverview')).toBeHidden();
 await expect(page.locator('#supportStaffOpenCount')).toHaveText('—');
 await expect(page.locator('#supportStaffSafetyCount')).toHaveText('—');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportStaffOverview')).toBeHidden();
});

test('T8.3: a successful in-flight reply preserves newer text in the same ticket',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportSubject').fill('Delayed reply regression');
 await page.locator('#supportDescription').fill('A synthetic support ticket for delayed reply behavior.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('Delayed reply regression');
 await page.evaluate(()=>{
  const original=window.supabaseClient.rpc.bind(window.supabaseClient);
  window.__replyRelease=null;
  const gate=new Promise(resolve=>{window.__replyRelease=resolve});
  window.supabaseClient.rpc=async(name,args)=>{
   if(name==='reply_support_ticket')await gate;
   return original(name,args);
  };
 });
 await page.locator('#supportReplyBody').fill('First reply is already on its way.');
 await page.getByRole('button',{name:'Send reply'}).click();
 await expect(page.locator('#supportReplyStatus')).toHaveText('Sending…');
 await page.locator('#supportReplyBody').fill('Second draft written while the first is sending.');
 await page.evaluate(()=>window.__replyRelease());
 await expect(page.locator('#supportReplyStatus')).toContainText('newer draft is saved');
 await expect(page.locator('#supportReplyBody')).toHaveValue('Second draft written while the first is sending.');
 const before=await page.evaluate(()=>window.__db.replies.map(row=>row.body));
 expect(before).toEqual(['First reply is already on its way.']);
 await page.getByRole('button',{name:'Send reply'}).click();
 await expect(page.locator('#supportReplyStatus')).toHaveText('Reply sent.');
 const after=await page.evaluate(()=>window.__db.replies.map(row=>row.body));
 expect(after).toEqual(['First reply is already on its way.','Second draft written while the first is sending.']);
 await expect(page.locator('#supportReplyBody')).toBeEmpty();
});

test('T7.5: zero-inventory feedback distinguishes no stock from filtered misses without private telemetry',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{detail:{
  outcome:'empty',category:'All',hasFilters:false,hasText:false,hasGame:false,hasPrice:false,hasExtra:false,
  rawQuery:'PRIVATE SEARCH',listingId:'PRIVATE LISTING'
 }})));
 await expect(page.locator('#supportSubject')).toHaveValue('Improve marketplace search results');
 let body=await page.locator('#supportDescription').inputValue();
 expect(body).toContain('Outcome: No listings available yet');
 expect(body).not.toContain('PRIVATE');
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket'))).toHaveLength(0);
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{detail:{
  outcome:'empty',category:'Collectibles',hasFilters:true,hasText:true
 }})));
 body=await page.locator('#supportDescription').inputValue();
 expect(body).toContain('Outcome: No matching listings');
 expect(body).toContain('Category: Collectibles');
 expect(body).not.toContain('PRIVATE');
 await page.locator('#supportDescription').fill(body+'I could not find vintage action figures.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('Ticket created');
 const ticket=await page.evaluate(()=>window.__db.tickets.at(-1));
 expect(ticket.category).toBe('other');
 expect(ticket.body).not.toContain('PRIVATE');
});


test('T8.3: ticket topic filters match older private tickets before pagination on mobile and desktop',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>{
  window.__db.tickets=Array.from({length:45},(_,i)=>({
   id:'topic-'+i,owner_id:'buyer',category:i===44?'listing':'account',
   subject:i===44?'Older video-game listing photo issue':'Account request '+i,
   body:'Synthetic private support details',status:'open',
   created_at:new Date(Date.now()-i*1000).toISOString(),
   updated_at:new Date(Date.now()-i*1000).toISOString()
  }));
 });
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
 await expect(page.locator('#supportTicketList')).not.toContainText('Older video-game listing photo issue');
 await page.locator('#supportTicketCategory').selectOption('listing');
 await expect(page.locator('#supportTicketList button')).toHaveCount(1);
 await expect(page.locator('#supportTicketList')).toContainText('Older video-game listing photo issue');
 await page.locator('#supportTicketList button').first().click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('Older video-game listing photo issue');
 await page.locator('[data-support-filter="resolved"]').click();
 await expect(page.locator('#supportListStatus')).toHaveText('No listings and photos tickets in this view.');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketCategory')).toHaveValue('all');
 await page.locator('#supportTicketCategory').selectOption('listing');
 await expect(page.locator('#supportTicketList')).not.toContainText('Older video-game listing photo issue');
});
test('T8.3: staff safety queue locks topic scope and restores normal filters on exit',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  window.__db.tickets=[
   {id:'safety-1',owner_id:'buyer',category:'safety',subject:'Synthetic unsafe trade report',body:'Synthetic safety report',status:'open',created_at:new Date().toISOString(),updated_at:new Date().toISOString()},
   {id:'account-1',owner_id:'buyer',category:'account',subject:'Synthetic account recovery',body:'Synthetic account help',status:'open',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}
  ];
 });
 await signIn(page,'staff');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportStaffSafety').click();
 await expect(page.locator('#supportTicketCategory')).toHaveValue('safety');
 await expect(page.locator('#supportTicketCategory')).toBeDisabled();
 await expect(page.locator('#supportTicketList')).toContainText('Synthetic unsafe trade report');
 await expect(page.locator('#supportTicketList')).not.toContainText('Synthetic account recovery');
 await page.locator('#supportStaff').click();
 await expect(page.locator('#supportTicketCategory')).toBeEnabled();
 await expect(page.locator('#supportTicketCategory')).toHaveValue('all');
 await page.locator('#supportTicketCategory').selectOption('account');
 await expect(page.locator('#supportTicketList')).toContainText('Synthetic account recovery');
 await expect(page.locator('#supportTicketList')).not.toContainText('Synthetic unsafe trade report');
 await page.locator('#supportMine').click();
 await expect(page.locator('#supportTicketCategory')).toHaveValue('all');
 await expect(page.locator('#supportTicketList')).not.toContainText('Synthetic account recovery');
});


test('T7.5: authorized staff sees only opt-in aggregate feedback counts and account switch erases them',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  const subjects=[
   '[Idea] Improve marketplace search results',
   '[Idea] Improve marketplace search results',
   '[Idea] Improve listing discovery',
   '[Idea] Improve listing contact experience',
   '[Feedback] Other collectible suggestion'
  ];
  window.__db.tickets=subjects.map((subject,i)=>({
   id:'feedback-'+i,owner_id:i%2?'buyer':'other',category:'other',subject,
   body:'PRIVATE free text about personal collectible preferences '+i,
   status:'open',created_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }));
  const original=window.supabaseClient.from.bind(window.supabaseClient);
  window.__countSelects=[];
  window.supabaseClient.from=table=>{
   const query=original(table),select=query.select.bind(query);
   query.select=(fields,options={})=>{
    if(options.head===true)window.__countSelects.push({table,fields,options});
    return select(fields,options);
   };
   return query;
  };
 });
 await signIn(page,'staff');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportFeedbackEmptyCount')).toHaveText('2');
 await expect(page.locator('#supportFeedbackDiscoveryCount')).toHaveText('1');
 await expect(page.locator('#supportFeedbackContactCount')).toHaveText('1');
 await expect(page.locator('#supportFeedbackOverview')).not.toContainText('PRIVATE free text');
 await expect(page.locator('#supportFeedbackOverview')).toContainText('not all searches, clicks or conversions');
 const calls=await page.evaluate(()=>window.__countSelects);
 expect(calls.filter(c=>c.table==='support_tickets')).toHaveLength(5);
 expect(calls.every(c=>c.fields==='id'&&c.options.head===true&&c.options.count==='exact')).toBe(true);
 await page.evaluate(()=>{window.currentUser={id:'buyer'};window.__authCallback('SIGNED_IN',{user:{id:'buyer'}})});
 await expect(page.locator('#supportStaffOverview')).toBeHidden();
 await expect(page.locator('#supportFeedbackEmptyCount')).toHaveText('—');
 await expect(page.locator('#supportFeedbackDiscoveryCount')).toHaveText('—');
 await expect(page.locator('#supportFeedbackContactCount')).toHaveText('—');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportStaffOverview')).toBeHidden();
});

test('T7.5: verified staff can review old opt-in discovery reports without unrelated tickets or pagination loss',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  const now=Date.now();
  window.__db.tickets=Array.from({length:66},(_,i)=>({
   id:'generic-'+i,owner_id:'other',category:'other',subject:'Other collectible question '+i,
   body:'Private unrelated details',status:'open',
   created_at:new Date(now-i*1000).toISOString(),updated_at:new Date(now-i*1000).toISOString()
  }));
  for(let i=0;i<2;i++)window.__db.tickets.push({
   id:'feedback-old-'+i,owner_id:'buyer',category:'other',
   subject:'[Idea] Improve marketplace search results',body:'Private opt-in feedback '+i,
   status:'open',created_at:new Date(now-90000-i*1000).toISOString(),
   updated_at:new Date(now-90000-i*1000).toISOString()
  });
 });
 await signIn(page,'staff');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportFeedbackEmptyCount')).toHaveText('2');
 await page.locator('[data-feedback-queue="empty"]').click();
 await expect(page.locator('#supportFeedbackQueueNotice')).toBeVisible();
 await expect(page.locator('#supportTicketCategory')).toHaveValue('other');
 await expect(page.locator('#supportTicketCategory')).toBeDisabled();
 await expect(page.locator('#supportTicketList button')).toHaveCount(2);
 await expect(page.locator('#supportTicketList')).toContainText('Improve marketplace search results');
 await expect(page.locator('#supportTicketList')).not.toContainText('Other collectible question');
 await page.locator('#supportFeedbackQueueClear').click();
 await expect(page.locator('#supportFeedbackQueueNotice')).toBeHidden();
 await expect(page.locator('#supportTicketCategory')).toBeEnabled();
 await expect(page.locator('#supportTicketList button')).toHaveCount(40);
});
test('T7.5: feedback drill-down is staff-only and never survives account changes',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  window.__db.tickets=[{id:'feedback-one',owner_id:'other',category:'other',
   subject:'[Idea] Improve listing discovery',body:'PRIVATE seller details',status:'open',
   created_at:new Date().toISOString(),updated_at:new Date().toISOString()}];
 });
 await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('[data-feedback-queue="discovery"]')).toBeHidden();
 await page.evaluate(()=>{window.currentUser={id:'staff'};window.__authCallback('SIGNED_IN',{user:{id:'staff'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('[data-feedback-queue="discovery"]').click();
 await expect(page.locator('#supportTicketList')).toContainText('Improve listing discovery');
 await page.evaluate(()=>{window.currentUser={id:'buyer'};window.__authCallback('SIGNED_IN',{user:{id:'buyer'}})});
 await expect(page.locator('#supportFeedbackQueueNotice')).toBeHidden();
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketCategory')).toHaveValue('all');
 await expect(page.locator('#supportTicketCategory')).toBeEnabled();
 await expect(page.locator('#supportTicketList')).not.toContainText('Improve listing discovery');
});


test('T7.6: newer feedback draft survives a delayed successful send and can be submitted separately',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>{
  const original=window.supabaseClient.rpc;
  let delayFirst=true;
  window.__releaseFirstFeedback=null;
  window.supabaseClient.rpc=(name,args)=>{
   if(name==='create_support_ticket'&&delayFirst){
    delayFirst=false;
    const result=original(name,args);
    return new Promise(resolve=>{window.__releaseFirstFeedback=()=>resolve(result)});
   }
   return original(name,args);
  };
  document.dispatchEvent(new Event('deckplay:open-feedback'));
 });
 await page.locator('#supportFeedbackKind').selectOption('idea');
 await page.locator('#supportSubject').fill('Improve video game search');
 await page.locator('#supportDescription').fill('The first suggestion is about video game and console search.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await page.waitForFunction(()=>typeof window.__releaseFirstFeedback==='function');
 await expect(page.getByRole('button',{name:'Send private feedback'})).toBeDisabled();
 await page.locator('#supportSubject').fill('Add console accessory filters');
 await page.locator('#supportDescription').fill('The newer suggestion is about finding console controllers and accessories.');
 await page.evaluate(()=>window.__releaseFirstFeedback());
 await expect(page.locator('#supportCreateStatus')).toHaveText('Ticket created. Your newer draft is preserved.');
 await expect(page.locator('#supportTicketTitle')).toHaveText('[Idea] Improve video game search');
 await expect(page.locator('#supportSubject')).toHaveValue('Add console accessory filters');
 await expect(page.locator('#supportDescription')).toHaveValue('The newer suggestion is about finding console controllers and accessories.');
 await expect(page.getByRole('button',{name:'Send private feedback'})).toBeEnabled();
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('[Idea] Add console accessory filters');
 await expect(page.locator('#supportSubject')).toBeEmpty();
 const calls=await page.evaluate(()=>window.__db.calls.filter(call=>call.name==='create_support_ticket'));
 expect(calls).toHaveLength(2);
 expect(calls.map(call=>call.args.p_subject)).toEqual(['[Idea] Improve video game search','[Idea] Add console accessory filters']);
 expect(calls.every(call=>call.args.p_category==='other')).toBe(true);
});


test('T7.6: old-account feedback response cannot unlock another collector submission',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>{
  const original=window.supabaseClient.rpc;
  window.__feedbackReleases=[];
  window.supabaseClient.rpc=(name,args)=>{
   if(name!=='create_support_ticket')return original(name,args);
   const result=original(name,args);
   return new Promise(resolve=>window.__feedbackReleases.push(()=>resolve(result)));
  };
  document.dispatchEvent(new Event('deckplay:open-feedback'));
 });
 await page.locator('#supportSubject').fill('Buyer marketplace feedback');
 await page.locator('#supportDescription').fill('Private first-account feedback about collectibles.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await page.waitForFunction(()=>window.__feedbackReleases.length===1);
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await expect(page.locator('#supportSubject')).toBeEmpty();
 await page.locator('#supportSubject').fill('Other collector game feedback');
 await page.locator('#supportDescription').fill('Second-account feedback about console accessories.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await page.waitForFunction(()=>window.__feedbackReleases.length===2);
 await page.evaluate(()=>window.__feedbackReleases[0]());
 await expect(page.getByRole('button',{name:'Send private feedback'})).toBeDisabled();
 await expect(page.locator('#supportSubject')).toHaveValue('Other collector game feedback');
 await expect(page.locator('#supportCreateStatus')).toHaveText('Submitting…');
 await page.evaluate(()=>window.__feedbackReleases[1]());
 await expect(page.locator('#supportTicketTitle')).toHaveText('[Bug] Other collector game feedback');
 await expect(page.locator('#supportTicketList')).not.toContainText('Buyer marketplace feedback');
 await expect(page.getByRole('button',{name:'Send private feedback'})).toBeEnabled();
});


test('T8.3: stale reply from another account cannot unlock the current reply',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  window.__db.tickets=[
   {id:'buyer-ticket',owner_id:'buyer',category:'messages',subject:'Buyer private inbox help',body:'First account only',status:'open',created_at:now,updated_at:now},
   {id:'other-ticket',owner_id:'other',category:'listing',subject:'Other collector listing help',body:'Second account only',status:'open',created_at:now,updated_at:now}
  ];
  const original=window.supabaseClient.rpc;
  window.__replyReleases=[];
  window.supabaseClient.rpc=(name,args)=>{
   if(name!=='reply_support_ticket')return original(name,args);
   const result=original(name,args);
   return new Promise(resolve=>window.__replyReleases.push(()=>resolve(result)));
  };
 });
 await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportTicketList button').filter({hasText:'Buyer private inbox help'}).click();
 await page.locator('#supportReplyBody').fill('Private first-account reply.');
 await page.getByRole('button',{name:'Send reply'}).click();
 await page.waitForFunction(()=>window.__replyReleases.length===1);
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await expect(page.locator('#supportCenterModal')).not.toHaveClass(/open/);
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await expect(page.locator('#supportTicketList')).not.toContainText('Buyer private inbox help');
 await page.locator('#supportTicketList button').filter({hasText:'Other collector listing help'}).click();
 await expect(page.getByRole('button',{name:'Send reply'})).toBeEnabled();
 await page.locator('#supportReplyBody').fill('Private second-account reply.');
 await page.getByRole('button',{name:'Send reply'}).click();
 await page.waitForFunction(()=>window.__replyReleases.length===2);
 await page.evaluate(()=>window.__replyReleases[0]());
 await expect(page.getByRole('button',{name:'Send reply'})).toBeDisabled();
 await expect(page.locator('#supportReplyBody')).toHaveValue('Private second-account reply.');
 await expect(page.locator('#supportReplies')).not.toContainText('Private first-account reply.');
 await page.evaluate(()=>window.__replyReleases[1]());
 await expect(page.locator('#supportReplies')).toContainText('Private second-account reply.');
 await expect(page.getByRole('button',{name:'Send reply'})).toBeEnabled();
});

test('T8.3: switching tickets unlocks the new composer but not an older pending response',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  window.__db.tickets=[
   {id:'card-help',owner_id:'buyer',category:'listing',subject:'Card listing support',body:'First ticket',status:'open',created_at:now,updated_at:now},
   {id:'game-help',owner_id:'buyer',category:'listing',subject:'Video game support',body:'Second ticket',status:'open',created_at:now,updated_at:now}
  ];
  const original=window.supabaseClient.rpc;
  window.__replyReleases=[];
  window.supabaseClient.rpc=(name,args)=>{
   if(name!=='reply_support_ticket')return original(name,args);
   const result=original(name,args);
   return new Promise(resolve=>window.__replyReleases.push(()=>resolve(result)));
  };
 });
 await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportTicketList button').filter({hasText:'Card listing support'}).click();
 await page.locator('#supportReplyBody').fill('Question about a graded card.');
 await page.getByRole('button',{name:'Send reply'}).click();
 await page.waitForFunction(()=>window.__replyReleases.length===1);
 await page.locator('#supportTicketList button').filter({hasText:'Video game support'}).click();
 await expect(page.getByRole('button',{name:'Send reply'})).toBeEnabled();
 await page.locator('#supportReplyBody').fill('Question about a game console.');
 await page.getByRole('button',{name:'Send reply'}).click();
 await page.waitForFunction(()=>window.__replyReleases.length===2);
 await page.evaluate(()=>window.__replyReleases[0]());
 await expect(page.getByRole('button',{name:'Send reply'})).toBeDisabled();
 await expect(page.locator('#supportReplyBody')).toHaveValue('Question about a game console.');
 await page.evaluate(()=>window.__replyReleases[1]());
 await expect(page.locator('#supportReplies')).toContainText('Question about a game console.');
 await expect(page.getByRole('button',{name:'Send reply'})).toBeEnabled();
});

test('T8.3: delayed staff status failure cannot unlock or overwrite another ticket save',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    const now=new Date().toISOString();
    window.__db.tickets=[
      {id:'card-status',owner_id:'buyer',category:'listing',subject:'Sports card status question',body:'A sports collectible',status:'open',created_at:now,updated_at:now},
      {id:'game-status',owner_id:'other',category:'listing',subject:'Console status question',body:'A video game collectible',status:'open',created_at:now,updated_at:now}
    ];
    const original=window.supabaseClient.rpc;
    window.__statusReleases=[];
    window.supabaseClient.rpc=(name,args)=>{
      if(name!=='set_support_ticket_status')return original(name,args);
      const result=window.__statusReleases.length===0
        ? {error:{message:'Earlier status save failed'}} : original(name,args);
      return new Promise(resolve=>window.__statusReleases.push(()=>Promise.resolve(result).then(resolve)));
    };
  });
  await signIn(page,'staff');
  await page.getByRole('button',{name:'Help & support'}).last().click();
  await page.locator('#supportStaff').click();
  await page.locator('#supportTicketList button').filter({hasText:'Sports card status question'}).click();
  await page.locator('#supportStatusSelect').selectOption('resolved');
  await page.locator('#supportSetStatus').click();
  await page.waitForFunction(()=>window.__statusReleases.length===1);
  await expect(page.locator('#supportSetStatus')).toBeDisabled();
  await page.locator('#supportTicketList button').filter({hasText:'Console status question'}).click();
  await expect(page.locator('#supportSetStatus')).toBeEnabled();
  await page.locator('#supportStatusSelect').selectOption('waiting_on_user');
  await page.locator('#supportSetStatus').click();
  await page.waitForFunction(()=>window.__statusReleases.length===2);
  await page.evaluate(()=>window.__statusReleases[0]());
  await expect(page.locator('#supportSetStatus')).toBeDisabled();
  await expect(page.locator('#supportTicketTitle')).toHaveText('Console status question');
  await expect(page.locator('#supportReplyStatus')).not.toContainText('Earlier status save failed');
  await page.evaluate(()=>window.__statusReleases[1]());
  await expect(page.locator('#supportSetStatus')).toBeEnabled();
  await expect(page.locator('#supportReplyStatus')).toHaveText('Ticket status updated.');
  await expect(page.locator('#supportTicketState')).toContainText('Waiting on collector');
  await page.evaluate(()=>{if(window.__db.tickets.find(t=>t.id==='card-status').status!=='open')throw Error('Old failed save changed the card ticket');});
});

test('T8.3: ticket topic filters reset after new account ticket so collector can follow it',async({page})=>{
  await boot(page);await signIn(page,'buyer');
  await page.getByRole('button',{name:'Help & support'}).last().click();
  await page.locator('#supportTicketCategory').selectOption('listing');
  await expect(page.locator('#supportTicketCategory')).toHaveValue('listing');
  await page.locator('#supportCategory').selectOption('account');
  await page.locator('#supportSubject').fill('Account access for game collecting');
  await page.locator('#supportDescription').fill('I need private help signing in to manage my game collection.');
  await page.getByRole('button',{name:'Create private ticket'}).click();
  await expect(page.locator('#supportTicketTitle')).toHaveText('Account access for game collecting');
  await expect(page.locator('#supportTicketCategory')).toHaveValue('all');
  await expect(page.locator('#supportTicketCategory')).toBeEnabled();
  await expect(page.locator('#supportTicketList')).toContainText('Account access for game collecting');
  await expect(page.locator('#supportCreateStatus')).toContainText('Ticket created.');
  await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
  await page.getByRole('button',{name:'Help & support'}).last().click();
  await expect(page.locator('#supportTicketList')).not.toContainText('Account access for game collecting');
});

test('T8.3: ticket topic filters clear staff feedback drill-down after creating private ticket',async({page})=>{
  await boot(page);await signIn(page,'staff');
  await page.getByRole('button',{name:'Help & support'}).last().click();
  await expect(page.locator('#supportStaff')).toBeVisible();
  await page.locator('#supportStaff').click();
  await page.locator('[data-feedback-queue="empty"]').click();
  await expect(page.locator('#supportTicketCategory')).toHaveValue('other');
  await expect(page.locator('#supportTicketCategory')).toBeDisabled();
  await expect(page.locator('#supportFeedbackQueueNotice')).toBeVisible();
  await page.locator('#supportSubject').fill('Staff account help request');
  await page.locator('#supportDescription').fill('I need private help with a collector account on the marketplace.');
  await page.getByRole('button',{name:'Create private ticket'}).click();
  await expect(page.locator('#supportTicketTitle')).toHaveText('Staff account help request');
  await expect(page.locator('#supportTicketCategory')).toHaveValue('all');
  await expect(page.locator('#supportTicketCategory')).toBeEnabled();
  await expect(page.locator('#supportFeedbackQueueNotice')).toBeHidden();
  await expect(page.locator('#supportStaffSafety')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#supportTicketList')).toContainText('Staff account help request');
});

test('T8.3: collector tickets load while optional staff authorization is pending',async({page})=>{
 await boot(page);
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  window.__db.tickets.push({id:'pending-role-ticket',owner_id:'buyer',category:'listing',
   subject:'Vintage console listing help',body:'Private buyer-only request',
   status:'open',created_at:now,updated_at:now});
  const original=window.supabaseClient.rpc.bind(window.supabaseClient);
  window.__releaseStaffRole=[];
  window.supabaseClient.rpc=(name,args)=>{
   if(name==='is_deckplay_moderator')
    return new Promise(resolve=>window.__releaseStaffRole.push(()=>original(name,args).then(resolve)));
   return original(name,args);
  };
 });
 await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.waitForFunction(()=>window.__releaseStaffRole.length===1);
 // The collector must be able to read/reply even if staff MFA is slow or offline.
 await expect(page.locator('#supportTicketList')).toContainText('Vintage console listing help');
 await page.locator('#supportTicketList button').first().click();
 await expect(page.locator('#supportTicketBody')).toHaveText('Private buyer-only request');
 await expect(page.locator('#supportStaff')).toBeHidden();
 await page.locator('#supportReplyBody').fill('Please check the game console photos.');
 await page.getByRole('button',{name:'Send reply'}).click();
 await expect(page.locator('#supportReplies')).toContainText('Please check the game console photos.');
 await page.evaluate(()=>window.__releaseStaffRole[0]());
 await expect(page.locator('#supportStaff')).toBeHidden();
 // A stale role response cannot expose staff controls after an account switch.
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.waitForFunction(()=>window.__releaseStaffRole.length===2);
 await expect(page.locator('#supportTicketList')).not.toContainText('Vintage console listing help');
 await page.evaluate(()=>window.__releaseStaffRole[1]());
 await expect(page.locator('#supportStaff')).toBeHidden();
});

test('T7.6: selected feedback area is submitted privately and survives same-account drafts',async({page})=>{
 await boot(page);await signIn(page,'seller');
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 const categories=['trading_cards','sports_cards','video_games','consoles','controllers','accessories','collectibles','other'];
 for(const value of categories)await expect(page.locator('#supportFeedbackArea option[value="'+value+'"]')).toHaveCount(1);
 await page.locator('#supportFeedbackKind').selectOption('idea');
 await page.locator('#supportFeedbackArea').selectOption('sports_cards');
 await page.locator('#supportSubject').fill('Sports card condition feedback');
 await page.locator('#supportDescription').fill('A graded sports card should show the exact grading details.');
 await page.locator('#supportClose').click();
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await expect(page.locator('#supportFeedbackArea')).toHaveValue('sports_cards');
 await expect(page.locator('#supportDescription')).toHaveValue('A graded sports card should show the exact grading details.');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportTicketBody')).toContainText('Area: Sports cards');
 const call=await page.evaluate(()=>window.__db.calls.filter(row=>row.name==='create_support_ticket').at(-1));
 expect(call.args.p_category).toBe('other');
 expect(call.args.p_body).toBe('Area: Sports cards\nDetails: A graded sports card should show the exact grading details.');
 // Search feedback sets a fixed marketplace context, without copying search words.
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{
  detail:{outcome:'empty',category:'Trading Cards',hasText:true,hasFilters:true}
 })));
 await expect(page.locator('#supportFeedbackArea')).toHaveValue('marketplace');
 await page.locator('#supportFeedbackArea').selectOption('accessories');
 await page.locator('#supportSubject').fill('Accessory filter improvement');
 await page.locator('#supportDescription').fill('Please add a filter for vintage console accessories.');
 await page.evaluate(()=>{window.currentUser={id:'other'};window.__authCallback('SIGNED_IN',{user:{id:'other'}})});
 await page.evaluate(()=>document.dispatchEvent(new Event('deckplay:open-feedback')));
 await expect(page.locator('#supportFeedbackArea')).toHaveValue('general');
 await expect(page.locator('#supportDescription')).toBeEmpty();
 await expect(page.locator('#supportTicketList')).not.toContainText('Sports card condition feedback');
});

test('T7.6: search feedback requires a collector answer before creating a private ticket',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{
  detail:{outcome:'empty',category:'Trading Cards',hasText:true,hasFilters:true}
 })));
 await expect(page.locator('#supportDescription')).toHaveValue(/What I hoped to find:/);
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('Add what you hoped to find');
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').length)).toBe(0);
 await expect(page.locator('#supportDescription')).toHaveValue(/What I hoped to find:/);
 await page.locator('#supportDescription').fill((await page.locator('#supportDescription').inputValue())+' Vintage sports card singles');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('Ticket created.');
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').length)).toBe(1);
});

test('T7.6: listing contact feedback cannot send an unanswered template',async({page})=>{
 await boot(page);await signIn(page,'seller');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('deckplay:search-feedback',{
  detail:{outcome:'detail',category:'Collectibles'}
 })));
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('what would help you contact the seller');
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').length)).toBe(0);
 await page.locator('#supportDescription').fill((await page.locator('#supportDescription').inputValue())+' Clearer photos of the collectible');
 await page.getByRole('button',{name:'Send private feedback'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('Ticket created.');
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').length)).toBe(1);
});

test('T8.4: oversized listing report retains draft and does not submit',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await openSyntheticListingReport(page);
 await page.locator('#supportReportReason').selectOption('counterfeit');
 await page.locator('#supportDescription').evaluate(el=>{el.maxLength=3000});
 await page.locator('#supportDescription').fill('x'.repeat(3000));
 await page.getByRole('button',{name:'Send listing report'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('too long');
 await expect(page.locator('#supportDescription')).toHaveValue('x'.repeat(3000));
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').length)).toBe(0);
});

test('T8.3: whitespace-only support replies never reach RPC and preserve draft',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportSubject').fill('Private reply validation');
 await page.locator('#supportDescription').fill('Synthetic ticket to verify support reply validation.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await page.locator('#supportReplyBody').fill('  ');
 await page.getByRole('button',{name:'Send reply'}).click();
 await expect(page.locator('#supportReplyStatus')).toContainText('at least two characters');
 await expect(page.locator('#supportReplyBody')).toHaveValue('  ');
 const replies=await page.evaluate(()=>window.__db.calls.filter(x=>x.name==='reply_support_ticket').length);
 expect(replies).toBe(0);
});

test('T8.3: oversized support reply never reaches RPC and preserves draft',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportSubject').fill('Long reply validation');
 await page.locator('#supportDescription').fill('Synthetic ticket checking the oversized reply protection.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await page.locator('#supportReplyBody').evaluate(el=>{el.maxLength=4000});
 await page.locator('#supportReplyBody').fill('x'.repeat(3001));
 await page.getByRole('button',{name:'Send reply'}).click();
 await expect(page.locator('#supportReplyStatus')).toContainText('too long');
 await expect(page.locator('#supportReplyBody')).toHaveValue('x'.repeat(3001));
 expect(await page.evaluate(()=>window.__db.calls.filter(x=>x.name==='reply_support_ticket').length)).toBe(0);
});

test('trimmed support details cannot create empty or misleadingly short tickets',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportSubject').fill('Help with an order');
 // Browser minlength accepts these 20 characters, but the RPC would receive empty text.
 await page.locator('#supportDescription').fill(' '.repeat(20));
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('at least 20 characters of meaningful detail');
 await expect(page.locator('#supportDescription')).toHaveValue(' '.repeat(20));
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').length)).toBe(0);
 await page.locator('#supportDescription').fill('   Too short   '.padEnd(20,' '));
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportCreateStatus')).toContainText('at least 20 characters of meaningful detail');
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').length)).toBe(0);
 await page.locator('#supportDescription').fill('A real support issue with enough detail.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('Help with an order');
 expect(await page.evaluate(()=>window.__db.calls.filter(c=>c.name==='create_support_ticket').length)).toBe(1);
});

test('T8: failed ticket refresh preserves the last readable list and allows retry',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportSubject').fill('My existing ticket');
 await page.locator('#supportDescription').fill('The seller and buyer cannot find the correct listing.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportTicketList')).toContainText('My existing ticket');
 await page.evaluate(()=>{window.__db.failFirstPageOnce=true});
 await page.locator('#supportRefresh').click();
 await expect(page.locator('#supportListStatus')).toContainText('Tickets could not load');
 await expect(page.locator('#supportTicketList')).toContainText('My existing ticket');
 await page.locator('#supportRefresh').click();
 await expect(page.locator('#supportListStatus')).toContainText('Showing 1');
 await expect(page.locator('#supportTicketList')).toContainText('My existing ticket');
});

test('T8: failed private replies can retry in place without losing ticket or draft',async({page})=>{
 await boot(page);await signIn(page,'buyer');
 await page.getByRole('button',{name:'Help & support'}).last().click();
 await page.locator('#supportSubject').fill('Existing help request');
 await page.locator('#supportDescription').fill('My collectible listing needs assistance with a message.');
 await page.getByRole('button',{name:'Create private ticket'}).click();
 await expect(page.locator('#supportTicketTitle')).toHaveText('Existing help request');
 await page.locator('#supportReplyBody').fill('My unsent reply is important');
 await page.evaluate(()=>{window.__db.failRepliesFirstOnce=true});
 await page.locator('#supportTicketList button').first().click();
 await expect(page.locator('#supportRepliesRetry')).toBeVisible();
 await expect(page.locator('#supportReplies')).toContainText('Replies could not load');
 await expect(page.locator('#supportReplyBody')).toHaveValue('My unsent reply is important');
 await page.locator('#supportRepliesRetry').click();
 await expect(page.locator('#supportRepliesRetry')).toBeHidden();
 await expect(page.locator('#supportReplies')).toContainText('No replies yet.');
 await expect(page.locator('#supportReplyBody')).toHaveValue('My unsent reply is important');
});
