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

## NEXT
1. Inspect targeted run 41244008807; if red, fix actual issue and rerun only changed case once.
2. Prepare reviewable draft PR to `test/staging-reporting` (do not merge). Manual G to coordinate one private staging deploy, asset parity and real signed seller metadata edit + buyer readback before accepting **T1.3**.
3. Advance to earliest incomplete **T1.4** only after T1.3 code and focused test are ready, or if signed staging acceptance is blocked by integration lane. Preserve accepted T1.1/T1.2 evidence.
4. No public production, billing, checkout, real users, shared staging database writes or unreviewed merges.
