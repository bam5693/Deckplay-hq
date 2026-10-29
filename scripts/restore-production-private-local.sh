#!/usr/bin/env bash
# Rehearse ONLY into an EMPTY local recovery database with matching Supabase roles/extensions.
# Never points at a hosted production/staging project. Never drops a schema or existing row.
set -euo pipefail
umask 077
: "${RECOVERY_DATABASE_URL:?Empty local recovery database required}"
case "$RECOVERY_DATABASE_URL" in postgresql://*\@127.0.0.1:*/*|postgres://*\@127.0.0.1:*/*|postgresql://*\@localhost:*/*|postgres://*\@localhost:*/*) ;; *) echo 'Refusing non-local recovery target' >&2; exit 1;; esac
archive="${1:?Backup archive required}"
for command in psql pg_restore sha256sum; do command -v "$command" >/dev/null; done
for file in "$archive" "$archive.sha256" "$archive.prerequisites.sql" "$archive.restore-list"; do [[ -f "$file" ]] || { echo 'Incomplete backup package' >&2; exit 1; }; done
(cd "$(dirname "$archive")" && sha256sum -c "$(basename "$archive").sha256")
objects="$(psql "$RECOVERY_DATABASE_URL" -X -tA -v ON_ERROR_STOP=1 -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not like 'pg_%' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','S','f')")"
[[ "$objects" = 0 ]] || { echo 'Recovery target is not empty; refusing to overwrite it' >&2; exit 1; }
psql "$RECOVERY_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$archive.prerequisites.sql" >/dev/null
pg_restore --dbname="$RECOVERY_DATABASE_URL" --no-owner --exit-on-error --single-transaction --use-list="$archive.restore-list" "$archive"
echo 'Archive restored. Application fingerprints, RLS, roles and auth checks must still pass.'
