# DeckPlay HQ — Hourly Developer 2 (Trunk 1) checkpoint

**Owner:** Hourly Developer 2, exclusively T1.1–T1.6 on `dev/hourly-trunk1`. Base is `test/staging-reporting`. Manual G integrates; never commit to shared staging or deploy. Updated 2026-10-31.

## DONE / previously accepted — do not rerun
- **T1.1 [x]** — accepted on staging with real seller photo publication, partial-failure cleanup and buyer visibility; scoreboard has [run 41218165464](https://github.com/bam5693/Deckplay-hq/actions/runs/41218165464) and supporting acceptance.
- **T1.2 [x]** — accepted category/filter buyer discovery with [signed staging run 41215822232](https://github.com/bam5693/Deckplay-hq/actions/runs/41215822232).
- No changes or repeated tests to T1.1/T1.2.

## IN PROGRESS — T1.3 exact seller metadata
- **Bug fixed (code, not deployed):** when a seller edits a listing that contains an old `[Card Condition]` / `Set:` / `Variant:` disclosure *and* a newer `[Listing classification]`, editor previously could restore stale Near Mint or stale set/variant, silently overwriting newer Lightly Played / corrected metadata when saving. The latest edited classification now wins; legacy fields remain fallback when newer fields are absent.
- [Code commit 01f67ff](https://github.com/bam5693/Deckplay-hq/commit/01f67ff93c73ca52661bd69207518d0978acc7f3).
- [Regression test commit e9abc2f](https://github.com/bam5693/Deckplay-hq/commit/e9abc2f3a6715da67de99367849b9f89decdff2d), [fixture correction 77be4ac](https://github.com/bam5693/Deckplay-hq/commit/77be4aca5fff447b4cb03d088f24985d7cb04095).
- [Focused CI workflow 9f45748](https://github.com/bam5693/Deckplay-hq/commit/9f45748cdc04aa39e012a7856b1900ba0242265d): one synthetic Playwright case only. [Run 41244008807](https://github.com/bam5693/Deckplay-hq/actions/runs/41244008807) started; result must be inspected before claiming local acceptance.
- Cheap JavaScript parse preflight PASS for changed JS and test, and deterministic metadata-priority example returns Lightly Played, Current Release, Alternate Art. **This is not a browser run or signed staging acceptance.**
- Existing T1.3 buyer exact-condition UI on shared staging branch remains **not yet deployed** per manual G checkpoint. Do not duplicate existing 2/2 local buyer check.

## DONE this session — branch-only fixes and focused evidence
- **T1.3 candidate (NOT accepted):** prior stale metadata restoration fix remains intact; latest source includes `01f67ff` and era round-trip. [Focused run 41244141050](https://github.com/bam5693/Deckplay-hq/actions/runs/41244141050) passed. Signed deployed seller-to-buyer round-trip still needed.
- **T1.4 candidate (NOT accepted):** seller deck edits previously permitted partial/unrecognized decklist lines to bypass declared card-count mismatch checking. [Code commit 3aa3041](https://github.com/bam5693/Deckplay-hq/commit/3aa3041b1b28157d1e341c1b65ff28d6e3534b5e) now blocks uncounted lines and mismatched declared totals **before any listing update**, with actionable correction messages. [Focused regression e46c20a](https://github.com/bam5693/Deckplay-hq/commit/e46c20af28b49ac3d8615c210b61f650132e308f) covers incomplete line, mismatch, and corrected save.
- **Verification PASS:** [run 41248875465](https://github.com/bam5693/Deckplay-hq/actions/runs/41248875465) **4/4 local desktop/mobile-emulated browser cases**, two behaviors × two projects; JS syntax and inline source preflight passed. No signed staging test or deployment claimed.
- **Integration:** [Draft PR #25](https://github.com/bam5693/Deckplay-hq/pull/25) now contains both scoped fixes and is reviewable; manual G owns protected staging integration.

## NEXT
1. Manual G integration lane: review PR #25, coordinate **one** protected staging deployment with exact served asset/private gate parity, then scoped signed seller edit + buyer readback for T1.3 and signed deck edit/buyer quantity readback for T1.4. Neither T1.3 nor T1.4 can be checked [x] on local mocks alone.
2. This worker: if PR awaits integration, investigate earliest **T1.5** real gap and implement a distinct, focused mobile/desktop listing gallery, seller info, Saved/My listing or blocked-seller privacy improvement on this branch, avoiding already accepted T1.1/T1.2 checks. Do not duplicate T5 mobile navigation/physical Android tasks.
3. No production/main, shared staging deploy/DB writes, billing, checkout, real users or unreviewed merge. No repeated broad test suites.
