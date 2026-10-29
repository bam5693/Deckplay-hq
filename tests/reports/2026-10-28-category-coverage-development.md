# Category coverage, merge repair and owner listing edits — 2026-10-28

Scope: branch `test/staging-reporting`, draft PR #2, isolated Supabase `prrrzeelltmyugssqnzk`, private Worker `deckplay-hq-staging`. Production/main are not modified. No payments, shipping labels or real transactions.

## Published development batches

1. **Merge repair:** `13473cc8f0ea72ab06d9c29fe8644adfdb9d7375` merges main `13423748ef9662ef39fbf3ad9f003a19a1112f23` into staging `30f15a4d0bd86d10a10d078bfebd71bd93f2fcb2`. Both parents preserved; no force push. AI retry behavior retained. Both main manual dispatch launchers retained. Verification retains main's previously removed job environment; protected deployment and OIDC/private-test environments remain. Eleven YAML files parse; five inline scripts parse. GitHub confirmed PR #2 mergeable, open, draft and unmerged.
2. **Catalog/discovery/inventory:** `208ba4ee0f342666a80281bf8a16c65b6fc66d42`. Discovery options derive from the seller game selector, restoring six omitted supported games. Publication now persists `product_type`. Runtime catalog extraction, local category journeys and deployed inventory journeys cover all four named personas and both viewports. Stable synthetic browse inventory is populated across every supported canonical category/type route.
3. **Owner listing editor:** `4792e7534c436f69149868e8be24f8e69fdd182a`. My listings provides Edit details for title, exact disclosures, asking price and offer/trade preferences. Existing category/photos remain. Owner, active-status, timestamp and original editable-field filters prevent stale updates, including changes that do not advance the timestamp. Account/request guards clear private editor state and reject late results. Failures keep edits. Duplicate submissions are disabled. No SQL/schema changes. Test fixture helper now respects requested categories instead of silently overriding them with trading cards. Added signed API coverage across the entire catalog, plus a deployed video-game editing/concurrent-change journey.

## Actual catalog and persistent synthetic inventory

Derived from the runtime DOM, not a manually maintained list. `tests/fixtures/category-catalog.json` is a generated inventory snapshot; tests derive fresh choices on every run.

| Storage category | Canonical combinations / retained test listings |
|---|---:|
| Trading cards | 76: 19 games/series × single, deck, lot, sealed |
| Video games | 22 platform choices |
| Consoles | 6 brands |
| Controllers | 6 brands |
| Accessories | 6 brands |
| Collectibles | 7 subcategories |
| Other | 1 |
| Total | 124 |

Also enumerated: 8 listing types, 7 categories, 8 sports brands, 4 general conditions, 7 card conditions, 6 graders, 19 grade choices, 5 sorting options, 110 Pokémon and 35 One Piece dependent set choices. Other games retain their actual custom/manual detail architecture; no unsupported catalogs were invented.

Inventory is marked **TEST ONLY CATALOG**, split between the two dedicated synthetic sellers, with varied prices/conditions/preferences. Placeholder art is original SVG clearly marked synthetic, served only by the private staging Worker. No real product imagery or assets are represented as verified products. Generator: `scripts/category-inventory-sql.cjs`; stable namespace-derived UUIDs, verified synthetic identities and collision checks, `ON CONFLICT DO NOTHING`. Repeated runs do not duplicate or overwrite manually exercised records. The generator only writes SQL to scratch; execute only through the explicit isolated project connection. Temporary signed API/browser fixtures use their existing exact random marker cleanup, not the retained catalog IDs.

## Verification evidence and limits

