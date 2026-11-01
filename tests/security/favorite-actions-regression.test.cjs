const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function harness(error = null, options = {}) {
  const saved = new Set();
  const notices = [];
  let renders = 0;
  const context = {
    window: {}, currentUser: {id:'user-1'}, listingAccountVersion: 1,
    savedListingsLoadVersion: 0, saved,
    blockedCollectorIds: options.blockedCollectorIds || new Set(),
    navigator: {onLine: options.online !== false},
    items: [{id:'card-1',databaseId:'listing-1'}],
    render: () => { renders++; },
    toast: message => notices.push(message),
    openModal: () => { throw Error('unexpected login prompt'); },
    AbortSignal,
    setTimeout: options.setTimeout || setTimeout,
    clearTimeout: options.clearTimeout || clearTimeout,
    supabaseClient: options.supabaseClient || {from: () => ({
      insert: async () => ({error}),
      delete: () => ({eq: () => ({eq: async () => ({error})})})
    })}
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../favorite-actions.js'),'utf8'),context);
  return {context,saved,notices,get renders(){return renders;}};
}

test('successful favorite save remains saved after request resolves',async()=>{
  const h=harness();
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),true);
  assert.deepEqual(h.notices,['Saved to your account']);
  assert.equal(h.renders,2);
});

test('failed favorite save rolls back optimistic change',async()=>{
  const h=harness({message:'Database rejected save'});
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.deepEqual(h.notices,['Database rejected save']);
});

test('successful removal stays removed',async()=>{
  const h=harness();
  h.saved.add('card-1');
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.deepEqual(h.notices,['Removed from saved items']);
});

test('item without persisted listing ID does not falsely report account save',async()=>{
  const h=harness();
  h.context.items[0].databaseId=null;
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.match(h.notices[0],/cannot be saved to your account/);
});

test('duplicate favorite insert is treated as already saved',async()=>{
  const h=harness({code:'23505',message:'duplicate key'});
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),true);
  assert.deepEqual(h.notices,['Saved to your account']);
});

test('failed favorite removal restores the saved state',async()=>{
  const h=harness({message:'Delete failed'});
  h.saved.add('card-1');
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),true);
  assert.deepEqual(h.notices,['Delete failed']);
});

test('a timed-out save checks persisted state before any second write',async()=>{
  let inserts=0,reads=0;
  const h=harness(null,{
    setTimeout: (callback,ms) => ms===20000?(queueMicrotask(callback),1):setTimeout(callback,ms),
    clearTimeout: id => {if(id!==1)clearTimeout(id);},
    supabaseClient: {from: () => ({
      insert: () => {inserts++;return new Promise(()=>{});},
      select: () => {const q={eq:()=>q,maybeSingle:async()=>{reads++;return {data:{listing_id:'listing-1'},error:null};}};return q;}
    })}
  });
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.equal(h.context.window.favoriteActions.uncertain('card-1'),true);
  assert.match(h.notices[0],/may have completed.*check/i);
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(inserts,1,'second tap must check rather than duplicate a timed-out write');
  assert.equal(reads,1);
  assert.equal(h.saved.has('card-1'),true);
  assert.equal(h.context.window.favoriteActions.uncertain('card-1'),false);
  assert.match(h.notices.at(-1),/Confirmed: this item is saved/);
});

test('a failed saved-status check keeps the item uncertain without another write',async()=>{
  let inserts=0,reads=0;
  const h=harness(null,{
    setTimeout: (callback,ms) => ms===20000?(queueMicrotask(callback),1):setTimeout(callback,ms),
    clearTimeout: id => {if(id!==1)clearTimeout(id);},
    supabaseClient: {from: () => ({
      insert: () => {inserts++;return new Promise(()=>{});},
      select: () => {const q={eq:()=>q,maybeSingle:async()=>{reads++;return {data:null,error:{message:'Offline'}};}};return q;}
    })}
  });
  await h.context.window.favoriteActions.toggle('card-1');
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(inserts,1);
  assert.equal(reads,1);
  assert.equal(h.context.window.favoriteActions.uncertain('card-1'),true);
  assert.match(h.notices.at(-1),/still unknown/i);
});

test('a saved refresh settles uncertain status for only the active account',async()=>{
  const h=harness(null,{
    setTimeout: (callback,ms) => ms===20000?(queueMicrotask(callback),1):setTimeout(callback,ms),
    clearTimeout: id => {if(id!==1)clearTimeout(id);},
    supabaseClient: {from: () => ({insert: () => new Promise(()=>{})})}
  });
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.context.window.favoriteActions.uncertain('card-1'),true);
  h.context.window.favoriteActions.reconcile('user-2',1);
  assert.equal(h.context.window.favoriteActions.uncertain('card-1'),true);
  h.context.window.favoriteActions.reconcile('user-1',1);
  assert.equal(h.context.window.favoriteActions.uncertain('card-1'),false);
});

test('blocked seller cannot gain new favorites but existing favorites can be removed',async()=>{
  const h=harness(null,{blockedCollectorIds:new Set(['seller-1'])});
  h.context.items[0].sellerId='seller-1';
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.equal(h.renders,0);
  assert.match(h.notices[0],/blocked/i);
  h.saved.add('card-1'); // A favorite saved before the seller was blocked.
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.equal(h.renders,2);
  assert.equal(h.notices[1],'Removed from saved items');
});

test('offline tap does not optimistically save and can retry after reconnecting',async()=>{
  const h=harness(null,{online:false});
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.equal(h.renders,0);
  assert.equal(h.context.window.favoriteActions.pending('card-1'),false);
  assert.match(h.notices[0],/offline.*reconnect/i);
  h.context.navigator.onLine=true;
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),true);
  assert.deepEqual(h.notices,['You are offline. Reconnect, then retry this saved-item change.','Saved to your account']);
});
