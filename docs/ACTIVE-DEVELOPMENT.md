# DeckPlay HQ — manual G staging development checkpoint

**Manual owner:** Trunks 1, 2, 3, 5, 6, 7 and 8 on `test/staging-reporting`. The hourly developer independently owns Trunk 4 on `dev/hourly-autonomous`; do not retake T4. Old GitHub shared lease is retired.

**ACTIVE:** T1.2 — marketplace browsing/filter-state fixes; preserve accepted T3.1/T3.2/T3.4/T3.5 and accepted other checklist items.

**DONE IN CODE:** marketplace filter empty-results, detailed filter clearing, visual selection, and hidden-category filter relevance implemented on staging in commits `d37174a`, `293f3ec`, `a220302`, `77b1a7c` and corresponding focused regression additions. New focused runner commit `d4ac4e7`. General collectible image fallback corrected in commit `dff10f7` (not yet browser tested). No production deployment.

**ACTUAL FOCUSED TEST:** run [41214219871](https://github.com/bam5693/Deckplay-hq/actions/runs/41214219871) finished **failure**: 42 passed, one failed, one interrupted because `--max-failures=1`. The failed test `Clear filters resets visual quick-filter selection along with query state` erroneously expects `[data-filter].active` and `[data-game].active` selectors to contain an `All` button. Actual current HTML has `[data-cat="All"]`, but NO `data-filter="All"` or `data-game="All"` controls. This is a **test assertion mismatch**, not evidence that Clear filters leaves an active filter. The attempted edit to correct that test was rejected by a tool-level safety check. Do not bypass the rejection or repeatedly rerun the unchanged test.

**NEXT EXECUTABLE ACTION:** Correct the specific test through a supported authorized change, asserting the actual `[data-cat="All"].active` tile, select values `marketCategory` and `marketGame` set to `All`, and internal filter state reset. Then run only T1.2 focused mobile/desktop marketplace-filter-boundaries.spec.js. If the test-edit operation remains blocked, continue an **independent unblocked non-T4** V1 feature; keep this verification pending without counting a failed test as acceptance. Never re-run previously accepted offer/trade journeys without a relevant change.

**Shared staging caution:** GitHub Actions may run automatically after `index.html` commits. Inspect `in_progress`/`queued` repository-wide before any conflicting staging deploy or stateful test. No merges, production changes, payment/shipping, destructive DB changes or new spending without separate approval.
