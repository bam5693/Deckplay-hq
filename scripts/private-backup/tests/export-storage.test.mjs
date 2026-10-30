import test from 'node:test';
import assert from 'node:assert/strict';
import {objectKey, storageUrl, parseInventory, validateObject} from '../export-storage.mjs';

test('hashed file paths are stable, never raw customer paths', () => {
  const a = objectKey('listing-images', 'collector/example front.JPG');
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(a, objectKey('listing-images', 'collector/example front.JPG'));
  assert.notEqual(a, objectKey('profile-avatars', 'collector/example front.JPG'));
  assert.ok(!a.includes('collector'));
});
test('Storage download URL encodes each nested path element', () => {
  const url = storageUrl('yffruutknztvdyioovmp', 'listing-images', 'folder/front #1.jpg');
  assert.equal(url, 'https://yffruutknztvdyioovmp.supabase.co/storage/v1/object/authenticated/listing-images/folder/front%20%231.jpg');
});
test('inventory includes all folders and refuses duplicate rows', () => {
  const a = JSON.stringify({bucket:'listing-images', name:'user/a/photo.jpg'});
  const b = JSON.stringify({bucket:'profile-avatars', name:'nested/avatar.webp'});
  assert.equal(parseInventory(a+'\n'+b+'\n').length, 2);
  assert.throws(()=>parseInventory(a+'\n'+a),/Duplicate/);
  assert.equal(parseInventory('').length,0);
});
test('path traversal, separators, unsupported bucket and control bytes fail closed', () => {
  for (const bad of ['', '../name', 'folder/../image', '/name', 'folder//name', 'folder\\image', 'line\nname']) {
    assert.throws(()=>validateObject('listing-images',bad));
  }
  assert.throws(()=>validateObject('../evil','a.jpg'));
  assert.throws(()=>storageUrl('bad-project','listing-images','valid.jpg'));
});

test('actual exporter saves every download byte and verifies its hash', async () => {
 const {mkdtempSync,writeFileSync,readFileSync,rmSync} = await import('node:fs');
 const {tmpdir} = await import('node:os');
 const {join} = await import('node:path');
 const {createHash} = await import('node:crypto');
 const {exportStorage} = await import('../export-storage.mjs');
 const tmp=mkdtempSync(join(tmpdir(),'deckplay-safe-test-'));
 try {
  const inventory=join(tmp,'inventory.jsonl'), output=join(tmp,'out');
  writeFileSync(inventory, JSON.stringify({bucket:'listing-images',name:'owner/front 1.png'})+'\n');
  const fetchFn=async(url,options)=>{
   assert.match(url,/front%201.png$/);
   assert.ok(options.headers.apikey);
   return new Response(Buffer.from('test-only-photo'), {status:200});
  };
  const result=await exportStorage({inventoryPath:inventory,outputDir:output,project:'yffruutknztvdyioovmp',secret:'test-only-credential-12345678',fetchFn});
  assert.equal(result.objects,1);
  const files=readFileSync(join(output,'storage-files.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(files.length,1);
  const bytes=readFileSync(join(output,files[0].path));
  assert.equal(bytes.toString(),'test-only-photo');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),files[0].sha256);
 } finally {rmSync(tmp,{force:true,recursive:true})}
});
test('missing Storage bytes fail the entire export, never write success manifest', async()=>{
 const {mkdtempSync,writeFileSync,existsSync,rmSync} = await import('node:fs');
 const {tmpdir} = await import('node:os');
 const {join} = await import('node:path');
 const {exportStorage} = await import('../export-storage.mjs');
 const tmp=mkdtempSync(join(tmpdir(),'deckplay-failure-test-'));
 try {
  const inventory=join(tmp,'inventory.jsonl'),output=join(tmp,'out');
  writeFileSync(inventory,JSON.stringify({bucket:'listing-images',name:'owner/missing.png'})+'\n');
  await assert.rejects(exportStorage({inventoryPath:inventory,outputDir:output,project:'yffruutknztvdyioovmp',secret:'test-only-credential-12345678',fetchFn:async()=>new Response('missing',{status:404})}),/HTTP 404/);
  assert.equal(existsSync(join(output,'storage-files.jsonl')),false);
 }finally{rmSync(tmp,{force:true,recursive:true})}
});
