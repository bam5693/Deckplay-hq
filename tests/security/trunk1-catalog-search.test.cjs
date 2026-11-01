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

test('Tanner: seller set metadata remains included in buyer searchable description', () => {
  assert.match(html, /\["Set",document\.getElementById\("tcgCustomSet"\)\.value\.trim\(\)\|\|document\.getElementById\("tcgSet"\)\.value\]/);
  assert.match(html, /marketplaceSearchText\(\[item\.n,item\.c,item\.s,item\.gameLabel,item\.description/);
});
