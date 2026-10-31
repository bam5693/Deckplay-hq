# DeckPlay HQ — manual G staging checkpoint

**Manual lane:** Trunks 1, 2, 3, 5, 6, 7 and 8 on `test/staging-reporting`. Hourly developer exclusively owns Trunk 4 on `dev/hourly-autonomous`. Old shared lease retired. No production modifications without explicit approval.

**ACCEPTED — T1.2:** [44/44 focused local checks 41215280394](https://github.com/bam5693/Deckplay-hq/actions/runs/41215280394), [private deploy 41215719676](https://github.com/bam5693/Deckplay-hq/actions/runs/41215719676), [asset/auth parity 41215771834](https://github.com/bam5693/Deckplay-hq/actions/runs/41215771834), [6/6 signed real staging buyer/seller desktop/mobile-emulated 41215822232](https://github.com/bam5693/Deckplay-hq/actions/runs/41215822232). Checklist marked [x]. Do not repeat.

**ACTIVE — T1.1 seller lifecycle. NEW ACCEPTED SUBFLOW — marketplace Mark Sold/Delete:**
- Seller card false-success/stale-account defect fixed at `5ecd9e3`. Focused local desktop/mobile check [41216218260](https://github.com/bam5693/Deckplay-hq/actions/runs/41216218260) **4/4 PASS**.
- Deployed to private staging in [41216703600](https://github.com/bam5693/Deckplay-hq/actions/runs/41216703600); exact served asset parity/auth gate [41216758718](https://github.com/bam5693/Deckplay-hq/actions/runs/41216758718) **PASS**.
- Added tightly scoped signed synthetic fixture test `tests/e2e/seller-grid-live.spec.js` (commit `358b60a`), staging config `d17b531`, and trusted private-staging runner `193d464`. [Live run 41216804144](https://github.com/bam5693/Deckplay-hq/actions/runs/41216804144) **1/1 PASS** with real signed seller+buyer: video-game stale sell rejected after pause; resume then sale successful; collectible deletion successful; buyer catalog excludes both; independent guarded cleanup reports zero fixture listings. Older broad staging suites were skipped. Do not rerun this accepted subflow without a relevant change.
- T1.1 still **[ ]**, because full category/photo creation/edit persistence, photo-upload failure/retry, and any outstanding real lifecycle verification remain distinct. Earlier accepted pause/resume [run 41137871288](https://github.com/bam5693/Deckplay-hq/actions/runs/41137871288) remains valid and must NOT be rebuilt.

**SINGLE NEXT ACTION:** Find whether `tests/e2e/listing-editor-live.spec.js` real photo/category create-edit tests have a previous *successful actual staging run*, and identify exact unverified category/photo-upload-failure paths. If prior acceptance exists, preserve it; otherwise run only the missing focused paths with staging-only disposable identities, guaranteed scoped cleanup and existing trusted CI gate. Implement a concrete code fix only for observed failure. When T1.1 evidence sufficient, check it [x] and move to next incomplete ID.

**Fallback:** If signed staging fixture execution is unavailable, work on another independent unmet manual-owned V1 requirement; record exact blocker, no loops.

**Boundaries:** Recheck repository-wide Actions before concurrent deployment or staging data writes; preserve security/auth/isolated Worker, don't touch hourly Trunk 4, main, production, customer data, billing, real payments/shipping or merges.
