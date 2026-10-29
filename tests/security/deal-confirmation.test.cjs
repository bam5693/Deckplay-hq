const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const inbox=html.slice(html.indexOf('document.getElementById("messageInbox").addEventListener("click",async e=>{\n const ownerId='),html.indexOf('\ndocument.getElementById("composeForm")'));
const modal=html.slice(html.indexOf('document.getElementById("tradeOffersList").addEventListener("click",async e=>{'),html.indexOf('\ndocument.getElementById("counterForm")'));
for(const route of ['price','trade','counter','trade-modal'])test(route+' rechecks collector blocks and account generation after confirmation',async()=>{
 for(const change of ['block','account','generation','thread']){
  if(route==='trade-modal'&&change==='thread')continue;
  let handler,calls=0;const card={dataset:{tradeCounterparty:'tanner'},querySelectorAll:()=>[]};
  const button={disabled:false,dataset:{inboxPrice:'accept',inboxTrade:'accepted',inboxCounter:'accept',offer:'offer',tradeAction:'accepted',offerId:'offer',currentAmount:'10'},closest:()=>card};
  const target={closest(selector){if(route==='trade-modal')return selector.includes('[data-trade-action]')?button:null;if(selector.includes(','))return button;return selector==='[data-inbox-'+route+']'?button:null}};
  const context=vm.createContext({currentUser:{id:'jayden'},messageAccountVersion:0,selectedInboxCollector:'tanner',blockedCollectorIds:new Set(),pendingInboxDealActions:new Set(),toast(){},confirm(){if(change==='block')context.blockedCollectorIds.add('tanner');if(change==='account')context.currentUser={id:'charles'};if(change==='generation')context.messageAccountVersion++;if(change==='thread')context.selectedInboxCollector='kyle';return true},document:{getElementById(){return {addEventListener(type,fn){handler=fn}}}},supabaseClient:{rpc(){calls++;return Promise.resolve({error:null})}}});
  vm.runInContext(route==='trade-modal'?modal:inbox,context);await handler({target});assert.equal(calls,0,change);assert.equal(context.pendingInboxDealActions.size,0);
 }
});
