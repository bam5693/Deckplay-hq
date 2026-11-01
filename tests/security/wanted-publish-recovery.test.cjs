const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

// Isolated, real Wanted submit handler; no Supabase connection or staging writes.
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const start=html.indexOf('let wantedPublishVersion=0,wantedPublishBusy=false,wantedPublishUncertain=null;');
const end=html.indexOf('document.getElementById("wantedGrid").addEventListener("click"',start);
assert.ok(start>=0&&end>start,'Wanted publisher handler found');
const source=html.slice(start,end);
function fixture(steps){
 const fields={
  wantedBudget:{value:'100'},wantedDetails:{value:'Clean copy'},
  wantedCardFields:{hidden:true},wantedNonCardFields:{hidden:true},
  wantedItem:{value:'One Piece Luffy'},wantedGame:{value:'one_piece'},wantedOffer:{value:'buy'}
 };
 const button={disabled:false,textContent:'Publish wanted post'},status={textContent:''};
 const form={
  reset(){this.resets=(this.resets||0)+1},removeAttribute(){},setAttribute(){},
  querySelector(){return button},querySelectorAll(){return Object.values(fields)},
  addEventListener(name,handler){this.handler=handler}
 };
 const env={
  document:{getElementById(id){return id==='wantedForm'?form:id==='wantedStatus'?status:fields[id]||{value:'',checked:false}}},
  currentUser:{id:'owner-a'},messageAccountVersion:2,
  syncWantedCardFields(){},syncWantedOfferFields(){},
  closed:0,loaded:0,toasts:[],writes:[],
  closeModal(){env.closed++},toast(message){env.toasts.push(message)},
  async loadWanted(){env.loaded++},
  globalThis:{crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'}},
  readMarketplaceRequest:async request=>{
   const step=steps.shift();
   assert.ok(step,'expected request step');
   assert.equal(request.kind,step.kind);
   if(typeof step.result==='function')return step.result();
   return step.result;
  }
 };
 env.supabaseClient={from(){return{
  insert(payload){env.writes.push(payload);return{kind:'write',payload}},
  select(){return{eq(){return this},maybeSingle(){return{kind:'check'}}}}
 }}};
 const controls=new Function('env','with(env){'+source+
  ';return {submit:()=>document.getElementById("wantedForm").handler({preventDefault(){},currentTarget:document.getElementById("wantedForm")}),resetWantedPublisher};}')(env);
 return {...controls,env,form,button,status,fields};
}
test('timed-out Wanted publish checks owner row and retries the SAME ID only on another tap',async()=>{
 const f=fixture([
  {kind:'write',result:{error:{message:'timeout'}}},
  {kind:'check',result:{data:null,error:null}},
  {kind:'write',result:{error:null}}
 ]);
 await f.submit();
 assert.equal(f.button.textContent,'Check publish status');
 assert.equal(f.fields.wantedItem.disabled,true);
 await f.submit();
 assert.equal(f.button.textContent,'Retry same post');
 assert.equal(f.env.writes.length,1);
 await f.submit();
 assert.equal(f.env.writes.length,2);
 assert.deepEqual(f.env.writes[0],f.env.writes[1]);
 assert.equal(f.env.closed,1);
 assert.equal(f.form.resets,1);
});
test('confirmed post after timeout never sends another insert',async()=>{
 const f=fixture([
  {kind:'write',result:{error:{message:'timeout'}}},
  {kind:'check',result:{data:{id:'11111111-1111-4111-8111-111111111111'},error:null}}
 ]);
 await f.submit();await f.submit();
 assert.equal(f.env.writes.length,1);
 assert.equal(f.env.closed,1);
 assert.equal(f.env.loaded,1);
});
test('offline status check preserves uncertainty without writing',async()=>{
 const f=fixture([
  {kind:'write',result:{error:{message:'timeout'}}},
  {kind:'check',result:{error:{message:'offline'}}},
  {kind:'check',result:{data:null,error:null}}
 ]);
 await f.submit();await f.submit();
 assert.equal(f.button.textContent,'Check publish status');
 assert.equal(f.env.writes.length,1);
 await f.submit();
 assert.equal(f.button.textContent,'Retry same post');
});
test('duplicate UUID is confirmed by same-owner readback, not assumed successful',async()=>{
 const f=fixture([
  {kind:'write',result:{error:{message:'timeout'}}},
  {kind:'check',result:{data:null,error:null}},
  {kind:'write',result:{error:{code:'23505'}}},
  {kind:'check',result:{data:{id:'11111111-1111-4111-8111-111111111111'},error:null}}
 ]);
 await f.submit();await f.submit();await f.submit();
 assert.equal(f.env.writes.length,2);
 assert.equal(f.env.closed,1);
});
test('old-account response cannot close the new account modal',async()=>{
 let finish;
 const f=fixture([{kind:'write',result:()=>new Promise(resolve=>{finish=resolve})}]);
 const inFlight=f.submit();
 f.env.currentUser={id:'owner-b'};
 f.env.messageAccountVersion++;
 f.resetWantedPublisher();
 finish({error:null});
 await inFlight;
 assert.equal(f.env.closed,0);
 assert.equal(f.env.toasts.length,0);
 assert.equal(f.env.writes.length,1);
 assert.equal(f.button.disabled,false);
});
