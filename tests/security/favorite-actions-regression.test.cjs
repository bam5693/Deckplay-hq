const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function harness(error = null) {
  const saved = new Set();
  const notices = [];
  let renders = 0;
  const context = {
    window: {}, currentUser: {id:'user-1'}, listingAccountVersion: 1,
    savedListingsLoadVersion: 0, saved,
    items: [{id:'card-1',databaseId:'listing-1'}],
    render: () => { renders++; },
    toast: message => notices.push(message),
    openModal: () => { throw Error('unexpected login prompt'); },
    AbortSignal,
    supabaseClient: {from: () => ({
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
