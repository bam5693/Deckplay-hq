#!/usr/bin/env bash
# Creates an encrypted, verified export on the PRIVATE GitHub Actions runner.
# No production writes, no GitHub artifacts containing plaintext, no chat credentials.
set -Eeuo pipefail
umask 077

required=(DECKPLAY_PROD_DATABASE_URL DECKPLAY_PROD_SERVICE_ROLE_KEY DECKPLAY_BACKUP_PASSPHRASE DECKPLAY_PROD_PROJECT_REF RUNNER_TEMP GITHUB_OUTPUT)
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then echo "Missing required private backup setting: $key" >&2; exit 1; fi
done
if [[ "$DECKPLAY_PROD_PROJECT_REF" != "yffruutknztvdyioovmp" ]]; then
  echo "Refusing to back up an unexpected Supabase project." >&2; exit 1
fi
if [[ "${#DECKPLAY_BACKUP_PASSPHRASE}" -lt 24 ]]; then
  echo "Backup encryption passphrase must be at least 24 characters." >&2; exit 1
fi
for cmd in docker node gpg tar sha256sum grep; do
  command -v "$cmd" >/dev/null || { echo "Required backup command unavailable: $cmd" >&2; exit 1; }
done
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d "$RUNNER_TEMP/deckplay-plain.XXXXXXXX")"
cleanup() { rm -rf -- "$WORK"; }
trap cleanup EXIT
mkdir -m 700 "$WORK/export"
# PostgreSQL 17 client matches the current production server major version.
# The connection string passes into the isolated client as an environment variable.
docker run --rm -e DECKPLAY_PROD_DATABASE_URL -e PGSSLMODE=require postgres:17 sh -ceu '
  exec pg_dump --dbname="$DECKPLAY_PROD_DATABASE_URL" --format=custom --no-owner --no-acl \
    --schema=auth --schema=public --schema=private --schema=storage
' > "$WORK/export/db.dump"
test -s "$WORK/export/db.dump" || { echo "Empty database dump; aborting." >&2; exit 1; }
docker run --rm -v "$WORK/export:/backup:ro" postgres:17 pg_restore --list /backup/db.dump > "$WORK/export/db.contents"
grep -Eq 'TABLE DATA[[:space:]]+auth[[:space:]]+users' "$WORK/export/db.contents" || {
  echo "Auth user data absent from archive TOC; aborting." >&2; exit 1;
}
grep -Eq 'TABLE DATA[[:space:]]+public[[:space:]]+profiles' "$WORK/export/db.contents" || {
  echo "Application profile table absent from archive TOC; aborting." >&2; exit 1;
}
# Inventory comes directly from privileged database metadata. It includes objects
# in PRIVATE buckets and every nested path; listing the bucket root is insufficient.
docker run --rm -e DECKPLAY_PROD_DATABASE_URL -e PGSSLMODE=require postgres:17 sh -ceu '
  exec psql "$DECKPLAY_PROD_DATABASE_URL" -X -v ON_ERROR_STOP=1 -A -t -c     "SELECT json_build_object('\''bucket'\'',bucket_id,'\''name'\'',name)::text FROM storage.objects WHERE name IS NOT NULL ORDER BY bucket_id,name"
' > "$WORK/export/storage-inventory.jsonl"
node "$SCRIPT_DIR/export-storage.mjs" "$WORK/export/storage-inventory.jsonl" "$WORK/export"
(cd "$WORK/export" && sha256sum db.dump > database.sha256)
tar -C "$WORK/export" -czf "$WORK/export.tar.gz" db.dump db.contents database.sha256 storage-inventory.jsonl storage-files.jsonl objects
tag="deckplay-prod-$(date -u +%Y%m%dT%H%M%SZ)-${GITHUB_RUN_ID:-manual}-${GITHUB_RUN_ATTEMPT:-1}"
file="$RUNNER_TEMP/$tag.tar.gz.gpg"
# GPG AES-256 includes integrity protection. Passphrase is piped, never an argument.
printf '%s\n' "$DECKPLAY_BACKUP_PASSPHRASE" |
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 0 \
    --cipher-algo AES256 --s2k-digest SHA512 --symmetric -o "$file" "$WORK/export.tar.gz"
# Decrypt/parse the entire finished archive to ensure encryption was usable.
printf '%s\n' "$DECKPLAY_BACKUP_PASSPHRASE" |
  gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 0 --decrypt "$file" |
  tar -tzf - >/dev/null
(cd "$RUNNER_TEMP" && sha256sum "$(basename "$file")" > "$(basename "$file").sha256")
echo "backup_file=$file" >> "$GITHUB_OUTPUT"
echo "backup_tag=$tag" >> "$GITHUB_OUTPUT"
echo "Encrypted database + exact Storage-object export verified locally. No restore has been performed."
