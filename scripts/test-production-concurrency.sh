#!/usr/bin/env bash
set -euo pipefail
case "${DATABASE_URL:-}" in postgresql://*\@127.0.0.1:*/*|postgres://*\@127.0.0.1:*/*) ;; *) echo 'Refusing non-local race test' >&2; exit 1;; esac
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/fixtures/production-concurrent-offers.sql >/dev/null
mkdir -p test-results
race() {
 local call="$1" file="$2"
 psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$file" 2>&1 <<SQL
begin;
set local lock_timeout='10s';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select $call;
commit;
SQL
}
race "public.respond_price_offer('73000000-0000-4000-8000-000000000001','accept')" test-results/race-price.txt & first=$!
race "public.respond_trade_offer('74000000-0000-4000-8000-000000000001','accepted')" test-results/race-trade.txt & second=$!
first_result=0; second_result=0
wait "$first" || first_result=$?
wait "$second" || second_result=$?
[[ "$first_result" = 0 || "$second_result" = 0 ]] || { cat test-results/race-*.txt; exit 1; }
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
do $$ declare accepted integer;begin
 select (select count(*) from public.price_offers where id='73000000-0000-4000-8000-000000000001' and status='accepted')+(select count(*) from public.trade_offers where id='74000000-0000-4000-8000-000000000001' and status='accepted') into accepted;
 if accepted<>1 then raise exception 'Concurrent price/trade acceptance double-reserved or accepted neither';end if;
 if exists(select 1 from public.price_offers where id='73000000-0000-4000-8000-000000000001' and status in ('pending','countered')) or exists(select 1 from public.trade_offers where id='74000000-0000-4000-8000-000000000001' and status='pending') then raise exception 'Competing proposal left actionable';end if;
end $$;
SQL
echo 'PASS independent sessions: concurrent price/trade acceptance has exactly one winner'
