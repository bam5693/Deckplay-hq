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
const quantitySource = section('function readListingContents(description){', 'function deckQuantitySummary(text){');
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
