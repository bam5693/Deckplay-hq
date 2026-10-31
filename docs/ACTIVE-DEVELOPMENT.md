# DeckPlay HQ — active staging development checkpoint

**Active V1 slice:** T4.1 — Favorites/saved-item account isolation and offline refresh recovery.
**Why:** A failed saved-listings refresh previously erased locally confirmed favorites; an account change could leave the former account's saved state in memory until an asynchronous block-list check finished.

**DONE:** Commit `ac6b5a98908a96d615a285bdfef463811da3e5ea` changes `index.html` and adds two targeted desktop/mobile Playwright regressions in `tests/e2e/favorites-recovery.spec.js`. Same-account failed refresh preserves saved items, a successful retry reconciles server state, and account switches immediately invalidate previous saves and stale responses. JavaScript syntax parsed for all inline scripts and the test file. Four isolated logic checks against the **actual committed implementation** passed (offline preservation, successful retry, immediate switch clearing, stale response denial). No DB/RLS/auth/production changes. Existing ACCEPTED T3.1/T3.2/T3.4/T3.5 remain DONE; no redundant retests.

**INCOMPLETE:** The new Playwright tests have **not** been executed in a real browser; no T4.1-specific protected staging deploy/asset-parity or authenticated buyer save/reload test. T4.1 remains unchecked. Previous protected run `41209070078` covers T4.3, **not** this T4.1 change. The GitHub connector lacks trusted workflow-dispatch; do not use broad CI suites just to inflate test counts.

**SINGLE NEXT ACTION:** Run `npx playwright test --config=playwright.local.config.js favorites-recovery.spec.js --retries=0` in an existing trusted isolated runner. If green, use the existing protected private staging gate once for exact-source deployment and one synthetic signed buyer save/reload/account-switch acceptance; retain strict privacy and cleanup. Fix any focused failures before deployment.

**Fallback if that runner remains unavailable:** Finish a separate T4.1 buyer-visible saved-tab unavailable/hidden-state recovery without disclosing paused/blocked listing details. No release candidate until appropriately verified.

**Current code checkpoint:** `ac6b5a98908a96d615a285bdfef463811da3e5ea` on `test/staging-reporting`. Resume from this exact incomplete step; check lease, CI and HEAD before any action.
