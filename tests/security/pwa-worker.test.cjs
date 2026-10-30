const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function workerHarness({ offline = false } = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../sw.js'), 'utf8');
  const events = new Map();
  const origin = 'https://deckplay-hq-staging.cstivers56.workers.dev';
  let networkCalls = 0;
  let didSkipWaiting = false;
  let didClaim = false;
  const self = {
    location: { origin },
    addEventListener(type, listener) { events.set(type, listener); },
    skipWaiting() { didSkipWaiting = true; },
    clients: { claim() { didClaim = true; return Promise.resolve(); } }
  };
  const fetch = async request => {
    networkCalls++;
    if (offline) throw new Error('offline');
    return new Response('LIVE NETWORK RESULT', { status: 200 });
  };
  vm.runInNewContext(source, { self, URL, Response, fetch });
  function request(method, pathname, mode, requestOrigin = origin) {
    let pending = null;
    events.get('fetch')({
      request: { method, mode, url: requestOrigin + pathname },
      respondWith(response) { pending = Promise.resolve(response); }
    });
    return pending;
  }
  return {
    request,
    get networkCalls() { return networkCalls; },
    get didSkipWaiting() { return didSkipWaiting; },
    get didClaim() { return didClaim; },
    install() { events.get('install')({}); },
    async activate() {
      let claim;
      events.get('activate')({ waitUntil(promise) { claim = promise; } });
      await claim;
    }
  };
}

test('installed app only intercepts same-origin GET navigations, never private API or cross-origin traffic', async () => {
  const worker = workerHarness();
  assert.equal(worker.request('POST', '/rest/v1/messages', 'navigate'), null);
  assert.equal(worker.request('GET', '/rest/v1/messages', 'cors'), null);
  assert.equal(worker.request('GET', '/index.html', 'no-cors'), null);
  assert.equal(worker.request('GET', '/private', 'navigate', 'https://example.org'), null);
  assert.equal(worker.networkCalls, 0);
  const online = await worker.request('GET', '/inbox', 'navigate');
  assert.equal(online.status, 200);
  assert.equal(await online.text(), 'LIVE NETWORK RESULT');
  assert.equal(worker.networkCalls, 1);
});

test('offline navigation fails closed and cannot replay stale account, listing or chat responses', async () => {
  const worker = workerHarness({ offline: true });
  const result = await worker.request('GET', '/profile', 'navigate');
  assert.equal(result.status, 503);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('x-robots-tag'), 'noindex,nofollow');
  const body = await result.text();
  assert.match(body, /DeckPlay HQ is offline/);
  assert.match(body, /No cached private conversations or old listings are shown/);
  assert.doesNotMatch(body, /LIVE NETWORK RESULT/);
  assert.equal(worker.networkCalls, 1);
});

test('new worker installation and activation are supported without any private cache storage', async () => {
  const worker = workerHarness();
  worker.install();
  await worker.activate();
  assert.equal(worker.didSkipWaiting, true);
  assert.equal(worker.didClaim, true);
});
