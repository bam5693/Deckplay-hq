'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const html = readFileSync(join(__dirname, '../../index.html'), 'utf8');
function section(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'actual source section ' + start);
  return html.slice(a, b);
}
const quantitySource = section('function listingContentsValues(quantity,unit,contents){', 'function deckQuantitySummary(text){');
const buyerSource = section('function listingDisclosedQuantity(description){', '// Current seller-edited classification is authoritative');
const helpers = new Function(quantitySource + buyerSource + '\nreturn {listingDisclosedQuantity,listingAskingPriceScope,listingLotBadge};')();
const contents = lines => '[Listing contents]\n' + lines.join('\n') + '\n[End listing contents]';

test('Tanner four-card hockey lot advertises the verified total-listing quantity', () => {
  const description = contents(['Quantity included: 4', 'Unit: cards', 'Sold together for the listing price.']);
  assert.deepEqual(helpers.listingDisclosedQuantity(description), { amount: 4, unit: 'cards' });
  assert.match(helpers.listingAskingPriceScope(description), /4 cards included\. Not a per-unit price/);
  assert.equal(helpers.listingLotBadge(description), '4 cards · lot price');
});

test('buyer must not see an invented quantity when the disclosure lacks a quantity line', () => {
  const description = contents(['Unit: cards', 'Sold together for the listing price.']);
  assert.equal(helpers.listingDisclosedQuantity(description), null);
  assert.equal(helpers.listingLotBadge(description), '');
  assert.match(helpers.listingAskingPriceScope(description), /Check the description/);
});

test('buyer must not see a default unit when the disclosure omits Unit', () => {
  const description = contents(['Quantity included: 4', 'Sold together for the listing price.']);
  assert.equal(helpers.listingDisclosedQuantity(description), null);
  assert.equal(helpers.listingLotBadge(description), '');
});

test('zero, oversized, or missing disclosures do not claim inventory', () => {
  for (const description of [
    contents(['Quantity included: 0', 'Unit: cards']),
    contents(['Quantity included: 100001', 'Unit: cards']),
    'Older listing without structured contents',
  ]) {
    assert.equal(helpers.listingDisclosedQuantity(description), null);
  }
});

test('Tanner itemized hockey lot only shows quantity when every disclosed card is counted', () => {
  const valid = contents(['Quantity included: 4', 'Unit: cards', 'Sold together for the listing price.', 'Contents:', '2x 1983-84 O-Pee-Chee Gretzky', '2x 1983-84 O-Pee-Chee Lemieux']);
  assert.deepEqual(helpers.listingDisclosedQuantity(valid), { amount: 4, unit: 'cards' });
  assert.equal(helpers.listingLotBadge(valid), '4 cards · lot price');
  const mismatch = valid.replace('2x 1983-84 O-Pee-Chee Lemieux', '1x 1983-84 O-Pee-Chee Lemieux');
  assert.equal(helpers.listingDisclosedQuantity(mismatch), null);
  assert.equal(helpers.listingLotBadge(mismatch), '');
  assert.match(helpers.listingAskingPriceScope(mismatch), /Check the description/);
});

test('Jayden buyer never trusts uncounted bonus items or ambiguous disclosure lines', () => {
  const uncounted = contents(['Quantity included: 4', 'Unit: cards', 'Contents:', '4x One Piece OP-17 Luffy', 'bonus unknown card']);
  const duplicateQuantity = contents(['Quantity included: 4', 'Quantity included: 9', 'Unit: cards']);
  const duplicateUnit = contents(['Quantity included: 4', 'Unit: cards', 'Unit: sealed packs']);
  for (const description of [uncounted, duplicateQuantity, duplicateUnit]) {
    assert.equal(helpers.listingDisclosedQuantity(description), null);
    assert.equal(helpers.listingLotBadge(description), '');
  }
});

test('legacy Windows CRLF contents remain readable without inventing a unit count', () => {
  const valid = contents(['Quantity included: 2', 'Unit: games', 'Contents:', '1x Switch 2 Mario Kart World', '1x Switch 2 Zelda']).replace(/\n/g, '\r\n');
  assert.deepEqual(helpers.listingDisclosedQuantity(valid), { amount: 2, unit: 'games' });
  assert.equal(helpers.listingLotBadge(valid), '2 games · lot price');
});
