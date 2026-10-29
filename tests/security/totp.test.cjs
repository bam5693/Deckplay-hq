const {test}=require('node:test');const assert=require('node:assert/strict');const {totp}=require('../helpers/totp.cjs');
test('test-only TOTP matches RFC 6238 SHA-1 vectors reduced to six digits',()=>{
 // RFC 6238 Appendix B uses the ASCII key 12345678901234567890.
 const encoded='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
 for(const [seconds,code] of [[59,'287082'],[1111111109,'081804'],[1111111111,'050471'],[1234567890,'005924'],[2000000000,'279037'],[20000000000,'353130']])assert.equal(totp(encoded,seconds),code);
});
test('test-only TOTP rejects malformed keys and invalid timestamps',()=>{
 for(const key of ['', 'not-a-base32-key', '<script>'])assert.throws(()=>totp(key));
 for(const seconds of [NaN,Infinity,-1])assert.throws(()=>totp('GEZDGNBV',seconds));
});
