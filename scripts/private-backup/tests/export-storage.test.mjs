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
