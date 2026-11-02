'use strict';
// Focused offline T1.3 regression: buyer search/detail must use the latest seller edit.
// This is not a deployed/signed buyer journey or physical Android visual acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
function extract(name) {
  const match = html.match(new RegExp('function ' + name + '\\([^\\n]*?\\)\\{[\\s\\S]*?\\n\\}'));
  assert.ok(match, name + ' must exist');
  return vm.runInNewContext('(' + match[0] + ')');
}
const buyerDescription = extract('marketplaceCurrentSearchDescription');
const sportsDetail = extract('sportsListingDetail');
const normalize = vm.runInNewContext('(' + html.match(/function marketplaceSearchText\(value\)\{[^\n]*\}/)[0] + ')');
const editedHockey = [
  '[Card Condition]', 'Near Mint', 'Sport: Hockey', 'Brand: Fleer', 'Year: 1981',
  '[Listing classification]', 'Category: Trading cards', 'Listing type: Single trading card',
  'Card condition: Lightly Played', 'Sport: Hockey', 'Sports brand: O-Pee-Chee',
  'Year: 1982', 'Player: Wayne Gretzky', '[End classification]',
  '', 'Seller notes: corner wear; photo shows the back.'
].join('\n');

test('Tanner: edited O-Pee-Chee hockey identity replaces stale Fleer in buyer search and detail', () => {
  const current = buyerDescription(editedHockey);
  for (const term of ['O-Pee-Chee', '1982', 'Lightly Played', 'Wayne Gretzky', 'Seller notes'])
    assert.ok(current.includes(term), 'must retain ' + term);
  for (const stale of ['Fleer', '1981', 'Near Mint'])
    assert.ok(!current.includes(stale), 'must not expose stale ' + stale);
  assert.equal(sportsDetail({ description: editedHockey }, 'Brand'), 'o-pee-chee');
  assert.equal(sportsDetail({ description: editedHockey }, 'Year'), '1982');
  assert.equal(sportsDetail({ description: editedHockey.replace('Sports brand: O-Pee-Chee\n', '') }, 'Brand'), '',
    'clearing a brand in the latest classification must not revive old Fleer');
  assert.ok(normalize(current).includes(normalize('O-Pee-Chee')));
  assert.ok(!normalize(current).includes(normalize('Fleer')));
});

test('Jayden: edited Pokémon set and variant replace old values without losing seller prose or contents', () => {
  const text = [
    '[Listing contents]', 'Quantity included: 2', 'Unit: cards', 'Contents:', '2x Charizard',
    '[End listing contents]', 'Set: Base Set', 'Variant: Regular', 'Card number: 4/102',
    '[Listing classification]', 'Set: 151', 'Variant: Illustration Rare',
    'Card number: 199/165', '[End classification]', '',
    'Seller notes: slight whitening, see the back photo.'
  ].join('\n');
  const current = buyerDescription(text);
  for (const term of ['Quantity included: 2', '2x Charizard', '151', 'Illustration Rare', '199/165', 'Seller notes'])
    assert.ok(current.includes(term), 'must retain ' + term);
  for (const stale of ['Base Set', 'Regular', '4/102'])
    assert.ok(!current.includes(stale), 'must not retain old ' + stale);
});

test('Legacy listing without classification is unchanged; new buyer search and details use current helper', () => {
  assert.equal(buyerDescription('Brand: Fleer\nYear: 1981'), 'Brand: Fleer\nYear: 1981');
  assert.match(html, /item\.gameLabel,marketplaceCurrentSearchDescription\(item\.description\),item\.cond/);
  assert.match(html, /function readableListingDescription\(value\)\{return marketplaceCurrentSearchDescription\(value\)/);
});
