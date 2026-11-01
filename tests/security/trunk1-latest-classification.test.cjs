'use strict';
// Narrow offline regression for repeated seller classification edits.
// Source/helper verification only: not signed staging, visual or Android acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const html = readFileSync(join(__dirname, '../../index.html'), 'utf8');
const editor = readFileSync(join(__dirname, '../../listing-editor-classification.js'), 'utf8');
const extract = (source, name) => {
 const match = source.match(new RegExp('function ' + name + '\\([^]*?\\n\\}'));
 assert.ok(match, name + ' must exist');
 return match[0];
};
const sports = vm.runInNewContext('(' + extract(html, 'sportsListingDetail') + ')');
const specifics = vm.runInNewContext('(' + extract(html, 'listingBuyerSpecifics') + ')', {escapeHtml: value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')});
const editorLatest = vm.runInNewContext('(' + extract(editor, 'latestEditorClassification') + ')');
const hockey = 'Sports brand: Fleer\nYear: 1981\n[Listing classification]\nSport: Hockey\nSports brand: Fleer\nYear: 1981\nPlayer: Wayne Gretzky\n[End classification]\n[Listing classification]\nSport: Hockey\nSports brand: O-Pee-Chee\nYear: 1983-84\nPlayer: Wayne Gretzky\n[End classification]';
const sportsItem = {rawCategory:'trading_cards',game:'sports_cards',description:hockey};
test('Tanner: latest vintage hockey brand and year win in buyer filters', () => {
 assert.equal(sports(sportsItem,'Brand'),'o-pee-chee');
 assert.equal(sports(sportsItem,'Year'),'1983-84');
 assert.equal(sports(sportsItem,'Sport'),'hockey');
});
test('Tanner: buyer detail does not display superseded hockey metadata', () => {
 const details=specifics(sportsItem);
 assert.match(details,/O-Pee-Chee/);
 assert.match(details,/1983-84/);
 assert.doesNotMatch(details,/Fleer|1981/);
});
test('Tanner: cleared current brand does not resurrect historical Fleer', () => {
 const item={...sportsItem,description:hockey.replace('Sports brand: O-Pee-Chee','Sports brand: ')};
 assert.equal(sports(item,'Brand'),'');
 assert.doesNotMatch(specifics(item),/Fleer/);
});
test('Jayden: corrected Pokemon 151 printing replaces old Base Set identity', () => {
 const description='Set: Base Set\n[Listing classification]\nSet: Base Set\nCard number: 4/102\n[End classification]\n[Listing classification]\nSet: 151\nCard number: 199/165\n[End classification]';
 const detail=specifics({rawCategory:'trading_cards',game:'pokemon',description});
 assert.match(detail,/151/);
 assert.match(detail,/199\/165/);
 assert.doesNotMatch(detail,/Base Set|4\/102/);
});
test('Editor reentry uses latest classification, not historical fallback', () => {
 assert.match(editorLatest(hockey),/O-Pee-Chee/);
 assert.doesNotMatch(editorLatest(hockey),/Fleer/);
 assert.match(editor,/return \(latest\?\?description\)\.match\(pattern\)/);
 assert.match(editor,/\(!latest\?options\.find/);
 assert.equal(editorLatest('Seller notes only'),null);
});
