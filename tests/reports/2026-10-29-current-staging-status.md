# DeckPlay HQ — staging current status (2026-10-29, 10:30 Central)

Scope: `test/staging-reporting`, draft PR #2, isolated Supabase `prrrzeelltmyugssqnzk`, private Worker `deckplay-hq-staging`. Production, payments, billing and real customer data untouched.

## Verified this session
- **Photo test failure classified: TEST ENVIRONMENT QUOTA, not a proven photo-upload application defect.** Focused run [40901387054](https://github.com/bam5693/Deckplay-hq/actions/runs/40901387054) authenticated successfully, passed 6 photo-security tests and 8 local browser cases, then failed two deployed browser cases with `Could not send: Photo upload limit reached. Try again tomorrow`.
- Actual quota source is `deckplay_chat.upload_events`, **not** `public.message_photo_attachments`. At inspection, buyer had **30** events in the rolling 24h window (oldest `2026-10-28 21:39:30+00`), seller **0**. The earlier claim that both had zero was based on counting the wrong table; do not repeat it.
- **OIDC fix:** first focused workflow [40900944068](https://github.com/bam5693/Deckplay-hq/actions/runs/40900944068) failed authentication (`Untrusted claim workflow_ref`). Corrected by dispatching the existing exact-allowlisted `private-staging.yml` in `photo_only` mode, **without expanding identity trust**. Commits `8581ded` and `7323123`. Trusted runner identity succeeded in run 40901387054.
- **Photo test sender and verified recovery:** `tests/e2e/private-message-photos-live.spec.js` defaults to synthetic SELLER (available quota), accepts `DECKPLAY_PHOTO_TEST_SENDER=BUYER` override; commit `3626c81`. Focused trusted run [40901799639](https://github.com/bam5693/Deckplay-hq/actions/runs/40901799639) **PASSED**: 11 fixture-cleanup security, 6 private-photo security, 2 deployed staging parity, 8 local photo browser, and 2 real authenticated deployed photo journeys (desktop/mobile). These are separate groups; do not treat them as a full marketplace suite.
- **Customer-facing profile fix:** `ensureProfile` previously used unconditional `upsert` with generated username on every listing post, overwriting chosen collector names. Changed to `upsert(...,{onConflict:'id',ignoreDuplicates:true})` to create missing profiles without overwriting existing identity; commit `e9adf6b`, targeted regression `1711d94`. Targeted JavaScript simulation **PASS**; browser regression **NOT RUN**.
- **Deployed** this one-string fix to private staging Worker version `c3d122e7-3e70-452f-8249-402b391a3127` at 100% staging traffic. Readback verified updated source, 23 assets, and all three existing secret binding names retained. No production deployment.

## Open items and next safe action
1. Private photo upload is verified on staging desktop and mobile at run 40901799639. Do not rerun unchanged checks; quota events remain rate-limited.
2. Run focused profile browser regression against matching staging source before marking profile fix fully VERIFIED. Current targeted JS simulation passed, and deployed homepage parity passed, but profile-specific Playwright has not run.
3. Draft PR #2 currently reports mergeable=false; do not merge or overwrite concurrent work.
4. The rolling upload quota intentionally counts attempts, even when test attachments are cleaned up. Avoid repeated full suites and do not delete quota events or weaken the limit. After 30 seller events, wait for natural expiry or arrange dedicated synthetic test identities under approved security policy.

This report supersedes historical CI counts for today's diagnosis; historical passing counts remain historical and cannot certify current head.
