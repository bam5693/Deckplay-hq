// Offline export of every Supabase Storage object listed by the production database.
// Runs only on the private GitHub Actions runner. Never commit manifest or objects.
import {createHash} from 'node:crypto';
import {createWriteStream, mkdirSync, readFileSync, writeFileSync, unlinkSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';

const MAX_OBJECT_BYTES = 256 * 1024 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;

export function validateObject(bucket, name) {
  if (typeof bucket !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(bucket)) throw Error('Invalid bucket in database inventory.');
  if (typeof name !== 'string' || !name || name.length > 1024 ||
      name.startsWith('/') || name.split('/').some(s => !s || s === '.' || s === '..') ||
      /[\\\x00-\x1f\x7f]/.test(name)) throw Error('Unsafe object name in database inventory.');
  return {bucket, name};
}
export function objectKey(bucket, name) {
  validateObject(bucket, name);
  return createHash('sha256').update(bucket + '\0' + name).digest('hex');
}
export function storageUrl(project, bucket, name) {
  validateObject(bucket, name);
  if (!/^[a-z0-9]{20}$/.test(project)) throw Error('Invalid Supabase project ID.');
  return 'https://' + project + '.supabase.co/storage/v1/object/authenticated/' +
    encodeURIComponent(bucket) + '/' + name.split('/').map(encodeURIComponent).join('/');
}
export function parseInventory(data) {
  const seen = new Set();
  const rows = [];
  for (const line of data.split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const {bucket, name} = validateObject(row.bucket, row.name);
    const key = objectKey(bucket, name);
    if (seen.has(key)) throw Error('Duplicate database object in inventory.');
    seen.add(key);
    rows.push({bucket, name, key});
  }
  return rows;
}

export async function exportStorage({inventoryPath, outputDir, project, secret, fetchFn=fetch}) {
  if (!secret || secret.length < 20) throw Error('Storage service credential missing.');
  const rows = parseInventory(readFileSync(inventoryPath, 'utf8'));
  mkdirSync(join(outputDir, 'objects'), {recursive:true, mode:0o700});
  const exported = [];
  let total = 0;
  for (const row of rows) {
    const relativePath = 'objects/' + row.key.slice(0, 2) + '/' + row.key;
    const filePath = join(outputDir, relativePath);
    mkdirSync(dirname(filePath), {recursive:true, mode:0o700});
    const response = await fetchFn(storageUrl(project, row.bucket, row.name), {
      headers: {apikey: secret, Authorization: 'Bearer ' + secret},
      signal: AbortSignal.timeout(120000),
      redirect: 'error'
    });
    if (!response.ok || !response.body) throw Error('Storage object download failed (HTTP ' + response.status + '). Backup aborted.');
    const hash = createHash('sha256');
    let bytes = 0;
    const meter = new Transform({
      transform(chunk, encoding, callback) {
        bytes += chunk.length;
        total += chunk.length;
        if (bytes > MAX_OBJECT_BYTES || total > MAX_TOTAL_BYTES)
          return callback(Error('Storage export exceeded safety size limit; backup incomplete.'));
        hash.update(chunk);
        callback(null, chunk);
      }
    });
    try {
      await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(filePath, {flags:'wx', mode:0o600}));
    } catch (error) {
      try {unlinkSync(filePath);} catch {}
      throw error;
    }
    exported.push({bucket:row.bucket, name:row.name, path:relativePath, bytes, sha256:hash.digest('hex')});
  }
  writeFileSync(join(outputDir, 'storage-files.jsonl'), exported.map(x=>JSON.stringify(x)).join('\n') + (exported.length ? '\n' : ''), {mode:0o600});
  return {objects:exported.length, bytes:total};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [inventoryPath, outputDir] = process.argv.slice(2);
  const project = process.env.DECKPLAY_PROD_PROJECT_REF;
  const secret = process.env.DECKPLAY_PROD_SERVICE_ROLE_KEY;
  if (!inventoryPath || !outputDir || project !== 'yffruutknztvdyioovmp') throw Error('Private production backup configuration missing or incorrect.');
  const {objects, bytes} = await exportStorage({inventoryPath, outputDir, project, secret});
  console.log('Storage objects backed up:', objects, 'Total bytes:', bytes);
}
