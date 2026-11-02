'use strict';
// Focused source/helper regression: not deployed, signed or physical Android acceptance.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../listing-editor-classification.js'),'utf8');
const helpers=vm.runInNewContext(source+'\n({listingEditorVisibleDescription,listingEditorPreserveDescription,listingEditorLatestDeckList,latestEditorClassification})',{window:{}});
const block=body=>'[Listing classification]\n'+body+'\n[End classification]';
const contents='[Listing contents]\nQuantity included: 4\nUnit: cards\n[End listing contents]';
const hockey=[contents,block('Sports brand: Fleer\nYear: 1981'),block('Sports brand: O-Pee-Chee\nYear: 1983-84'),'Corners have wear.'].join('\n\n');

test('Tanner: edit form shows only authored notes, not two historical classifications',()=>{
 assert.equal(helpers.listingEditorVisibleDescription(hockey),'Corners have wear.');
 assert.match(source,/const strip=listingEditorVisibleDescription/);
});

test('Tanner: changing prose retains quantity and latest hockey brand, never obsolete Fleer',()=>{
 const updated=helpers.listingEditorPreserveDescription(hockey,'Corners look sharp.');
 assert.match(updated,/Quantity included: 4/);
 assert.match(updated,/Sports brand: O-Pee-Chee/);
 assert.doesNotMatch(updated,/Sports brand: Fleer|Year: 1981/);
 assert.match(updated,/Corners look sharp\.$/);
 assert.equal([...updated.matchAll(/\[Listing classification\]/g)].length,1);
});

test('Unchanged notes preserve original bytes and avoid rewriting the seller disclosure',()=>{
 assert.equal(helpers.listingEditorPreserveDescription(hockey,'Corners have wear.'),hockey);
});

test('Jayden: reopening repeatedly edited deck uses the latest card quantities',()=>{
 const deck=[block('Full decklist:\n4x Old Card'),block('Full decklist:\n3x New Card\n1x Other Card'),'Deck notes'].join('\n\n');
 assert.equal(helpers.listingEditorLatestDeckList(deck),'3x New Card\n1x Other Card');
 assert.match(source,/set\('deckList',listingEditorLatestDeckList\(description\)\)/);
});

test('Plain legacy notes and CRLF classification blocks remain safe',()=>{
 assert.equal(helpers.listingEditorVisibleDescription('Plain notes'),'Plain notes');
 assert.equal(helpers.listingEditorPreserveDescription('Plain notes','Changed notes'),'Changed notes');
 const windows=('[Listing classification]\r\nSet: Base Set\r\n[End classification]\r\n\r\n'+block('Set: 151')+'\nMint corners.');
 assert.equal(helpers.listingEditorVisibleDescription(windows),'Mint corners.');
 assert.match(helpers.listingEditorPreserveDescription(windows,'Updated corners.'),/Set: 151/);
});

test('Tanner: legacy Sports Cards Fleer block cannot leak into corrected O-Pee-Chee notes',()=>{
 const original=[block('Sport: Hockey\nSports brand: O-Pee-Chee\nYear: 1983-84\nPlayer: Gretzky'),'[Sports Cards]\nSport: Hockey\nBrand: Fleer\nYear: 1981\nPlayer: Gretzky','Original notes'].join('\n\n');
 assert.equal(helpers.listingEditorVisibleDescription(original),'Original notes');
 const saved=helpers.listingEditorPreserveDescription(original,'Updated notes');
 assert.match(saved,/O-Pee-Chee/);
 assert.doesNotMatch(saved,/Fleer|1981|\[Sports Cards\]/);
});

test('Jayden: stale original video-game platform and card condition are not reintroduced',()=>{
 const game=[block('Platform: Nintendo Switch 2'),'[Video Game]\nPlatform: PlayStation 5','Case and manual included'].join('\n\n');
 assert.equal(helpers.listingEditorVisibleDescription(game),'Case and manual included');
 const saved=helpers.listingEditorPreserveDescription(game,'Case and manual included; tested.');
 assert.match(saved,/Nintendo Switch 2/);
 assert.doesNotMatch(saved,/PlayStation 5|\[Video Game\]/);
 const card=[block('Card condition: Near Mint'),'[Card Condition]\nLightly Played','One tiny edge mark'].join('\n\n');
 assert.equal(helpers.listingEditorVisibleDescription(card),'One tiny edge mark');
});
