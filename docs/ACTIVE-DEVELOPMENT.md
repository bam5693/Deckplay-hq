# DeckPlay HQ — manual G staging development checkpoint

**Manual owner:** Trunks 1, 2, 3, 5, 6, 7 and 8 on `test/staging-reporting`. The hourly developer independently owns Trunk 4 on `dev/hourly-autonomous`; do not retake T4. Old GitHub shared lease is retired.

**ACTIVE:** T1.2 — marketplace browsing/filter-state fixes; preserve accepted T3.1/T3.2/T3.4/T3.5 and accepted other checklist items.

**DONE IN CODE:** marketplace filter empty-results, detailed filter clearing, visual selection, and hidden-category filter relevance implemented on staging in commits `d37174a`, `293f3ec`, `a220302`, `77b1a7c` and corresponding focused regression additions. New focused runner commit `d4ac4e7`. General collectible image fallback corrected in commit `dff10f7` (not yet browser tested). No production deployment.

**FOCUSED TEST — PASSED, NO RETEST NEEDED:** [Run 41215280394](https://github.com/bam5693/Deckplay-hq/actions/runs/41215280394) passed **44/44** desktop/mobile Playwright checks in `marketplace-filter-boundaries.spec.js` after the incorrect assertion was corrected in commit `000b1b7`. The runner was scoped to the affected test file and now reports all focused failures (commit `9e9308f`); the previous one-failure/one-interruption result in run 41214219871 is superseded. No real deployed staging buyer/category acceptance or current source asset parity has been verified for this T1.2 batch yet. Do not rerun these 44 tests unless a relevant code change/failure justifies it.

**NEXT ENGINEERING DECISION:** T1.2 local filtering is green. The remaining acceptance need is **one targeted protected private-staging deployment/asset-parity check and synthetic signed buyer category + empty-results check**. Use an existing authorized staging gate with scoped preflight; don't run the old broad transaction suites. If the targeted acceptance path is unavailable, keep T1.2 open and move to the next genuinely unfinished non-T4 V1 behavior. Do not conflate local test success with fully accepted live staging behavior. Trunk 4 remains hourly-owned.

**Shared staging caution:** GitHub Actions may run automatically after `index.html` commits. Inspect `in_progress`/`queued` repository-wide before any conflicting staging deploy or stateful test. No merges, production changes, payment/shipping, destructive DB changes or new spending without separate approval.
