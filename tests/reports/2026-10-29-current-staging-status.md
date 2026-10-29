# DeckPlay HQ — current staging status (2026-10-29, 14:36 Central)

**Scope:** `test/staging-reporting`, draft PR #2, isolated Supabase `prrrzeelltmyugssqnzk`, private Worker `deckplay-hq-staging`. No production/main, billing, payments, customer data or PR merge changes. Supabase staging is `ACTIVE_HEALTHY`.

## Latest source changes — focused local verification PASSED; staging deployment PENDING

- **Reload-safe text drafts** `7402b26e86935f93f3d967034a533edafaafce60`: up to 30 conversation drafts, maximum 2,000 characters each, survive refresh in the same browser tab. Session storage is scoped to the authenticated collector, deleted on account switch/sign-out and after successful send; photos/credentials are never persisted. A failed send preserves the draft.
- **Uncertain text-send recovery** `fb3bc8ba6df7368f0ea35a024eba9eb69cc25778`: only SHA-256 payload fingerprints and UUID retry references survive tab refresh for up to 24h (20 entries maximum). On retry, the client checks the exact server-side sender, recipient, listing, body and attachments **before** another insert. Successful delivery clears the reference; account changes clear it. Private photo upload drafts remain in memory and are deliberately excluded from reload recovery.
- **Verification:** [run 40941360384](https://github.com/bam5693/Deckplay-hq/actions/runs/40941360384) **8/8** desktop/mobile draft-reload cases passed; [run 40941540506](https://github.com/bam5693/Deckplay-hq/actions/runs/40941540506) **8/8** desktop/mobile text-delivery/retry cases passed. Source inline JavaScript and affected test syntax parsed. The initial [run 40941156850](https://github.com/bam5693/Deckplay-hq/actions/runs/40941156850) failed because a new test tried clicking a contact hidden by the intended single-thread layout; the test was corrected to use visible Back navigation, then passed. No broad suite or deployed acceptance was rerun. These two groups are separate focused runs, not full certification.
- **Current branch HEAD:** `5a032503c2a4dd9d6ef8279ee865798fbde89a97`. Draft PR #2 remains open, unmerged and conflicted with main. Do not merge.

## Exact deployment gap and cost boundary

- **Currently deployed private staging:** Worker version `a6b99083-db9e-42c8-a674-59cfbc1ca991` (100%), annotated source `1a8166b`, deployed 2026-10-29 17:22:46 UTC. The new Inbox source commits above are **not yet deployed**; no live-browser acceptance is claimed for them.
- Existing `deploy-staging.yml` is manual-only and uses environment deployment credentials not verified in this run. No local authenticated repository/build artifact was available outside CI for a safe exact-source 23-asset/secret-preserving upload. Do **not** upload an ad hoc Worker or change private authentication to force deployment. Next safe step: use the existing isolated staging build/deploy gate when credentials and exact source/binding parity can be verified; then run only affected synthetic signed-in desktop/mobile cases.
- Focused workflows completed in approximately 23 and 25 seconds elapsed respectively. GitHub timing returned `UBUNTU.total_ms=0` for each, **not proof that current or future usage is free**. No billing change was made.

## Next customer priorities

1. Deploy the exact verified source safely to isolated staging, preserve all 23 assets and secret bindings, and verify deployed buyer/seller message draft and uncertain-delivery journeys.
2. Complete older price/counteroffer history and full-page trade-proposal retry, preserving privacy and inventory locking; avoid redundant broad tests.
3. Resume category-wide collection, listing and mobile usability gaps; use Charles/Kyle/Tanner/Jayden as synthetic test personas, not unverified independent agents.

---

## Historical 10:30 Central checkpoint (superseded by latest status above)


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
