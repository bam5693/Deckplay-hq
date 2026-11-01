const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
const start = html.indexOf('async function refreshNotificationCount(){');
const end = html.indexOf('\n/* Route alerts by activity type', start);
assert.ok(start >= 0 && end > start, 'Find the actual T4.3 notification handlers');
const handlers = html.slice(start, end);

function fixture(read) {
  const notices = [];
  const nodes = Object.fromEntries(['notificationList', 'inboxNotificationList', 'notificationBell', 'notificationBadge', 'dockNotifications'].map(id => [id, {
    innerHTML: '', textContent: '', hidden: false, setAttribute() {}
  }]));
  const context = {
    currentUser: { id: 'buyer-a' }, notificationCenterLoadVersion: 0, notificationCountLoadVersion: 0,
    document: { getElementById: id => nodes[id] },
    supabaseClient: { from: table => {
      const query = { table };
      for (const method of ['select', 'eq', 'is', 'in', 'order', 'limit', 'update']) query[method] = () => query;
      return query;
    }},
    readMarketplaceRequest: read, toast: message => notices.push(message),
    escapeHtml: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    console, Date, Map, Set, Promise
  };
  vm.runInNewContext(handlers, context);
  return { context, nodes, notices };
}

const alert = { id: 'alert-1', actor_id: 'seller-1', kind: 'wanted_match', source_id: 'listing-1', created_at: '2026-11-01T12:00:00Z', read_at: null };

test('offline discovery alert feed shows retry, not a false empty state; retry succeeds', async () => {
  let calls = 0;
  const h = fixture(async request => {
    if (request.table === 'collector_notifications') {
      calls++;
      if (calls === 1) throw Error('Network timed out');
      return { data: [alert], error: null };
    }
    if (request.table === 'profiles') return { data: [{ id: 'seller-1', username: 'seller' }] };
    return { data: [{ id: 'listing-1', title: 'Nintendo Switch game', price: 30, status: 'active' }] };
  });
  await h.context.loadNotificationCenter();
  assert.match(h.nodes.notificationList.innerHTML, /Alerts could not load.*Retry alerts/);
  assert.doesNotMatch(h.nodes.notificationList.innerHTML, /No activity alerts yet/);
  await h.context.loadNotificationCenter();
  assert.match(h.nodes.notificationList.innerHTML, /Nintendo Switch game/);
  assert.match(h.nodes.inboxNotificationList.innerHTML, /Nintendo Switch game/);
});

test('stalled optional seller details cannot hide actionable discovery alerts', async () => {
  const h = fixture(async request => {
    if (request.table === 'collector_notifications') return { data: [alert] };
    if (request.table === 'profiles') throw Error('Seller lookup timed out');
    return { data: [{ id: 'listing-1', title: 'Sports card #42', price: 40, status: 'active' }] };
  });
  await h.context.loadNotificationCenter();
  assert.match(h.nodes.notificationList.innerHTML, /Some alert details could not load/);
  assert.match(h.nodes.notificationList.innerHTML, /Sports card #42/);
  assert.match(h.nodes.notificationList.innerHTML, /data-open-notification="alert-1"/);
  assert.doesNotMatch(h.nodes.notificationList.innerHTML, /Loading notifications/);
});

test('old account alert read never paints private activity after switching accounts', async () => {
  let resolveOld;
  const h = fixture(async request => {
    if (request.table === 'collector_notifications') return new Promise(resolve => { resolveOld = resolve; });
    return { data: [] };
  });
  const oldRead = h.context.loadNotificationCenter();
  h.context.currentUser = { id: 'buyer-b' };
  h.nodes.notificationList.textContent = 'New account alerts';
  resolveOld({ data: [alert] });
  await oldRead;
  assert.equal(h.nodes.notificationList.textContent, 'New account alerts');
  assert.doesNotMatch(h.nodes.notificationList.innerHTML, /wanted_match/);
});

test('read-receipt timeout does not trap buyer before opening an alert', async () => {
  const h = fixture(async request => {
    if (request.table === 'collector_notifications') throw Error('Request timed out');
    return { data: [] };
  });
  await h.context.markNotificationRead('alert-1');
  assert.match(h.notices[0], /still open it/);
});

test('late read receipt from another account never displays its error on the new account', async () => {
  let resolveOld;
  const h = fixture(async () => new Promise(resolve => { resolveOld = resolve; }));
  const oldWrite = h.context.markNotificationRead('alert-1');
  h.context.currentUser = { id: 'buyer-b' };
  resolveOld({ error: { message: 'offline' } });
  await oldWrite;
  assert.equal(h.notices.length, 0);
});
