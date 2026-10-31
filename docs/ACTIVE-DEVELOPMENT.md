# DeckPlay HQ — manual G development checkpoint

**Lane assignment:** Manual G owns Trunks 1, 2, 3, 5, 6, 7, 8 on `test/staging-reporting`; hourly developer alone owns Trunk 4 on `dev/hourly-autonomous`. Retired lease MUST NOT be reused. Production/main untouched unless separately authorized.

## ACCEPTED — do not retest without a material regression
- **T1.1 — SELLER CREATE/EDIT/PAUSE/REMOVE [x]** accepted in scoreboard commit `d011415`. Complementary signed category, seller and photo acceptance:
  - 124 supported catalog/category combinations with real signed seller owner publish/edit/status APIs [run 40805535118](https://github.com/bam5693/Deckplay-hq/actions/runs/40805535118); mocked local photos on that old run explicitly distinguished from real photo evidence.
  - Real signed owner pause/resume and buyer denial [41137871288](https://github.com/bam5693/Deckplay-hq/actions/runs/41137871288); stale seller Mark Sold/Delete and buyer denial plus scoped fixture cleanup [41216804144](https://github.com/bam5693/Deckplay-hq/actions/runs/41216804144).
  - Photo upload partial failure cleanup fix `2de7ad3`; [focused local 4/4 desktop/mobile 41217540732](https://github.com/bam5693/Deckplay-hq/actions/runs/41217540732); [protected staging deploy 41217869999](https://github.com/bam5693/Deckplay-hq/actions/runs/41217869999); [exact asset/auth parity 41217936502](https://github.com/bam5693/Deckplay-hq/actions/runs/41217936502); [real signed photo failure, rollback, retry, published two photos, buyer discovery, cleanup 41217991566](https://github.com/bam5693/Deckplay-hq/actions/runs/41217991566).
  - [Real signed seven representative seller categories' photo publish/add/replace/reorder/remove, category editing and buyer discovery 41218165464](https://github.com/bam5693/Deckplay-hq/actions/runs/41218165464) **PASSED** existing scenario, all fixtures cleaned. Do not rerun.
- **T1.2 — MARKETPLACE FILTER/DISCOVERY [x]** accepted previously: [44/44 local 41215280394](https://github.com/bam5693/Deckplay-hq/actions/runs/41215280394), [private deploy 41215719676](https://github.com/bam5693/Deckplay-hq/actions/runs/41215719676), [exact parity 41215771834](https://github.com/bam5693/Deckplay-hq/actions/runs/41215771834), [6/6 real signed buyer/seller desktop/mobile-emulated category checks 41215822232](https://github.com/bam5693/Deckplay-hq/actions/runs/41215822232).
- Previously accepted T3.1/T3.2/T3.4/T3.5, T7.2/T7.4/T7.6 stay done. Physical Android/PWA is separately T5.

## ACTIVE — T1.3 exact seller-provided metadata survives publication/edit and appears on buyer details
- Earlier private staged buyer field detail coverage for set/number/variant/printing/grading/sports/game platform exists, but T1.3 remains [ ] pending one real signed exact-data round-trip.
- **New T1.3 UI source `8dd6a6c`:** buyer details now display seller's exact card condition (e.g. Near Mint), not merely generic normalized Like new, for both legacy `[Card Condition]` and latest edited `[Listing classification]`. New local browser test [41218545978](https://github.com/bam5693/Deckplay-hq/actions/runs/41218545978) PASSED **2/2 desktop/mobile**, after fixing a test-only incorrectly escaped newline fixture at `3f279b6`. Old failing run 41218461032 superseded. Code has **NOT** been deployed yet, do not claim real staging acceptance or rerun green local checks.

**SINGLE NEXT ACTION:** Check real seller metadata save/edit and signed buyer readback coverage for T1.3 (especially original Near Mint vs updated Lightly Played, TCG set/variant/number/printing/grading, sports). Add one scoped signed seller/buyer staging fixture with exact cleanup only for missing evidence, then do one coordinated private staging deployment, strict served asset parity and targeted signed acceptance. Do not rerun accepted T1.1/T1.2 or broad category suite. Once supported, check T1.3 [x] and advance to T1.4.

**Fallback:** If a trusted staging signed test is blocked, move to another manual-owned unblocked feature, preserve this exact checkpoint; avoid new staging workflows when existing allowlisted trusted runner suffices.

**Safety:** Check Actions only before shared staging deployments/stateful tests, serialize staging transactions, keep secrets/OIDC/Basic Auth/RLS unchanged; no production/main/PR merges/live payments/shipping/billing or new spending without separate approval.

## Manual G handoff — Trunk 5 mobile usability (2026-10-31)
- Trunk 2 scoped automated acceptance closed with caveats; see `tests/reports/2026-10-31-t2-closeout-inventory.md`. Do not rerun its accepted tests without a material change.
- Trunk 1 is owned by hourly Worker 2 on `dev/hourly-trunk1`; its earlier T1.3 historical checkpoint above is informational, **not an instruction for manual G to take Worker 2's work**.
- Manual G moved to **Trunk 5** mobile usability: `3b4575c` sets the Inbox message composer to minimum 16px on small viewports to prevent mobile Safari input focus zoom. **Code only, not yet browser or physical device accepted**.
- NEXT: one inexpensive focused mobile CSS/layout regression for composer size and focus at Pixel viewport, then inspect mobile keyboard/Android Back behavior. If browser test is unavailable, do cheap source/static preflight and continue independent mobile work, without claiming device acceptance.
- No production/main merge, staging deployment or customer data changes from this T5 batch.

### T5 safe continuation — mobile editable fields
- T5 focus-zoom scope expanded from Inbox to editable login/search/listing form inputs, selects and textareas via `index.html` commit `d942ea6`, using `font-size:max(16px,1em)` at <=700px to preserve larger accessibility text settings. Excludes non-editable buttons and file/range controls.
- `tests/security/t5-mobile-composer.test.cjs` gained the scoped form rule assertions in `a0a214d`. [Cheap CI run 41239724763](https://github.com/bam5693/Deckplay-hq/actions/runs/41239724763) **passed 9/9 Node checks**, including current T2 privacy regressions and five inline scripts. This is source-level validation, not a mobile browser/device test or staging deployment.
- Mobile browser focus/composer/Android Back verification remains tracked in [issue #24](https://github.com/bam5693/Deckplay-hq/issues/24); the rejected edit to the signed messaging spec was not resubmitted or bypassed.
- Continue Trunk 5 without changing production or duplicating Trunk 1/4 worker branches.

### T5 PWA keyboard-safe update prompt — verified desktop/mobile browser
- `pwa-update-notice.js` commit `c70ce5a` defers a waiting PWA update notification when a mobile editable field has focus, restoring it on blur or orientation resize. The banner remains pending; it does **not** auto-reload or discard unsaved work.
- Targeted Playwright checks updated at `5705746`: mobile prompt hidden during typing and restored afterward, desktop remains visible, offline and declined refresh preserve draft. Existing tests now deliberately blur the active mobile input before clicking a reappeared prompt.
- **Passed final focused run [41240110417](https://github.com/bam5693/Deckplay-hq/actions/runs/41240110417): 10/10 local desktop/mobile-emulated browser tests, inline syntax and PWA source checks.** Earlier run 41240029848 failed an obsolete test click while the new banner was intentionally deferred; superseded by the passing run. No private staging deploy, Storage, real accounts, or production change.
- The separate signed Inbox composer/Android Back physical-device acceptance remains tracked in [issue #24](https://github.com/bam5693/Deckplay-hq/issues/24). Do not bypass the earlier blocked signed messaging spec edit. Next T5 item: targeted mobile navigation/keyboard verification through an authorized test path, then real Android/PWA smoke on an actual phone before release.

### T5 PWA mobile touch targets — verified
- Commit `6743633` sets 44px minimum height for PWA update Refresh and Later controls. Matching desktop/mobile-emulated Playwright assertion added at `bf1ff62` for touch width and height.
- [Focused run 41240284015](https://github.com/bam5693/Deckplay-hq/actions/runs/41240284015) **PASS 12/12**, including prior mobile keyboard deferral and offline draft safety, exact changed-source preflight. No production or staging deploy.
- Remaining signed mobile Inbox/physical Android Back and keyboard testing is tracked in [issue #24](https://github.com/bam5693/Deckplay-hq/issues/24); old authorized Inbox Back regression exists in `tests/e2e/inbox-recovery.spec.js`. Do not bypass prior blocked test edit. Continue mobile-specific work that has separate supported acceptance.
