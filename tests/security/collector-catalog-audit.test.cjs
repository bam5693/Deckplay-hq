const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {audit}=require('../../scripts/collector-catalog-audit.cjs');
const read=p=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../',p),'utf8'));
const catalog=read('tests/fixtures/category-catalog.json');
const bank=read('tests/fixtures/collector-challenges.json');
test('collector challenge bank spans player and sports/retro collector needs',()=>{
  assert.ok(bank.cases.length>=18);
  assert.equal(new Set(bank.cases.map(x=>x.id)).size,bank.cases.length);
  for(const match of ['Pokemon','One Piece','Other TCG','Sports baseball','Sports football','Sports basketball','Sports hockey','Sports soccer','Sports racing','Video games','Hardware','Collectibles'])
    assert.ok(bank.cases.some(x=>x.domain===match),'Missing '+match);
  assert.ok(bank.cases.every(x=>x.journey.some(v=>v.includes('buyer'))&&x.journey.some(v=>v.includes('seller'))));
});
test('snapshot audit never confuses a dropdown with full customer acceptance',()=>{
  const result=audit(catalog,bank);
  assert.equal(result.challengeCount,bank.cases.length);
  assert.ok(result.cases.every(c=>c.buyerSellerAcceptance==='NOT_TESTED_BY_SNAPSHOT'));
  assert.ok(result.counts.PRESENT>0);
  assert.ok(result.cases.find(c=>c.id==='opc-hockey-modern').checks.some(c=>c.field==='sportsProductLine'&&c.status==='NOT_TRACKED'));
});
test('missing known dropdown option is not accidentally reported present',()=>{
  const copy=structuredClone(catalog);
  copy.controls.gamePlatform=copy.controls.gamePlatform.filter(x=>x.value!=='Nintendo Switch 2');
  const result=audit(copy,bank);
  assert.ok(result.cases.find(c=>c.id==='switch2-game').checks.some(x=>x.status==='MISSING_IN_SNAPSHOT'));
});
