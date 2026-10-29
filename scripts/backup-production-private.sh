#!/usr/bin/env bash
# DeckPlay HQ production backup — run on a trusted computer, never in GitHub Actions.
# Requires PostgreSQL client tools pg_dump and pg_restore and a privileged Supabase
# database connection string (from Supabase Dashboard > Connect).
# Never commit or paste the connection string, or upload backups to the repository.
set -euo pipefail
umask 077
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL securely in your local terminal; do not paste it into chat." >&2
  exit 1
fi
for command in pg_dump pg_restore psql; do
  command -v "$command" >/dev/null || { echo "Missing $command" >&2; exit 1; }
done
backup_dir="${1:-./private-backups}"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$backup_dir/deckplay-production-$stamp.dump"
# Never leave a partial archive that could be mistaken for a valid backup.
complete=false
cleanup() { if [[ "$complete" != true ]]; then rm -f -- "$file" "$file.contents" "$file.sha256" "$file.prerequisites.sql" "$file.restore-list"; fi; }
trap cleanup EXIT
# Include auth users, identities and other login records as well as application data.
# A custom archive is restorable with pg_restore. Database extensions, Supabase
# managed roles/secrets, storage object BYTES and external service configuration
# require separate recovery planning.
# Include the private signup implementation referenced by auth's trigger.
# Keep grants: omitting ACLs can restore data while leaving client roles unable to use it.
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner \
  --schema=auth --schema=public --schema=private --schema=storage --schema=extensions --schema=deckplay_admin \
  --file="$file"
# Schema-filtered pg_dump does not include CREATE EXTENSION, even when table
# defaults depend on it. Capture exact extension/schema prerequisites separately.
psql "$DATABASE_URL" -X -tA -v ON_ERROR_STOP=1 > "$file.prerequisites.sql" <<'SQL'
select format('CREATE SCHEMA IF NOT EXISTS %I;',nspname) from pg_namespace
where nspname in ('auth','public','private','storage','extensions','deckplay_admin') order by nspname;
select format('CREATE EXTENSION IF NOT EXISTS %I WITH SCHEMA %I VERSION %L;',e.extname,n.nspname,e.extversion)
from pg_extension e join pg_namespace n on n.oid=e.extnamespace
where n.nspname in ('auth','public','private','storage','extensions','deckplay_admin') and e.extname<>'plpgsql'
order by e.extname;
SQL
pg_restore --list "$file" > "$file.contents"
# Schemas are created before extensions. Keep their ACLs/comments, omit only CREATE SCHEMA.
sed '/^[0-9][0-9]*; [0-9][0-9]* [0-9][0-9]* SCHEMA - /d' "$file.contents" > "$file.restore-list"
if ! grep -Eq 'TABLE DATA.*auth users' "$file.contents"; then
  echo "ERROR: Archive does not contain auth.users table data. Do not deploy." >&2
  exit 1
fi
if ! grep -Eq 'TABLE DATA.*public profiles' "$file.contents"; then
  echo "ERROR: Archive does not contain public.profiles table data. Do not deploy." >&2
  exit 1
fi
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$backup_dir" && sha256sum "$(basename "$file")" "$(basename "$file").prerequisites.sql" "$(basename "$file").restore-list" > "$(basename "$file").sha256")
fi
complete=true
echo "Backup archive created and readable: $file"
echo "IMPORTANT: Listing an archive is NOT a verified restore. Restore into a separate"
echo "isolated PostgreSQL database and verify accounts/data before production migration."
