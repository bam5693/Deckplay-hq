#!/usr/bin/env bash
# Real archives stay on the operator's trusted machine; never execute in CI.
# Requires an existing, network-isolated official Supabase PostgreSQL container.
set -euo pipefail
set +x
umask 077
[[ -z ${GITHUB_ACTIONS:-} ]] || { echo 'Real recovery is prohibited in CI' >&2; exit 1; }
container=${1:?Existing isolated recovery container required}
archive=${2:?Full custom-format archive required}
database=${3:?New recovery database name required}
[[ $container =~ ^deckplay-[a-z0-9-]*restore-test$ ]] || { echo 'Unexpected recovery container name' >&2; exit 1; }
[[ $database =~ ^deckplay_recovery_[0-9]{8}_[a-z0-9_]+$ ]] || { echo 'Recovery database name required' >&2; exit 1; }
[[ -f $archive && ! -L $archive ]] || { echo 'Archive must be a regular local file' >&2; exit 1; }
image=$(docker inspect -f '{{.Config.Image}}' "$container")
[[ $image == supabase/postgres:* ]] || { echo 'Official compatible Supabase image required' >&2; exit 1; }
[[ $(docker inspect -f '{{len .NetworkSettings.Networks}}' "$container") == 0 ]] || { echo 'Disconnect recovery networks first' >&2; exit 1; }
[[ $(docker inspect -f '{{len .HostConfig.PortBindings}}' "$container") == 0 ]] || { echo 'Recovery ports must not be published' >&2; exit 1; }
private_dir=$(dirname "$archive")
chmod 700 "$private_dir"
log="$private_dir/$database.restore.log"
# The password stays inside the isolated container. Never inspect Config.Env or echo it.
psql_local() {
 docker exec -i "$container" sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -X -w -v ON_ERROR_STOP=1 -U supabase_admin "$@"' recovery "$@"
}
[[ $(psql_local -d postgres -Atc "select rolsuper from pg_roles where rolname=current_user") == t ]] || { echo 'Existing recovery administrator required' >&2; exit 1; }
# Older images lack this production role. Preserve its actual unprivileged attributes.
psql_local -d postgres >/dev/null <<'SQL'
do $$ begin
 if not exists(select from pg_roles where rolname='supabase_realtime_admin') then
  create role supabase_realtime_admin noinherit nologin;
 end if;
 if exists(select from pg_roles where rolname='supabase_realtime_admin' and
 (rolsuper or rolinherit or rolcanlogin or rolcreaterole or rolcreatedb or rolreplication or rolbypassrls)) then
  raise exception 'Recovery role differs from recorded production attributes';
 end if;
end $$;
SQL
# No database/schema deletion, no --clean, no ignored errors, no ownership/ACL stripping.
docker cp "$archive" "$container:/tmp/deckplay-private-recovery.dump" >/dev/null
docker exec "$container" pg_restore -f /dev/null /tmp/deckplay-private-recovery.dump
docker exec "$container" sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec createdb -w -U supabase_admin -T template0 -- "$1"' recovery "$database"
if ! docker exec "$container" sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_restore -w -U supabase_admin --exit-on-error --single-transaction --dbname="$1" /tmp/deckplay-private-recovery.dump' recovery "$database" >"$log" 2>&1; then
 echo "Restore failed and rolled back. Inspect the private log locally: $log" >&2
 exit 1
fi
sha256sum "$archive" > "$private_dir/$database.source.sha256"
echo "Real archive restored atomically into isolated $database; validate fingerprints, grants, policies and service recovery separately."
