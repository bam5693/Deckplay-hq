# DeckPlay HQ — current staging status (2026-10-29)

## Autonomous development — 2026-10-29 16:36 Central (latest verified checkpoint)

**Current private staging:** Worker `6a63ae6f-221c-461c-b726-3e174f56112b`, 100% staging traffic, deployed 21:33:38 UTC. Source release request `760c3e2` contains the changes below. GitHub draft PR #2 remains open and unmerged; production/main, real users, payments, billing and production databases were untouched.

**Two shipped customer-facing batches**
- **Per-conversation negotiation history** `776b5dc`: Inbox now offers on-demand 50-row pages of price-offer events and trade counteroffers, scoped to the two participants. Each type has an independent `(created_at,id)` cursor for timestamp ties, retry/error state, duplicate elimination, preserved drafts/scroll and account-switch cache cleanup. Existing 700-event global preview remains a bounded initial view. Local desktop/mobile acceptance: **4/4** in [40957734216](https://github.com/bam5693/Deckplay-hq/actions/runs/40957734216).
- **Trade and price-offer modal → exact Inbox conversation** `6bfff9c`, `af90358`, `d607bd6`: trade cards now expose an Open conversation action; both price and trade modal links use atomic Android/PWA history-state navigation instead of racing against `closeModal`'s asynchronous `history.back()`. Blocked collectors can view historical trades but cannot message/respond. Desktop/mobile navigation and Back tests: **6/6** in [40958614161](https://github.com/bam5693/Deckplay-hq/actions/runs/40958614161). Initial focused runs [40957948851](https://github.com/bam5693/Deckplay-hq/actions/runs/40957948851) and [40958107928](https://github.com/bam5693/Deckplay-hq/actions/runs/40958107928) failed because the modal close restored Home after Inbox navigation; navigation-stack trace in [40958280840](https://github.com/bam5693/Deckplay-hq/actions/runs/40958280840) identified `restore(home)` from `popstate`. This was an application navigation bug, not a security or credentials failure. Fixed at `af90358` and verified; no blind further retries.

**Verification and deployment boundaries**
- Gated staging release [40958724184](https://github.com/bam5693/Deckplay-hq/actions/runs/40958724184) passed **14/14** focused local desktop/mobile cases (4 negotiation + 6 navigation + 4 price-withdrawal) and **16/16** Node security/logic checks. It deployed the exact staging Worker, but immediate asset verification failed at `index.html`; therefore that run is correctly marked **FAILED**, not green.
- After the Worker propagated, **read-only** homepage SHA-256 parity passed in [40958971503](https://github.com/bam5693/Deckplay-hq/actions/runs/40958971503); all **23/23** served assets matched and anonymous staging was denied in [40959059967](https://github.com/bam5693/Deckplay-hq/actions/runs/40959059967). This supports a transient deployment propagation mismatch, not a proven application build defect.
- Trusted read-only deployed buyer/seller sessions passed **4/4** on desktop/mobile in [40959129290](https://github.com/bam5693/Deckplay-hq/actions/runs/40959129290). Cloudflare confirms all three existing secret bindings preserved. No new signed real-database negotiation write was executed; history pagination is verified by mocked local browser and deployed source parity, **not** signed-in history interaction against seeded staging rows. Physical Android/PWA device Back remains unverified.
- GitHub workflow timings across the eleven relevant verification/deployment runs totaled about **305 seconds of elapsed job duration**; the timing API reported `UBUNTU.billable.total_ms=0` for each. This is not proof of account-wide free usage. No paid plan, API, schema, data, or billing change.

**Next highest-value unblocked work:** targeted signed synthetic read/write acceptance for historical offer and trade events (with rollback and quota awareness), then physical-device Back and operator beta readiness. Do not rerun unchanged broad/photo suites or claim these two UI batches certify every category or a public beta. Four personas remain deterministic test roles, not independent agents.

---


## Autonomous beta development — 2026-10-29 16:06 Central (current checkpoint)

This section supersedes the earlier pending deployment/authentication labels. Application source `88fc403671509d8d59ebc500655b419a7633e1a6` is deployed to private staging. No trunk is complete and this is not permission to invite real users yet.

### Implemented
- `c93aa2d`: Inbox marketplace search is actually visible (the previous handler-only fix could not be reached because CSS hid it), opens Marketplace results and preserves the active message draft. Trade-proposal delivery references survive a same-tab full reload for up to 24h, bounded to 20 SHA-256 fingerprints/UUIDs; no trade notes, item IDs, credentials or photos are stored in those references. Exact original terms are checked before any repeat insert; changed terms get a different identity. Account switch/sign-out removes the references.
- `9afbfae`: My listings and Saved items leave Profile correctly, clear stale category/price filters, and Back to all listings clears both scopes. Profile Saved items excludes blocked sellers across all seven database categories and labels prices in USD.
- `88fc403`: Pending outgoing price offers can be withdrawn from their Inbox conversation using the existing respond_price_offer RPC, shared decision lock and account/block protections. Duplicate taps submit once; failure restores the action and preserves the message draft. Price-offer and Inbox offer amounts display the USD symbol.

### Executed evidence (separate groups; overlapping suites are not additive)
| Source / run | Local simulated browser | Node security/logic | Signed deployed browser |
|---|---:|---:|---:|
| c93aa2d / [40953830524](https://github.com/bam5693/Deckplay-hq/actions/runs/40953830524) | 164 desktop/mobile passed: marketplace boundaries, trade picker/reload and Inbox recovery | 16 passed (13 trade delivery + 3 browser config) | 4 buyer/seller desktop/mobile passed |
| 9afbfae / [40954209995](https://github.com/bam5693/Deckplay-hq/actions/runs/40954209995) | 6 focused desktop/mobile passed: search, scope shortcuts, seven-category blocked Saved profile | 16 same checks passed | 4 passed; includes visible Inbox search, Saved navigation and reset |
| 88fc403 / [40954521662](https://github.com/bam5693/Deckplay-hq/actions/runs/40954521662) | 4 focused withdrawal desktop/mobile passed | 16 same checks passed | 4 read-only buyer/seller desktop/mobile passed |

All three new runs passed on their first attempt. Earlier run 40951357444 failed 2/32 cases on the hidden Inbox search input; that defect was corrected, not bypassed. Inline syntax, changed spec parsing, staging builds and whitespace checks passed locally in the Work container. Browser cases above executed on GitHub runners; no local-container browser execution is claimed. Existing historical 28-category transaction/496 journey evidence was not rerun. No new real database trade/withdrawal transaction was performed; the new write/reload/failure journeys are mocked browser and extracted actual-function tests. No private photo uploads or quota events were consumed.

### Deployment and safety
- Final Worker: `ddcc7377-98c1-4483-806f-32ddee686dd9`, 100% staging traffic; deployed 2026-10-29 21:04:25 UTC.
- Each release verified byte-for-byte equality of all 23 **served assets** with its built staging directory. This is asset parity, not a claim that Wrangler's transformed Worker module equals the unbundled source text.
- Anonymous HEAD returned 401 with a Basic challenge. Existing three secret bindings and compatibility date 2026-10-26 retained. No credential values were printed.
- Supabase prrrzeelltmyugssqnzk read-only status: ACTIVE_HEALTHY. No SQL, schema, real customer data, production, payment, billing or PR merge changes.
- Focused release runs now use tests/reports/staging-beta-request.txt in the already trusted private-staging.yml. Each request performs cheap checks before private deploy, asset parity, then read-only signed acceptance. Ordinary feature commits no longer start the broad transaction/photo suite. Full suites remain available through manual workflow_dispatch. Keep existing OIDC workflow trust unchanged. Before requesting the next release, select only the relevant specs in the focused preflight command.
- Run durations: 130s, 56s, 56s. GitHub timing reported UBUNTU billable.total_ms=0 for each; this is not an account-wide free-usage guarantee. No paid infrastructure, plan changes or additional dependencies.

### Eight trunks and beta boundary
| Trunk | This session / remaining |
|---|---|
| 1 Listings | Seller inventory shortcuts and USD display improved. Existing CRUD/drafts/quantities retained. |
| 2 Inbox | Search access and in-thread withdrawal improved; existing text/photo/history work retained. Older negotiation event history still bounded globally. |
| 3 Transactions | Reload-safe trade retry and outgoing-offer withdrawal; new real signed write acceptance remains additional coverage. |
| 4 Discovery | Saved scope reset and blocked-seller privacy fixed across all seven categories. |
| 5 Mobile | Every new local case runs mobile and desktop; deployed accounts both passed. Physical Android/PWA keyboard/Back still unverified. |
| 6 Security | Account-switch retry cleanup and blocked Saved visibility covered; private gate and credentials preserved. Recovery/export/backup/legal launch gates remain. |
| 7 Growth | No new growth features; preserve roadmap for later. |
| 8 Operations | Focused staged release/parity checks added; operator onboarding, support/disputes and rollback rehearsal still require work. |

Core staging listing/discovery, Inbox and negotiation journeys are beta candidates with the evidence above. A controlled real-user beta is still gated by operational/security readiness and a real-device rehearsal; a successful deployment is not full marketplace certification. No honest trunk-completion percentage can be inferred from test counts.

Planning estimate: several more focused development/QA sessions plus operator and physical-device rehearsal for a small beta; low confidence until those gates are exercised. The complete eight-trunk roadmap is substantially larger.

**Exact next development task:** Add on-demand, per-conversation price-offer event and trade-counteroffer history with deterministic (created_at,id) paging, retry, account isolation and clear loading/error states. The current global 700-event windows can omit old negotiation events even when the conversation itself is recovered. Do not rebuild completed message pagination or repeat unchanged photo/full transaction suites. Then run targeted real synthetic trade/withdrawal acceptance and physical Android/PWA checks before beta invitations.

---


## Latest checkpoint — 2026-10-29 15:40 Central
- User-facing global search bug fixed: searching from Inbox or Profile now opens Marketplace results. Source 9c9c0dc, targeted test d1f67a6. CI requested at 7907b92; PASS NOT YET CONFIRMED.
- Deployment guard 3076aa6 blocks non-staging-branch deployments and verifies anonymous Basic Auth rejection after upload.
- Separate focused acceptance workflow was incompatible with existing strict OIDC trust (only private-staging.yml is trusted). Commit 2dcb660 converted it to local-only regression without synthetic credentials; deployed signed-in acceptance still PENDING.
- Cloudflare readback: staging Worker f5157e2a deployed 2026-10-29 20:24:25 UTC, before latest search fix. Three secret bindings preserved. Exact current source parity and deployed browser acceptance unverified.
- GitHub connector lacks push-run listing and workflow dispatch; no checked-out private repo executable environment available. Do not claim CI passed or repeat full suites.
- Next: inspect focused CI and trusted private-staging results; verify exact deployment and signed-in desktop/mobile. Then address older offer history and trade retry. Production and draft PR #2 untouched.

---


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

