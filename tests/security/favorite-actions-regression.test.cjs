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

test('a never-settling favorite transport without abortSignal times out and releases retry control',async()=>{
  let attempts=0;
  const h=harness(null,{
    setTimeout: callback => {queueMicrotask(callback);return 1;},
    clearTimeout: () => {},
    supabaseClient: {from: () => ({insert: () => {attempts++;return new Promise(()=>{});}})}
  });
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.match(h.notices[0],/timed out.*retry/i);
  assert.equal(h.context.window.favoriteActions.pending('card-1'),false);
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(attempts,2);
});

test('blocked seller stale card cannot save or remove a favorite',async()=>{
  const h=harness(null,{blockedCollectorIds:new Set(['seller-1'])});
  h.context.items[0].sellerId='seller-1';
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),false);
  assert.equal(h.renders,0);
  h.saved.add('card-1');
  await h.context.window.favoriteActions.toggle('card-1');
  assert.equal(h.saved.has('card-1'),true);
  assert.equal(h.renders,0);
  assert.equal(h.notices.length,2);
  assert.match(h.notices[0],/blocked/i);
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
  assert.deepEqual(h.notices,['You are offline. Reconnect, then try saving this item again.','Saved to your account']);
});
