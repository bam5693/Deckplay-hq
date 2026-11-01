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
const brandSelect = html.match(/<select id="sportsBrand">([\s\S]*?)<\/select>/)?.[1];
assert.ok(brandSelect, 'seller sports brand select');
const options = [...brandSelect.matchAll(/<option(?: value="([^"]*)")?>([^<]*)<\/option>/g)].map(match => ({value:match[1]??match[2]}));

test('Tanner: uncommon genuine sports brand is not falsely published as Other / Unknown', () => {
  assert.equal(brandValue('Other / Unknown', 'Wild Card'), 'Wild Card');
  assert.equal(brandValue('Other / Unknown', '  Action Packed  '), 'Action Packed');
  assert.equal(brandValue('Other / Unknown', ''), 'Other / Unknown');
  assert.equal(brandValue('Topps', 'stale Pro Set'), 'Topps');
  assert.equal(brandValue('Upper Deck', ''), 'Upper Deck');
});
test('Tanner: editor restores an exact historical brand and does not silently overwrite it', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(restore(options, 'Wild Card'))), {selected:'Other / Unknown',custom:'Wild Card'});
  assert.deepEqual(JSON.parse(JSON.stringify(restore(options, 'Topps'))), {selected:'Topps',custom:''});
  assert.deepEqual(JSON.parse(JSON.stringify(restore(options, ''))), {selected:'',custom:''});
  assert.equal(brandValue(restore(options, 'Wild Card').selected, restore(options, 'Wild Card').custom), 'Wild Card');
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

// Seller's one catalog is also cloned by the editor; buyer filters use the exact saved brand.
test('Tanner: mainstream historical football, hockey and racing brands are directly selectable', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/category-catalog.json'), 'utf8'));
  const listed = options.map(option => option.value).filter(Boolean);
  assert.deepEqual(listed, fixture.controls.sportsBrand.map(option => option.value));
  for (const brand of ['Pro Set', 'Pacific', 'Press Pass']) {
    assert.ok(listed.includes(brand), brand + ' must be directly selectable without Other');
    assert.deepEqual(JSON.parse(JSON.stringify(restore(options, brand))), {selected:brand,custom:''});
    assert.equal(brandValue(brand, 'stale custom brand'), brand);
  }
  assert.equal(listed.filter(value => value === 'Other / Unknown').length, 1);
});
test('Jayden: edited historical brand is discoverable without inventing manufacturer or product line', () => {
  const current = helper(html, /function marketplaceCurrentSearchDescription\(value\)\{[\s\S]*?\n\}/, 'buyer current search');
  for (const [sport, brand, line] of [['Football','Pro Set','Platinum'], ['Hockey','Pacific','Crown Royale'], ['Racing','Press Pass','VIP']]) {
    const description = '[Sports Cards]\nBrand: Topps\n[Listing classification]\nSport: '+sport+'\nSports brand: '+brand+'\nYear: 1997\nPlayer: Test collector\n[End classification]\nProduct line: '+line;
    assert.equal(buyerBrand({description}, 'Brand'), brand.toLowerCase());
    assert.match(current(description), new RegExp('Sports brand: '+brand));
    assert.doesNotMatch(current(description), /Brand: Topps/);
  }
});
