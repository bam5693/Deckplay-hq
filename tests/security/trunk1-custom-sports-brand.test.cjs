'use strict';
// T1.3 focused source/runtime regression. Not authenticated staging or physical Android acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const editor = fs.readFileSync(path.join(__dirname, '../../listing-editor-classification.js'), 'utf8');
function helper(source, pattern, name) {
  const found = source.match(pattern)?.[0];
  assert.ok(found, name + ' helper must be present');
  return vm.runInNewContext('(' + found + ')');
}
const brandValue = helper(html, /function listingSportsBrandValue\(selected,custom\)\{[^\n]*\}/, 'seller brand');
const restore = helper(editor, /function listingEditorRestoreSportsBrand\(options,saved\)\{[\s\S]*?\n\}/, 'editor brand restore');
const buyerBrand = helper(html, /function sportsListingDetail\(item,key\)\{[\s\S]*?\n\}/, 'buyer sports brand');
const options = ['Topps', 'Panini', 'Upper Deck', 'Fleer', 'Donruss', 'Bowman', 'Score', 'Other / Unknown'].map(value => ({value}));

test('Tanner: uncommon genuine sports brand is not falsely published as Other / Unknown', () => {
  assert.equal(brandValue('Other / Unknown', 'Pro Set'), 'Pro Set');
  assert.equal(brandValue('Other / Unknown', '  Pacific  '), 'Pacific');
  assert.equal(brandValue('Other / Unknown', ''), 'Other / Unknown');
  assert.equal(brandValue('Topps', 'stale Pro Set'), 'Topps');
  assert.equal(brandValue('Upper Deck', ''), 'Upper Deck');
});
test('Tanner: editor restores an exact historical brand and does not silently overwrite it', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(restore(options, 'Pro Set'))), {selected:'Other / Unknown',custom:'Pro Set'});
  assert.deepEqual(JSON.parse(JSON.stringify(restore(options, 'Topps'))), {selected:'Topps',custom:''});
  assert.deepEqual(JSON.parse(JSON.stringify(restore(options, ''))), {selected:'',custom:''});
  assert.equal(brandValue(restore(options, 'Pro Set').selected, restore(options, 'Pro Set').custom), 'Pro Set');
});
test('Jayden: latest edited exact brand drives buyer search and sport filter, not original label', () => {
  const description = '[Sports Cards]\nSport: Football\nBrand: Topps\nYear: 1991\nPlayer: Joe Montana\n[Listing classification]\nSport: Football\nSports brand: Pro Set\nYear: 1991\nPlayer: Joe Montana\n[End classification]';
  assert.equal(buyerBrand({description}, 'Brand'), 'pro set');
  assert.notEqual(buyerBrand({description}, 'Brand'), 'topps');
  const current = helper(html, /function marketplaceCurrentSearchDescription\(value\)\{[\s\S]*?\n\}/, 'buyer current search');
  assert.match(current(description), /Sports brand: Pro Set/);
  assert.doesNotMatch(current(description), /Brand: Topps/);
});
test('Jayden and Tanner: custom question only appears for Other sports brand, no redundant category or card help on games', () => {
  assert.match(html, /id="sportsBrandCustomWrap" hidden/);
  assert.match(html, /id="sportsBrandCustom" maxlength="100"/);
  assert.match(html, /wrap.hidden=brand!=="Other \/ Unknown"/);
  assert.match(html, /document.getElementById\("sportsBrand"\).addEventListener\("change",syncSportsBrandCustom\)/);
  assert.match(html, /Brand: \$\{listingSportsBrandValue\(/);
  assert.match(editor, /id==='sportsBrandCustom'&&get\('sportsBrand'\)!=='Other \/ Unknown'/);
  assert.match(editor, /if\(id==='sportsBrand'&&get\(id\)!=='Other \/ Unknown'\)set\('sportsBrandCustom',''\)/);
  assert.match(editor, /id==='sportsBrand'\?listingSportsBrandValue\(/);
  assert.match(editor, /id==='category'&&get\('listingType'\)!=='other'/);
});
