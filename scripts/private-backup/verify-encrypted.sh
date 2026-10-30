#!/usr/bin/env bash
# Offline verification of an encrypted backup. NOT a complete restore rehearsal.
set -Eeuo pipefail
umask 077
file="${1:-}"
if [[ ! -f "$file" || -z "${DECKPLAY_BACKUP_PASSPHRASE:-}" ]]; then
  echo "Provide encrypted archive path and passphrase from a secure environment." >&2; exit 1
fi
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
printf '%s\n' "$DECKPLAY_BACKUP_PASSPHRASE" |
  gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 0 --decrypt "$file" |
  tar -xz -C "$tmp"
(cd "$tmp" && sha256sum -c database.sha256 >/dev/null)
node --input-type=module - "$tmp" <<'JS'
import {createHash} from 'node:crypto';
import {createReadStream, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {finished} from 'node:stream/promises';
import {parseInventory, objectKey} from './scripts/private-backup/export-storage.mjs';
const root=process.argv[2];
const rows=parseInventory(readFileSync(join(root,'storage-inventory.jsonl'),'utf8'));
const files=readFileSync(join(root,'storage-files.jsonl'),'utf8').split('\n').filter(Boolean).map(s=>JSON.parse(s));
if (rows.length !== files.length) throw Error('Missing Storage objects in archive.');
for (let i=0;i<rows.length;i++) {
 const row=rows[i], file=files[i], relative='objects/'+row.key.slice(0,2)+'/'+objectKey(row.bucket,row.name);
 if (file.bucket!==row.bucket||file.name!==row.name||file.path!==relative||!Number.isSafeInteger(file.bytes)||file.bytes<0) throw Error('Storage manifest mismatch.');
 const path=join(root,relative);
 if (statSync(path).size!==file.bytes) throw Error('Storage object size mismatch.');
 const hash=createHash('sha256');
 const stream=createReadStream(path);stream.on('data',chunk=>hash.update(chunk));await finished(stream);
 if (hash.digest('hex')!==file.sha256) throw Error('Storage object checksum mismatch.');
}
console.log('Verified all',files.length,'Storage objects and database archive checksum.');
JS
if command -v docker >/dev/null; then
  docker run --rm -v "$tmp:/backup:ro" postgres:17 pg_restore --list /backup/db.dump >/dev/null
  echo "Postgres 17 custom dump archive is readable."
else
  echo "Docker missing: PostgreSQL archive TOC check not performed." >&2; exit 1
fi
echo "Archive verified. A real isolated Supabase Auth/Storage restore test is STILL required before production migration."
