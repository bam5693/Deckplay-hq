'use strict';
// Focused, zero-network source regression. NOT a signed seller/buyer or visual acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const searchSource = html.match(/function marketplaceSearchText\(value\)\{[^\n]*\}/)?.[0];
assert.ok(searchSource, 'Marketplace buyer search normalizer must exist');
const normalize = vm.runInNewContext('(' + searchSource + ')');
const catalogSource = html.match(/const deckplaySets=\{[\s\S]*?\n\};\nfunction deckplayFillOptions/)?.[0];
assert.ok(catalogSource, 'Seller set catalog must exist');
const catalog = vm.runInNewContext('(' + catalogSource
  .replace(/\nfunction deckplayFillOptions$/, '')
  .replace(/^const deckplaySets=/, '')
  .replace(/;\s*$/, '') + ')');

test('Jayden: buyers find One Piece OP, EB, ST and PRB releases with or without a hyphen', () => {
  for (const [typed, saved] of [
    ['OP17', 'OP-17'],
    ['OP17-093', 'OP-17-093'],
    ['EB05', 'EB-05'],
    ['ST31', 'ST-31'],
    ['PRB02', 'PRB-02'],
    ['OP 17', 'OP-17'],
  ]) {
    assert.equal(normalize(typed), normalize(saved), typed + ' should match ' + saved);
    assert.ok(normalize('One Piece ' + saved + ' parallel').includes(normalize(typed)));
  }
  assert.notEqual(normalize('OP17'), normalize('OP18'));
  assert.equal(normalize('PS-5'), 'ps-5', 'Unrelated product codes must not be rewritten');
});

test('Jayden: mainstream Magic releases appear as selectable sets, not manufacturers', () => {
  assert.ok(catalog.magic['Recent expansions'].includes('Bloomburrow'));
  assert.ok(catalog.magic['Recent expansions'].includes('Magic: The Gathering Foundations'));
  assert.ok(catalog.magic['Universes Beyond'].includes('Magic: The Gathering—FINAL FANTASY'));
  assert.ok(catalog.magic['Universes Beyond'].includes('Other / unknown'));
  assert.ok(catalog.pokemon['Base / Classic'].includes('Base Set'), 'Existing Pokemon catalog retained');
  assert.ok(catalog.one_piece['Main booster sets'].includes('OP-17'), 'Existing One Piece catalog retained');
});

test('Jayden: One Piece ST-31 to ST-36 are exact selectable starter releases, not one misleading bucket', () => {
  const choices = catalog.one_piece['Starter decks'];
  const exact = [
    ['ST-31', 'Red Monkey D. Luffy'],
    ['ST-32', 'Green Roronoa Zoro'],
    ['ST-33', 'Blue Kuzan'],
    ['ST-34', 'Purple Charlotte Katakuri'],
    ['ST-35', 'Red/Black Sabo'],
    ['ST-36', 'Yellow Eustass Kid'],
  ];
  const buyerDescriptionSource = html.match(/function marketplaceCurrentSearchDescription\\(value\\)\\{[\\s\\S]*?\\n\\}/)?.[0];
  assert.ok(buyerDescriptionSource, 'Buyer must read current seller classification');
  const buyerDescription = vm.runInNewContext('(' + buyerDescriptionSource + ')');
  for (const [code, leader] of exact) {
    const value = choices.find(choice => choice.startsWith(code + ' '));
    assert.ok(value, code + ' must be selectable individually');
    assert.ok(value.includes(leader), code + ' must name the correct leader');
    const description = '[Listing classification]\\nSet: ' + value + '\\n[End classification]';
    assert.ok(normalize(buyerDescription(description)).includes(normalize(code)),
      code + ' must survive into buyer search without requiring a hyphen');
  }
  assert.ok(choices.includes('ST-31 and later'), 'Existing legacy grouped listings must remain editable');
  assert.ok(choices.includes('Other / unknown'), 'Unlisted starter releases must keep a custom fallback');
});

test('Jayden: editor restores exact starter selection and preserves unknown custom products', () => {
  const editor = fs.readFileSync(path.join(__dirname, '../../listing-editor-classification.js'), 'utf8');
  const helper = editor.match(/function listingEditorRestoreCatalogChoice\\(options,saved\\)\\{[\\s\\S]*?\\n\\}/)?.[0];
  assert.ok(helper, 'Editor restore must use the shared seller catalog');
  const restore = vm.runInNewContext('(' + helper + ')');
  const options = catalog.one_piece['Starter decks'].map(value => ({ value }));
  for (const code of ['ST-31', 'ST-32', 'ST-33', 'ST-34', 'ST-35', 'ST-36']) {
    const exact = options.find(option => option.value.startsWith(code + ' ')).value;
    const result = restore(options, exact);
    assert.equal(result.selected, exact);
    assert.equal(result.custom, '', 'A known choice must not hide a stale custom override');
  }
  const custom = restore(options, 'ST-37 Custom regional printing');
  assert.equal(custom.selected, '');
  assert.equal(custom.custom, 'ST-37 Custom regional printing');
});

test('Tanner: seller set metadata remains included in buyer searchable description', () => {
  assert.match(html, /\["Set",document\.getElementById\("tcgCustomSet"\)\.value\.trim\(\)\|\|document\.getElementById\("tcgSet"\)\.value\]/);
  assert.match(html, /marketplaceCurrentSearchDescription\(item\.description\)/);
});

test('Jayden: edited game platform wins for buyer filters, details and search', () => {
  const helperSource = html.match(/function marketplaceCurrentPlatform\(description\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(helperSource, 'Current game platform helper must exist');
  const platform = vm.runInNewContext('(' + helperSource + ')');
  const currentDescriptionSource = html.match(/function marketplaceCurrentSearchDescription\(value\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(currentDescriptionSource, 'Current seller metadata search helper must exist');
  const buyerDescription = vm.runInNewContext('(' + currentDescriptionSource + ')');
  const mappingSource = html.match(/function marketplaceItemFromRow\(row,profile\)\{[^\n]*\}/)?.[0];
  assert.ok(mappingSource, 'Real marketplace row mapper must exist');
  const mapRow = vm.runInNewContext('(' + mappingSource + ')', {
    marketplaceCurrentPlatform: platform,
    databaseCategory: () => 'Video Games',
    databaseCondition: () => 'Used',
    databaseEmoji: () => '',
    tcgNames: {}
  });
  const description = 'Platform: PlayStation 5\nSeller note: complete in box\n[Listing classification]\nCategory: Video games\nPlatform: Nintendo Switch 2\n[End classification]';
  const row = { id: 'synthetic-game', title: 'Retro game', category: 'video_games', price: 39, description };
  const item = mapRow(row);
  assert.equal(item.platform, 'Nintendo Switch 2', 'Buyer platform must match latest seller edit');
  assert.equal(mapRow({ ...row, description: 'Platform: PlayStation 5' }).platform, 'PlayStation 5', 'Legacy unedited buyer filter still works');
  assert.ok(buyerDescription(description).includes('Nintendo Switch 2'));
  assert.ok(!buyerDescription(description).includes('Platform: PlayStation 5'), 'Search must not revive old platform');
  assert.equal(platform('Platform: Sega Dreamcast'), 'Sega Dreamcast', 'Legacy unedited listings still work');
  assert.equal(platform('Platform: PlayStation 5\n[Listing classification]\nPlatform: \n[End classification]'), '', 'Cleared edit must not restore old platform');
  assert.match(html, /item\.platform\?\?marketplaceCurrentPlatform\(item\.description\)/, 'Buyer filter must use the current platform without stale fallback');
});