**Catalog release:** [private run 40804649952](https://github.com/bam5693/Deckplay-hq/actions/runs/40804649952) passed: 54 real API, 63 deployed browser, 312 selected local, 11 cleanup-safety and 6 private-photo checks. One intentional duplicate mobile MFA case is skipped, not passed. All eight deployed persona/viewport catalog journeys passed. [Full local CI 40804654609](https://github.com/bam5693/Deckplay-hq/actions/runs/40804654609) passed. The merge-only CI failure was the pre-existing hidden-inbox counteroffer fixture and was corrected; historical red runs are not erased.

**Owner editor local:** integrated full suite 466 passed. Final targeted editor/catalog suite 18 passed, including all 124 combinations × four personas × two viewports and every dependent dropdown. Separate security suite: 43 passed. Counts overlap and must not be summed. SQL role/transaction tests passed for owner editing, stale changes, active-only reservation guard and outsider denial; rollback account count confirmed zero. Mobile editor visually inspected with zero horizontal overflow.

**Owner editor deployment:** Worker version `e104114d-7b93-46f1-9a50-99e534c4e240`; homepage SHA-256 `126e41b2ab0ada07f64663397d19a65b6dfff1b31d93c69daf686c1f52142508`, editor asset SHA-256 `e1aa2d5aef0a883069e4ec0520f2349211c0d60d886a4628590fae1d8c263ccf`. Source read-back matches both local assets. Existing 18 assets retained plus placeholder/editor (20 total), three secret bindings and Worker settings preserved. Cron schedules were not modified. Matching [run 40805535118](https://github.com/bam5693/Deckplay-hq/actions/runs/40805535118) PASSED: **55 real API, 65 deployed browser and 320 selected local checks**, plus 11 cleanup and 6 private-photo checks. One intentional duplicate mobile MFA skip is separate. The new signed category test verified all 124 combinations through publication, owner edits, favorites privacy and sold visibility. Both desktop/mobile video-game editor and concurrent-change rejection journeys passed. Durable report was saved successfully. Full browser CI [40805540639](https://github.com/bam5693/Deckplay-hq/actions/runs/40805540639) also passed.

Machine-readable coverage: [category-coverage.json](category-coverage.json). It separates passed, failed, skipped, unverified and not-applicable. Aggregated local rows: 1,239 passed feature/combination cells, 1,240 unverified, 1 N/A; no failed/skipped cells in that local matrix. These are **matrix cells, not independent Playwright test counts or live certification**. Evidence includes eight persona/project executions per combination. Local persistence/upload responses are mocked; the matrix explicitly says so. The separate liveAPI evidence layer now records those signed persistence/favorites/sold results from the green matching run.

Real photo uploads, category-specific messaging/offers/counteroffers/trades/alerts/seller profiles, physical-device usability and category reassignment/photo replacement in the details editor are not certified by these local results. No 100% marketplace coverage or trunk completion is claimed. Personalities never limit the generated category list. Charles, Kyle, Tanner and Jayden are deterministic executed test perspectives; no independent AI inference is claimed in this session.

## Next priorities across the eight trunks

1. Matching editor/API/deployed verification is complete. Expand per-category image-upload and browser transaction journeys next.
2. Expand the runtime category matrix through actual per-category messaging, offers/counters/trades, alerts, uploads and seller profiles, preserving separate live/local evidence. N/A requires a concrete applicability reason.
3. Listings: category/photo editing, structured quantities/lots and photo-draft persistence; avoid rebuilding account drafts or private conversation photos already implemented.
4. Conversations/trades: durable offline recovery, pagination and both-side baskets/item-changing counter revisions remain distinct roadmap branches.
5. Discovery/trust/seller tools: wanted matching breadth, privacy-controlled collection inquiry lifecycle, seller availability and moderation/operator flows.
6. Mobile/security/launch: physical-device/PWA checks, recovery/export/deletion/backup and legal/payment/shipping readiness. Payments and label purchases remain disabled.

## Third coverage batch — authenticated category transactions

Generator `scripts/category-transaction-sql.cjs` reads the same catalog snapshot, which is checked against the runtime DOM by the browser drift guard. Template `tests/integration/category-transactions.sql` exercises **496 complete journeys** (124 combinations × Charles/Kyle/Tanner/Jayden), rotating buyer/seller roles. All passed under the authenticated database role: exact category/type insertion, private contextual messages/read receipts, favorites, price-drop alerts, price offers/counters/acceptance, trade proposals/counters, atomic reservations and duplicate-acceptance rejection. Each successful scenario rolls back its rows in a subtransaction; the outer transaction rolls back both temporary accounts. Follow-up account count is zero. No permissions were weakened, policies/triggers changed, or real inventory touched.

These are database-role/RPC checks, not HTTP or browser certification. They extend the permanent report in a separate `database` evidence layer; they do not convert the unverified LOCAL cells to passed or claim 100% coverage. The retained browse inventory is separate and remains available.

Concurrent staging changes `954640d` / `08c2f90` prevent sending while private photos convert and add a regression. They were preserved and integrated locally; 8 private-photo browser checks passed, including the added mobile/desktop regression. Current concurrent Worker version `892d6c63-8402-47e0-b988-2bfb8483fce7` retains the exact editor/homepage hashes above; the photo asset matches concurrent source SHA-256 `d3e58922670e8de5c59f661ce77e9e70d72813c6dcd908d604e137abeade0fcb`. The 466-test full run predates this concurrent addition; no new full-suite total is fabricated.
