import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProductionUri} from '../validate-database-uri.mjs';
const pooler='postgresql://postgres.yffruutknztvdyioovmp:random%40safe@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
const direct='postgresql://postgres:random%40safe@db.yffruutknztvdyioovmp.supabase.co:5432/postgres';
test('accept production session pooler and direct URI without logging passwords',()=>{
  assert.equal(validateProductionUri(pooler),true);
  assert.equal(validateProductionUri(direct),true);
});
test('reject missing or malformed connection values',()=>{
 for (const value of ['', 'postgres.yffruutknztvdyioovmp', 'https://supabase.com/dashboard', 'postgresql://postgres.yffruutknztvdyioovmp@aws-0-us-east-2.pooler.supabase.com:5432/postgres','postgresql://postgres.yffruutknztvdyioovmp:p@other-host.net/postgres','postgresql://postgres.someotherid:p@aws-0-us-east-2.pooler.supabase.com:5432/postgres','postgresql://postgres.yffruutknztvdyioovmp:%5BYOUR-PASSWORD%5D@aws-0-us-east-2.pooler.supabase.com:5432/postgres']) {
   assert.throws(()=>validateProductionUri(value),/connection|must|missing|password|placeholder|production/i);
 }
});
