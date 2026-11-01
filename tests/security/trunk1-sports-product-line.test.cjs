'use strict';
// T1.3 focused source/runtime guard; this is NOT signed staging or physical Android acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const editor = fs.readFileSync(path.join(root, 'listing-editor-classification.js'), 'utf8');
function helper(source, name, context = {}) {
 const match = source.match(new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
 assert.ok(match, 'Missing helper ' + name);
 return vm.runInNewContext('(' + match[0] + ')', context);
}
const createSource = html.match(/const sportsBrandDetails=([\s\S]*?);\n  const cardConditionDetails/)?.[1];
assert.ok(createSource, 'Seller sports disclosure must exist');
function createSportsLine(productLine, category = 'trading_cards', game = 'sports_cards') {
 const values = {category, tcgGame: game, sportsSport:'Football', sportsBrand:'Panini',
  sportsBrandCustom:'', sportsYear:'2024', sportsPlayer:'Rookie', sportsProductLine:productLine};
 const document = {getElementById(id){assert.ok(id in values, 'unexpected field '+id);return {value:values[id]}}};
 return vm.runInNewContext(createSource, {document, listingSportsBrandValue:(value)=>value});
}
const buyer = helper(html, 'listingBuyerSpecifics', {escapeHtml:value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')});
const search = helper(html, 'marketplaceCurrentSearchDescription');
const sportField = helper(html, 'sportsListingDetail');
const editorVisible = helper(editor, 'listingEditorVisibleDescription', {latestEditorClassification:helper(editor,'latestEditorClassification')});

test('Tanner: optional Panini Prizm product line is published separately from brand and year', () => {
 const description = createSportsLine(' Prizm ');
 assert.match(description, /Brand: Panini\nYear: 2024\nPlayer: Rookie\nProduct line: Prizm/);
 assert.match(buyer({rawCategory:'trading_cards',game:'sports_cards',description}), /Product line:<\/dt><dd[^>]*>Prizm<\/dd>/);
 assert.equal(sportField({description}, 'Product line'), 'prizm');
 assert.doesNotMatch(createSportsLine(''), /Product line:/);
 assert.equal(createSportsLine('Prizm','video_games',''), '');
});
test('Jayden: latest seller edit replaces stale product line in buyer detail and search', () => {
 const original=createSportsLine('Prizm');
 const description=original+'\n[Listing classification]\nSports brand: Panini\nProduct line: Select\nYear: 2024\nPlayer: Rookie\n[End classification]';
 const item={rawCategory:'trading_cards',game:'sports_cards',description};
 assert.match(buyer(item), /Product line:<\/dt><dd[^>]*>Select<\/dd>/);
 assert.doesNotMatch(buyer(item), />Prizm<\/dd>/);
 assert.match(search(description), /Product line: Select/);
 assert.doesNotMatch(search(description), /Product line: Prizm/);
 assert.equal(sportField(item,'Product line'), 'select');
});
test('Tanner: sports line edits reopen as an optional input, not a second brand/category question', () => {
 assert.match(html, /id="sportsProductLine" maxlength="100"/);
 assert.match(editor, /\['sportsProductLine','Product line \(optional\)','sports'\]/);
 assert.match(editor, /\['sportsProductLine','Product line'\]/);
 assert.match(editor, /sportsProductLine:'Product line'/);
 assert.doesNotMatch(editor, /required\.has\('sportsProductLine'\)/);
 const old=createSportsLine('Prizm');
 const revised=old+'\n[Listing classification]\nSports brand: Panini\nProduct line: Select\nYear: 2024\nPlayer: Rookie\n[End classification]\n\nPersonal notes: clean corners';
 const notes=editorVisible(revised);
 assert.match(notes, /Personal notes: clean corners/);
 assert.doesNotMatch(notes, /Product line: Prizm|Product line: Select/);
});
test('Jayden: no sports product line leaks into unrelated game or TCG buyer details', () => {
 const description=createSportsLine('Crown Royale');
 assert.doesNotMatch(buyer({rawCategory:'video_games',description}), /Product line/);
 assert.doesNotMatch(buyer({rawCategory:'trading_cards',game:'pokemon',description}), /Product line/);
 assert.match(html, /document\.getElementById\("sportsProductLine"\)\.value=""/);
});
