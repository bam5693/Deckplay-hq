'use strict';
// Trunk 1 focused source/runtime regression, not signed staging or device acceptance.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const editor=fs.readFileSync(path.join(root,'listing-editor-classification.js'),'utf8');
function helper(source,name,context={}){
 const match=source.match(new RegExp('function '+name+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
 assert.ok(match,'Missing '+name);
 return vm.runInNewContext('('+match[0]+')',context);
}
const latest=helper(editor,'latestEditorClassification');
const visible=helper(editor,'listingEditorVisibleDescription',{latestEditorClassification:latest});
const search=helper(html,'marketplaceCurrentSearchDescription');
const readable=helper(html,'readableListingDescription',{marketplaceCurrentSearchDescription:search});
const original='[Complete Deck]\\nDeck: Black Yamato\\nCards: 8\\n\\nFull decklist:\\n4x OP16-097 Yamato\\n\\n4x OP16-081 Otama\\n\\n[Card Condition]\\nNear Mint\\n\\nSeller note: double sleeves'.replace(/\\n/g,'\n');
const edit='[Listing classification]\\nListing type: Complete playable deck\\nDeck: Black Yamato\\nCards: 8\\nFull decklist:\\n4x OP16-093 Zoro\\n\\n4x OP16-089 Sanji\\n[End classification]'.replace(/\\n/g,'\n');
const revised=original+'\n\n'+edit;
test('Jayden: current deck cards, not removed original cards, drive buyer search',()=>{
 assert.doesNotMatch(search(revised),/OP16-097 Yamato|OP16-081 Otama/);
 assert.match(search(revised),/OP16-093 Zoro/);
 assert.match(search(revised),/OP16-089 Sanji/);
});
test('Buyer listing description does not contradict current deck classification',()=>{
 assert.doesNotMatch(readable(revised),/OP16-097 Yamato/);
 assert.match(readable(revised),/OP16-093 Zoro/);
 assert.match(readable(revised),/Seller note: double sleeves/);
});
test('Tanner: editor restores seller notes without old generated decklist',()=>{
 assert.equal(visible(revised),'Seller note: double sleeves');
});
test('Unedited published deck retains original cards',()=>{
 assert.match(search(original),/OP16-097 Yamato/);
 assert.match(visible(original),/OP16-081 Otama/);
});
test('Unmarked seller-authored Full decklist text is preserved',()=>{
 const authored='Full decklist:\n4x Custom card\n\n'+edit;
 assert.match(search(authored),/4x Custom card/);
 assert.match(visible(authored),/4x Custom card/);
});
test('Windows line endings and blank-separated groups remain safe',()=>{
 const windows=revised.replace(/\n/g,'\r\n');
 assert.doesNotMatch(search(windows),/OP16-097 Yamato/);
 assert.doesNotMatch(visible(windows),/OP16-081 Otama/);
 assert.match(search(windows),/OP16-089 Sanji/);
});
test('Nondeck hardware notes are untouched',()=>{
 const hardware='My console includes two controllers\n\n'+edit;
 assert.equal(visible(hardware),'My console includes two controllers');
});
