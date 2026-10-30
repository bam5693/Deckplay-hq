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
     eq(field,value){state.filters.push([field,value]);return query},
     then(resolve,reject){
      const all=table==='support_tickets'?window.__db.tickets:window.__db.replies;
      const rows=all.filter(row=>state.filters.every(([k,v])=>row[k]===v))
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
