# DeckPlay HQ — Hourly Trunk 4 continuity
**Owner:** dev/hourly-autonomous only; draft PR #10 into manual-owned staging. No shared staging/main/production/DB writes, merges or deployments. Retired lease unused.

## DONE — reviewable code (NOT acceptance)
- **T4.1 Favorites:** Account/offline saved-listing recovery inherited from staging `ac6b5a9`; pending save/remove race fix `a56f40f`, `962e32a` with four modeled passes. Browser + deployed acceptance missing.
- **T4.2 Wanted:** Account/stale-load isolation `ed1c054`, retry/profile fallback `74dc82d`, precise cross-category matching `e53a2fb`, seller-edited classification precedence `b27f92f`; seven modeled non-card fixtures and syntax checks passed. Browser + deployed acceptance missing.
- **T4.3 Alerts:** Prior private staging stale-alert recovery `f2d1d7f`, protected run 41209070078. Still candidate: signed alert destination and privacy/event matrix missing.
- **T4.4 Collection privacy:** `e030bcb` now refuses to render a blocked collector's profile, storefront or external collection links when `user_blocks` confirms a block; on block-lookup failure it shows a retry instead of treating the collector as unblocked. `5b7d713` adds two focused browser regressions in `tests/e2e/collection-sharing.spec.js`. Five inline index scripts and the test file parsed; three extracted real-code privacy-boundary logic checks (blocked, lookup error, clear) passed. **Playwright/browser and staging tests NOT run.**

## IN PROGRESS
**T4.4 remains OPEN/CANDIDATE, not accepted.** The hourly scoreboard T4.1–T4.6 remains unchecked. Preserve all historical accepted evidence in staging. PR #10 includes T4.1/T4.2/T4.4 for manual review. Shared `index.html` must be reconciled against independently advanced staging HEAD; never overwrite/rebase/merge automatically. CI read-only PR jobs auto-triggered by code commits; no CI dispatch performed.

## NEXT
1. When a focused safe browser runner is available, run only new T4.4 blocked/error profile tests and affected T4.1/T4.2 cases, then request reviewed integration; no stateful staging tests from this branch.
2. If browser runner unavailable, build the next independent unfinished T4.5 collection consent feature on hourly branch, preserving existing server-side opt-in rules.
**Blockers:** no verified local Playwright execution or signed staging acceptance; manual staging owner must review PR #10. No V1 T4 item was newly accepted this run.
