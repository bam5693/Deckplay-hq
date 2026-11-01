'use strict';
// Focused source/runtime regression. Not deployed or signed buyer/seller acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'listing-editor-classification.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function helper(src,name,context={}) {
 const match=src.match(new RegExp('function '+name+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
 assert.ok(match, 'Missing helper '+name);
 return vm.runInNewContext('('+match[0]+')',context);
}
const latest=helper(source,'latestEditorClassification');
const visible=helper(source,'listingEditorVisibleDescription',{latestEditorClassification:latest});
const buyer=helper(html,'listingBuyerSpecifics',{escapeHtml:value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')});
const search=helper(html,'marketplaceCurrentSearchDescription');
const current='[Listing classification]\\nCategory: Trading cards\\nCard condition: Lightly Played\\nSet: Paldea Evolved\\nCard number: 42/193\\nVariant: Reverse Holo\\nGrader: BGS\\nGrade: 9\\n[End classification]'.replace(/\\n/g,'\n');
const raw='[Card Condition]\\nNear Mint\\n\\nEra: Scarlet & Violet\\nSet: 151\\nCard number: 4/165\\nVariant: Holo\\n\\nSeller note: crisp edges\\n\\n'.replace(/\\n/g,'\n')+current;
test('Jayden: old generated 151 set and variant do not return to edited notes',()=>{
 assert.equal(visible(raw),'Seller note: crisp edges');
 const published=current+'\n\n'+visible(raw);
 assert.doesNotMatch(search(published),/Set: 151|Variant: Holo/);
 assert.match(buyer({rawCategory:'trading_cards',game:'pokemon',description:published}),/Paldea Evolved/);
 assert.doesNotMatch(buyer({rawCategory:'trading_cards',game:'pokemon',description:published}),/151/);
});
test('Tanner: old graded PSA 10 does not appear beside current BGS 9',()=>{
 const original='[Graded Card]\\nGrader: PSA\\nGrade: 10\\nCertification: 1234\\n\\n[Card Condition]\\nGraded\\n\\nSeller note: case scuff\\n\\n'.replace(/\\n/g,'\n')+current;
 assert.equal(visible(original),'Seller note: case scuff');
 const published=current+'\n\n'+visible(original);
 assert.doesNotMatch(search(published),/Grader: PSA|Grade: 10|Certification: 1234/);
 assert.match(buyer({rawCategory:'trading_cards',game:'pokemon',description:published}),/BGS/);
});
test('Ambiguous single Set line is preserved as possible seller prose',()=>{
 assert.equal(visible('[Card Condition]\nNear Mint\n\nSet: seller personal note\n\n'+current),'Set: seller personal note');
});
test('Unedited legacy listings retain original metadata',()=>{
 assert.match(visible('[Card Condition]\nNear Mint\n\nEra: Scarlet & Violet\nSet: 151'),/Set: 151/);
});
test('Windows line endings strip the same generated multi-field block',()=>{
 const crlf='[Card Condition]\r\nNear Mint\r\n\r\nEra: Scarlet & Violet\r\nSet: 151\r\nCard number: 4/165\r\n\r\nSeller note: crisp edges\r\n\r\n'+current;
 assert.equal(visible(crlf),'Seller note: crisp edges');
});
test('Unrelated hardware notes are not removed by card cleanup',()=>{
 const notes='[Hardware: Console]\nBrand: Sony\nModel: PS5 Slim\n\nSeller note: original box\n\n'+current;
 assert.match(visible(notes),/Brand: Sony/);
 assert.match(visible(notes),/Seller note: original box/);
});
