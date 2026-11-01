'use strict';
// Focused T1 seller-platform → buyer-search alias regression.
// This is a source/runtime check, not deployed signed buyer acceptance.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../../index.html'),'utf8');
const source=html.match(/function marketplaceSearchText\(value\)\{[^\n]*\}/)?.[0];
assert.ok(source,'Marketplace search normalizer must exist');
const normalize=vm.runInNewContext('('+source+')');
const finds=(query,listing)=>normalize(listing).includes(normalize(query));

test('Jayden finds a Super Nintendo listing using SNES and vice versa',()=>{
 assert.equal(finds('SNES','Platform: Super Nintendo'),true);
 assert.equal(finds('Super Nintendo','Platform: SNES'),true);
 assert.equal(finds('SNES','Platform: NES'),false);
});
test('Tanner finds exact Nintendo 64 and PlayStation generations',()=>{
 assert.equal(finds('N64','Platform: Nintendo 64'),true);
 assert.equal(finds('PS5','Platform: PlayStation 5'),true);
 assert.equal(finds('PS1','Platform: PlayStation 1'),true);
 assert.equal(finds('PS5','Platform: PlayStation 4'),false);
});
test('existing One Piece product search and unrelated words remain intact',()=>{
 assert.equal(finds('ST-31','Product: ST31'),true);
 assert.equal(finds('OP17','Set: OP-17'),true);
 assert.equal(finds('PSA 10','PSA 10 graded card'),true);
 assert.equal(finds('snesology','Platform: Super Nintendo'),false);
});
test('marketplace buyer text search actually uses shared normalization',()=>{
 assert.match(html,/const terms=marketplaceSearchText\(query\)/);
 assert.match(html,/terms\.every\(term=>marketplaceSearchText\(/);
});
