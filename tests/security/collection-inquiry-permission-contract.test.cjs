const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../reports');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('collection inquiry migration explicitly grants authenticated invoker dependencies', () => {
  const sql = read('production-preview-collection-inquiry-rpc-candidate.sql').toLowerCase();
  assert.match(sql, /grant usage on schema private to authenticated\s*;/);
  assert.match(sql, /grant execute on function private\.send_collection_inquiry\(uuid,text,text,text\) to authenticated\s*;/);
  assert.match(sql, /grant execute on function public\.send_collection_inquiry\(uuid,text,text,text\) to authenticated\s*;/);
  assert.match(sql, /revoke all on function public\.send_collection_inquiry\(uuid,text,text,text\) from public,anon\s*;/);
  assert.match(sql, /security definer/);
  assert.match(sql, /security invoker/);
});

test('private inquiry-history table denies direct authenticated access', () => {
  const sql = read('production-preview-collection-inquiries-candidate.sql').toLowerCase();
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for all to authenticated using \(false\) with check \(false\)/);
  assert.match(sql, /revoke all on private\.collection_inquiries from anon, authenticated/);
});
