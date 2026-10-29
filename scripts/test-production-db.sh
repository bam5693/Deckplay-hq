#!/usr/bin/env bash
# Disposable localhost fixture ONLY. Never accepts hosted Supabase URLs.
set -euo pipefail
: "${DATABASE_URL:?Disposable PostgreSQL connection required}"
case "$DATABASE_URL" in postgresql://*\@127.0.0.1:*/*|postgres://*\@127.0.0.1:*/*) ;; *) echo 'Refusing non-local test database' >&2; exit 1;; esac
run() { psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$1" >/dev/null; echo "PASS $1"; }
mkdir -p test-results
run tests/fixtures/production-schema.sql
run tests/fixtures/production-legacy-records.sql
# Prove a mid-release error rolls back every preceding DDL/trigger/grant change.
sed 's/^commit;$/select 1\/0;\ncommit;/' release/migrations/20261029214603_coordinated_production_compatibility.sql > test-results/forced-migration-failure.sql
if psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f test-results/forced-migration-failure.sql > test-results/forced-migration-failure.log 2>&1; then
 echo 'Forced migration failure unexpectedly succeeded' >&2; exit 1
fi
[[ "$(psql "$DATABASE_URL" -X -tA -c "select count(*) from information_schema.columns where table_schema='public' and table_name='trade_offers' and column_name='item_snapshots'")" = 0 ]] || { echo 'Partial migration escaped rollback' >&2; exit 1; }
echo 'PASS forced migration failure leaves legacy schema unchanged'
run release/migrations/20261029214603_coordinated_production_compatibility.sql
failures="$(psql "$DATABASE_URL" -X -tA -v ON_ERROR_STOP=1 -f release/schema-contract.sql)"
[[ -z "$failures" ]] || { echo "$failures" >&2; exit 1; }
echo 'PASS exact release schema/RPC/RLS contract'
for test in production-compatibility release-price-actions multi-item-trades category-trade-lifecycle release-negotiation-history collection-sharing listing-drafts seller-overview listing-editor inbox-history; do
 run "tests/integration/$test.sql"
done

node scripts/category-transaction-sql.cjs
run /tmp/deckplay-category-transactions.sql
