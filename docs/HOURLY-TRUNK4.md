# DeckPlay HQ — hourly Trunk 4 checkpoint

**Lane:** `dev/hourly-autonomous` only; manual G owns shared staging. No shared lease, production, staging deploy/DB tests, or PR merges. Review-only [draft PR #10](https://github.com/bam5693/Deckplay-hq/pull/10) targets staging.

**DONE (code, not V1 acceptance):**
- **T4.1 Favorites:** Account-scoped saved-item offline recovery from staging `ac6b5a9`; pending save/remove no longer gets undone by stale refresh. Implementation `a56f40f`, `962e32a`; targeted spec commits `01fac8c`, `69b3b9a`, `4a80b40`, `0c60594`. Four isolated modeled races passed; Playwright not executed.
- **T4.2 Wanted Board:** Older request/previous-account results cannot overwrite current view: `ed1c054`, tests `10296a8`. **New customer-facing recovery:** A failed Wanted posts request now offers Retry; unavailable/slow profile enrichment no longer hides valid posts or leaves a perpetual spinner. Implementation [`74dc82d`](https://github.com/bam5693/Deckplay-hq/commit/74dc82d0b51617383070ce3fa605c0181a2509d4), two focused browser regression definitions [`df2a202`](https://github.com/bam5693/Deckplay-hq/commit/df2a202967e939caec7864f7da54671730914263). Five inline scripts and test file parsed; two isolated modeled checks passed (profile failure fallback; failed read followed by recovery). **Neither is deployed or browser-accepted.**

**ACCEPTANCE:** T4.1–T4.6 remain unchecked on the hourly branch's canonical scoreboard. T4.3 has a staging candidate (stale-alert storefront recovery) but not full acceptance. Preserve any later accepted staging evidence; do not reopen accepted flows without change impact.

**IN PROGRESS:** T4.1 and T4.2 are reviewable candidate code in PR #10. `index.html` is shared UI; edits are restricted to Favorites and Wanted handlers, so staging owner must inspect conflicts against newer staging changes. The shared staging branch has moved independently; do not reset, rebase, merge, cherry-pick, or force push.

**SINGLE NEXT ACTION:** If a safe, truly local/read-only Playwright runner is available, run ONLY the new cases in `tests/e2e/favorites-recovery.spec.js` and `tests/e2e/wanted-matches.spec.js` on this branch, then correct any observed defect. Otherwise, do NOT retry unavailable execution; implement the next independently useful T4.2 full-catalog matching improvement (non-card precision) with focused tests. Review PR #10 before manual staging integration.

**BLOCKER:** This environment has no authenticated local browser runner. Static parsing and modeled logic are not browser, deployed, signed buyer/seller, or device evidence. No CI dispatched in this session; staging Actions observed running/queued on the manual lane, not modified.
