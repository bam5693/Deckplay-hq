# DeckPlay HQ — hourly Trunk 4 checkpoint
**Lane:** `dev/hourly-autonomous` only. Manual G owns shared staging. No lease, staging deployment, DB writes, production or PR merges.

**DONE this session (code committed; NOT V1 accepted):**
- **T4.1 Favorites:** Saved-list refresh now overlays account-scoped optimistic save/remove choices; finishing a write invalidates any stale in-flight refresh. Builds on existing offline/account recovery `ac6b5a9`. Code `a56f40f`, `962e32a`; targeted browser regression definitions `01fac8c`, `69b3b9a`, `4a80b40`, `0c60594`. Prevents a background refresh from flipping a collector's heart back while their save/removal is in progress or immediately after success.
- **T4.2 Wanted:** Old-account or older request results cannot overwrite a newer Wanted Board load; loading is explicit. Code `ed1c054`; two focused browser regression definitions `10296a8`.

**VERIFIED (local, not staging acceptance):** JavaScript syntax parsed for `favorite-actions.js`, all five inline `index.html` scripts and both focused Playwright spec files. Four isolated V8 modeled saved-item races PASSED (pending/completed save and remove vs stale refresh). Two isolated modeled Wanted read races PASSED (account switch and out-of-order refresh). **Playwright itself has NOT run**, no CI dispatched, no private staging deploy, no signed buyer/seller or device proof. Existing accepted evidence elsewhere is unchanged.

**IN PROGRESS:** T4.1 remains [ ] on canonical scoreboard; T4.2 also [ ]. T4.3 existing staging candidate, T4.4–T4.6 unfinished. No T4 item newly accepted. `index.html` is a necessary shared UI file touched only in T4.1 saved-list and T4.2 Wanted handlers; integration reviewer must inspect current manual-lane changes.

**SINGLE NEXT ACTION:** On this branch, run ONLY the new focused cases in `tests/e2e/favorites-recovery.spec.js` and `tests/e2e/wanted-matches.spec.js` using a safe local/readonly runner (not shared staging), fix any actual failure, then request review of [draft PR #10](https://github.com/bam5693/Deckplay-hq/pull/10) against `test/staging-reporting`. Do not re-run accepted T3 or unrelated T4 flows. After reviewed integration, manual staging owner controls deploy and signed acceptance.

**BLOCKER:** No authenticated local repository/Playwright runner is available in this execution environment; source syntax + modeled checks are not equivalent to browser or deployed proof. Own branch was 36 commits behind shared staging at review, no rebase/reset/force push.

**FALLBACK:** If browser execution remains unavailable, implement a separately scoped, evidence-based T4.2 non-card Wanted match improvement on this branch; never retry the same blocked runner blindly.
