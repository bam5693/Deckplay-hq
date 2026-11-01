'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const html = readFileSync(join(__dirname, '../../index.html'), 'utf8');
function sourceBetween(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, 'actual listing source must contain ' + start);
  return html.slice(from, to);
}
const quantitySource = sourceBetween('function deckQuantitySummary(text){', 'for(const id of ["deckCardCount","deckList"])');
const submitGuard = html.split('\n').find(line => line.includes('if(!quantities.complete||quantities.invalid||quantities.mismatch)'));
assert.ok(submitGuard, 'publish must fail closed on uncountable decklist lines');

function evaluateDeck(lines, stated) {
  const nodes = {
    deckList: { value: lines, focus() { this.focused = true; } },
    deckCardCount: { value: String(stated) },
    deckQuantityStatus: { textContent: '' },
  };
  const document = { getElementById: id => nodes[id] };
  const update = new Function('document', quantitySource + '\nreturn updateDeckQuantityStatus;')(document);
  const quantities = update();
  const status = { textContent: '' };
  const publish = new Function('quantities', 'status', 'document', submitGuard + '\nreturn "continued";');
  const result = publish(quantities, status, document);
  return { quantities, message: nodes.deckQuantityStatus.textContent, result, status: status.textContent, focused: nodes.deckList.focused === true };
}

test('Jayden can post a fully counted One Piece deck with matching declared total', () => {
  const r = evaluateDeck('4x OP16-097 Yamato\n4x OP16-081 Otama\n1x OP16-085 Momonosuke', 9);
  assert.equal(r.quantities.total, 9);
  assert.equal(r.quantities.complete, true);
  assert.equal(r.quantities.mismatch, false);
  assert.equal(r.result, 'continued');
});

test('an uncounted leader or item line cannot silently publish a misleading deck', () => {
  const r = evaluateDeck('4x OP16-097 Yamato\n4x OP16-081 Otama\nLeader: Yamato', 9);
  assert.equal(r.quantities.complete, false);
  assert.equal(r.quantities.unrecognized, 1);
  assert.equal(r.result, undefined);
  assert.match(r.status, /Cannot post yet: 1 decklist line/);
  assert.equal(r.focused, true);
});

test('an entirely uncountable decklist cannot publish', () => {
  const r = evaluateDeck('Yamato\nOtama', 2);
  assert.equal(r.quantities.complete, false);
  assert.equal(r.result, undefined);
  assert.match(r.status, /Cannot post yet/);
});

test('a fully counted deck with wrong stated total is rejected', () => {
  const r = evaluateDeck('4x OP16-097 Yamato\n4x OP16-081 Otama', 50);
  assert.equal(r.quantities.complete, true);
  assert.equal(r.quantities.mismatch, true);
  assert.equal(r.result, undefined);
  assert.match(r.status, /Quantities total 8 cards/);
});

test('invalid oversized line quantities are rejected rather than treated as valid', () => {
  const r = evaluateDeck('1001x OP16-097 Yamato', 1000);
  assert.equal(r.quantities.invalid, 1);
  assert.equal(r.result, undefined);
  assert.match(r.status, /between 1 and 1,000/);
});
