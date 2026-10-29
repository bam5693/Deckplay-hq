# DeckPlay HQ — current staging status, 2026-10-29 09:47 CDT

**Scope:** isolated GitHub branch `test/staging-reporting`, draft PR #2, Supabase `prrrzeelltmyugssqnzk`, private Worker `deckplay-hq-staging`. Production, main, payments, shipping, billing and real customer data are out of scope.

## Verified this run

- Reviewed current handoff and development ledger, branch SHA, PR conflicts, recent CI, staging database and deployed Worker.
- [Run 40893130075](https://github.com/bam5693/Deckplay-hq/actions/runs/40893130075) ran at `12a9d7b93c18`: 152 selected local browser checks passed; 55 real staging API checks passed; the **focused live private-photo preflight failed on desktop and mobile**. Actual UI response: `Photo upload limit reached. Try again tomorrow`. Full deployed journeys were gated off. This is the known 30-new-photo rolling-24-hour quota on the dedicated synthetic buyer, not a demonstrated ordinary-user photo regression.
- Read-only staging SQL counted **30** in-window photo upload events on one account, oldest `2026-10-28 21:39:30 UTC`. First event expires `2026-10-29 21:39:30 UTC` (16:39:30 CDT). No quota events were deleted and no limit was raised. Do not run another expensive photo/full CI suite before quota availability is verified.
- **Customer-facing fix:** `1a728e74d98490dcaed2be7cf3c152528d18d994`. A live-listings API failure no longer replaces actual inventory with fake demo items. Both returned API errors and thrown/offline requests show a clear, accessible retry state; a successful retry restores live inventory. Initial marketplace load no longer flashes demo cards.
- **Targeted browser regression source:** `676bf82c9a40315e7bb297118731924f9c0a7150`, `tests/e2e/marketplace-live-recovery.spec.js`, covers API-error/no-fake-inventory/retry and thrown-network-error cases. File parses; **Playwright cases not executed**.
- **Executed preflight:** five inline homepage JavaScript blocks parsed in V8; mocked `loadListings()` exercised returned API failure, thrown network failure, and successful empty-result recovery. All three passed. This is not a substitute for authenticated browser execution.
- **Exact isolated deployment:** Worker `70e156e9-46c8-45ad-b364-034769c5b860`, 100% private staging traffic. Read-back homepage reversed the seven expected staging substitutions to **392,368 characters / FNV-1a64 `d9495d9730063335`**, exactly matching GitHub source at `676bf82`. All 23 assets retained; Basic Auth, three existing secret bindings and all three cron schedules preserved. No production Supabase URL in deployed homepage.
- Staging Supabase was `ACTIVE_HEALTHY`. PR #2 remains draft, `dirty`/conflicted with main; no merge or production changes. No new Actions run or paid subscription initiated.

## Next actions

1. After 16:39 CDT, verify the rolling photo quota has an available slot before any focused authenticated desktop/mobile photo retest. A passing new-photo test requires quota capacity; do not mask it by deleting fixture events or weakening server checks.
2. Run the two focused marketplace live-outage/retry browser regressions against matching staging source, without a redundant full-suite rerun. If the isolated browser runner is unavailable, keep this branch **deployed but browser-unverified**.
3. Continue higher-value transaction recovery and category/mobile gaps; do not rebuild historically verified Trunks 1/2 wholesale. Resolve Favorites/main conflict only by careful staging-branch reconciliation, never merge PR #2 into main.

**Cost discipline:** Existing connected services only. One private Worker upload; no additional GitHub Actions run triggered by this batch. Actual provider usage allowances were not independently established, so do not call this deployment free.
