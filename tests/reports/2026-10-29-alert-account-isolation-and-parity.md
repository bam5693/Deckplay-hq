# DeckPlay HQ — 2026-10-29 staging account isolation and deployment parity

Scope: **only** `test/staging-reporting`, draft PR #2, isolated Supabase `prrrzeelltmyugssqnzk`, private Worker `deckplay-hq-staging`. Production/main, payments, shipping, billing and real users unchanged.

## Verified current checkpoint

- Source head before this report: `2cb27b1749efa6c0cc20add5034698850dc609be`. The Worker version `d630f09a-a0c9-467f-a081-e69e00c29f77` serves **100%** of private staging traffic.
- Full homepage readback matched the deployed source; compared against GitHub `index.html`, there are exactly **seven expected staging-only differences**: noindex, staging warning banner, staging Supabase URL/publishable key, test CAPTCHA, and three authentication/password redirect replacements. **All 23 assets** were retained, all 22 non-homepage assets unchanged, private Basic Auth present, and three secret bindings preserved.
- Staging Supabase project reported `ACTIVE_HEALTHY`.
- Previous source/deployment mismatch from failed run [40873499393](https://github.com/bam5693/Deckplay-hq/actions/runs/40873499393) is resolved for the current homepage, but **no new matching authenticated browser run has executed**. That run used older commit `f823c1f`; do not count it as current certification.

## Customer-facing improvements

1. **Account-switch privacy:** `6e6c529ab27cda7ad1d327f56cd8c757ef85e8a2` clears old collector unread-message, trade and activity badges immediately; invalidates pending notification requests; closes the old activity sheet and resets Inbox activity view on account changes. Same-account token refresh retains UI state. Regression: `cebb66997126889ed14aac06f80f6a0f84a8c094`.
2. **Safe activity deep links:** `2acbc1d6a653556f5cee6856d0b132c424ff884c` prevents delayed mark-read responses from navigating to an alert belonging to the previous account, including A→B→A switching. Both the activity sheet and legacy Inbox alert panel guard navigation. Regressions: `6bd9eca334ef3d70e23071875ab57655c6d5e633`, `63e787a8a77e0378d676abcc4c9ca8ad1fc651d9`.
3. The current private deployment also includes earlier sports-card year/player discovery filters and hiding the trading-card-game filter outside Trading Cards. Those features were already committed before this run; they were brought into deployed parity rather than newly authored here.

## Checks and unresolved verification

- Five inline homepage JavaScript scripts parsed; Inbox regression spec parsed.
- Focused synchronous DOM/account-switch simulation passed (five badges hidden, notification request versions invalidated, sheet closed, Inbox reset).
- Six focused asynchronous alert navigation simulations passed: two handlers × same owner / switched owner / switched away and back. **These are logic simulations, not authenticated browser tests.**
- Corrected two previously failing test fixtures in `2cb27b1749efa6c0cc20add5034698850dc609be`: the Alerts sheet test no longer clicks a deliberately hidden Inbox tab; the synthetic unblocked profile returns a null block record. Tests have **not** yet been executed.
- Existing failed workflow [40873499393](https://github.com/bam5693/Deckplay-hq/actions/runs/40873499393) ran before these corrections; it had 362 passing local checks and 16 local failures, including stale fixture assumptions and missing deployed parity. Do not assume all remaining failures are fixed without a matching run.
- PR #2 remains **draft, open and conflicted** with main; no merge/rebase/force push attempted.

## Next priority

Run one matching authenticated private staging workflow when safe (avoid duplicate Actions runs), verify mobile/desktop alert and Inbox regressions, inspect any genuine failures, then continue transaction locking/recovery and resolve staging/main conflicts with a lease-checked, non-destructive merge into staging only. Preserve all 124 canonical category/type routes and the Charles/Kyle/Tanner/Jayden deterministic synthetic perspectives.
