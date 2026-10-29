# Clock-in development — 2026-10-29

Scope: isolated staging branch, Supabase prrrzeelltmyugssqnzk and Worker deckplay-hq-staging. PR #2 remains draft, open and conflicted with main. No production/main, customer data, live payments/shipping, billing or merge changes.

## Shipped behavior
- `eafc2a6dce4eed5940cc839ea1407a5aacc1ca2d`: trade proposals reuse a client UUID after uncertain delivery. Retry confirms the exact participants, requested/offered inventory and immutable original terms before reinserting. This works even after an accepted counter changes current terms. Mismatched readbacks cannot acknowledge delivery. Account changes clear retry references. Prepared trades respect local collector blocks.
- Same commit: inbox price/trade/counter replies and trade-sheet replies recheck account generation and blocking after confirmation. Late results cannot update a new session, including sign-out/sign-in to the same collector.
- `fd11e9e38876a0544188add096427c95bfdf1977`: empty marketplace searches provide Clear search and filters, restore search focus and retain Saved items/My listings scope. Actual empty inventory has distinct copy. Two prior response-recovery fixtures now open the Inbox before clicking its controls; no forced hidden clicks or application security bypass.
- Synthetic coverage repair: exactly 22 verified category-fixture video-game IDs, restricted to the two dedicated synthetic owners and exact previous descriptions, received structured Platform lines. Before repair all 22 platform filters returned zero; afterward all 22 returned their matching listing. The stable fixture generator now emits real structured newlines for platforms, hardware brands and deck/lot metadata. No customer rows were changed and no generated full inventory SQL was executed.

## Executed verification
- Local security: 63/63 passed, including 12 focused delivery/confirmation checks. Five homepage inline scripts, Worker bundle, modified specs and generator syntax passed.
- Final focused run [40908835161](https://github.com/bam5693/Deckplay-hq/actions/runs/40908835161), source fd11e9e: 196/196 local desktop/mobile browser cases and 63/63 security cases passed. Covers trade picker/delivery, price and Inbox recovery, marketplace filter boundaries/non-finite inputs, listing publication/profile preservation and search recovery. These groups are separate; historical full-suite counts are not current certification.
- First focused run [40908050005](https://github.com/bam5693/Deckplay-hq/actions/runs/40908050005): 188 passed, four failed because two prior Inbox fixtures clicked hidden controls. Fixtures corrected before final passing run.
- Duplicate broad run [40908835048](https://github.com/bam5693/Deckplay-hq/actions/runs/40908835048) was canceled in local preflight, before deployment or live API transactions. No live photo uploads repeated. Run durations: 193s first focused, 107s final focused, 108s canceled broad; GitHub timing API reports billable.total_ms=0 for all three (not an account-wide billing claim).
- Browser preview against staging data: all four marketplace sections and all 19 supported card-game filters returned synthetic catalog rows; all 22 video-game platform filters returned matching rows after fixture repair. This is discovery coverage, not authenticated per-category transaction certification.
- Read-only staging schema/RLS check confirmed client-provided UUID support and participant-only trade SELECT, plus sender-only pending INSERT.

## Exact deployment
- Application source: fd11e9e38876a0544188add096427c95bfdf1977.
- Worker version: 087b5c2c-b9db-4a97-8054-b2d73c8a3354 at 100% private staging traffic.
- Complete Worker readback exactly matched the locally built source (731,814 characters). Bundle SHA-256: 4e3d0eefe0e568cf711466bb509a0bc1ced65b6df6cd9e1c599f02db5b91a30d.
- All 23 assets, Worker handler, compatibility/configuration and three existing secret binding names preserved. Anonymous staging HTTP returned 401. The earlier profile-identity and non-finite-price fixes are included in this source.

## Remaining limits / next priority
No new signed-in deployed trade transaction was executed; current evidence is mocked browser journeys, executed security/logic checks, database metadata and exact deployed-source parity. Retry references remain in memory for the current account/page session; full-page/offline delivery recovery remains unfinished. No trunk is complete. Next customer slice: reliable earlier-message history at timestamp boundaries, followed by structured listing quantities/lots and remaining per-category signed transaction coverage. Do not rerun passing photo tests or the full broad workflow merely for report changes.

## Wanted Board reliability and matching — 2026-10-29 follow-up

**Customer-facing improvements (staging source only):**
- `ee2ce3e`: exact Wanted Board matches now read structured Card number / Variant / Set fields across real and legacy escaped newlines. Reject near-miss set codes, variants, self listings, invalid budgets and unrelated seller notes; prevents misleading buyer alerts.
- `44b3fe6`: matching listings now show the actual marketplace title and USD price (previously blank title and NaN because the renderer read `title/price` rather than normalized `n/p`). A View button opens the matching listing details after closing the Wanted drawer.
- `7bbcbd0`: Wanted post publishing now blocks duplicate submissions, preserves drafts after network failure, invalidates stale account responses, and clears private drafts on account switch.
- Regression sources `773e53b`, `ba123c1`, `a9dc001` added exact-match, UI navigation, duplicate submission and account-switch cases.

**Actual verification:** 13 classic inline scripts parsed with V8; new Playwright spec parsed; extracted real matcher executed against eight positive/negative fixtures and budget boundaries; extracted real publisher executed five isolated asynchronous checks (duplicate prevention, failed draft, retry, account reset, stale success suppression). **Playwright browser tests not executed.** No Actions run was dispatched for these changes, and none of these newer commits is deployed.

**Existing unrelated CI failure diagnosed:** focused inbox-history/listing run `40912910288` at `00f58b1` failed with 196 passed / 2 failed because an older offline test double allowed one `.order()` but the new production-equivalent query chains two deterministic order calls. Source `b4e3294` corrects the test fixture chain and parses; **the failed browser case has not been rerun**, so do not call it passing. Security checks in that run passed.

**Environment read-only:** isolated Supabase project is `ACTIVE_HEALTHY`. Cloudflare staging Worker is still version `a5be0341-3c81-46d4-bf6e-00a81940b8e2`, annotated source `194b9f3`, 100% traffic. Newer Wanted Board source has NOT been deployed or authenticated-browser verified; deploy only through the existing safe staging build path with exact source readback and preserved bindings, after cheap focused preflight. Do not overwrite concurrent deployments.

**Next:** Run only focused local Wanted Board and offline Inbox recovery Playwright checks in an executable environment, repair any actual failure, then deploy the exact staging build and verify the Wanted drawer/match navigation on desktop and mobile. Continue listing/inbox and signed transaction coverage afterward. No production, billing, payment or real-customer changes.

## Clock back in — completed roadmap batches (latest verified checkpoint)

This section supersedes the pending deployment/test labels in the Wanted follow-up above. All changes are staging only; no trunk is complete.

**Implemented and deployed**
- `194b9f3f0a65935c96623300291f5a3ccb1684c9`: older-message pagination uses deterministic `(created_at,id)` ordering and a composite cursor, preserving microseconds. Tied timestamps cannot skip messages; threads outside the latest 500 messages can recover their own history. Drafts, scroll anchors and stale-request/account protections remain covered.
- Same commit: listing creation/editing accepts a whole-number included quantity, explicit unit and item-by-item contents with matching totals. Everything is sold together for the existing listing price; this is not separate-purchase stock. Exact variants/conditions, account drafts and trade snapshots retain the disclosures. Defaults preserve older listings. No schema migration was needed.
- `6e47920fbda25b4ecb79c0428058b90ad950582d`: owner editor restores/edits sport, year, player and legacy Brand metadata. Concurrent Wanted matcher, navigation, duplicate-publish and account privacy commits were retained.
- `4b4f13041ad589412e43e881df094088b804d448`: Wanted requests support all 19 canonical card games, plus video games, consoles/gear, collectibles and Other. Exact card fields apply to every card game; non-card requests remain broad. Matching listing prices have an explicit USD symbol. Fixtures wait for initial loading and isolate network data.
- `af9ff85199cbbbb54baaf3950a30ee0060151b9e`: buyer descriptions show readable Included items / Item details headings rather than serialization markers.
- `39faa29273ed759354dad2a15feaad5b818e15e7`: blocked sellers are excluded from Wanted matches; stale match buttons recheck the block before opening details. An executed pre-fix matcher reproduced the leak; the corrected matcher excludes it.

**Executed checks**
- [40915080268](https://github.com/bam5693/Deckplay-hq/actions/runs/40915080268), commit `22aa64fa`: **220/220 desktop/mobile local browser cases**, **69/69 security checks** passed for the combined history, listings/editor, drafts, account boundaries and Wanted features.
- After the final two-line privacy fix, [40915598917](https://github.com/bam5693/Deckplay-hq/actions/runs/40915598917), commit `70d5dc56`: **16/16 affected Wanted desktop/mobile cases**, **69/69 security checks** passed. These overlap the earlier group; do not add them as unique coverage.
- Real isolated database: five existing bundle/price/counter scenarios passed; new history keyset test passed three pages spanning tied timestamps/microseconds and participant RLS; new category lifecycle suite passed **28 scenarios** across trading cards, games, consoles, controllers, accessories, collectibles and Other. Cancellation, decline, acceptance, counters, repeated-acceptance rejection, whole-inventory reservation and quantity snapshot retention passed. Every fixture transaction rolled back; follow-up counts found zero bundle/history/lifecycle identities.
- Syntax/build checks passed. Initial focused runs `40912910288` (196 pass/2 fail) and `40914037390` (207 pass/2 fail, stopped early) were diagnosed before rerunning: an old one-order query mock, then missing currency and asynchronous Wanted fixture loading. These were corrected, not bypassed.
- Four workflow durations: 101s, 105s, 103s and 27s (336s total elapsed run duration). GitHub timing returned Ubuntu billable_ms=0 for each; this is not an account-wide billing statement. No broad transaction/photo workflow was launched this session.

**Final exact private deployment**
Application source `39faa29273ed759354dad2a15feaad5b818e15e7`; Worker `757b33fc-fac2-4688-8e9d-eb8a4566d657`, 100% private staging traffic. Complete readback equals the built source, 740,133 characters; SHA-256 `09dd4cbe6ff6317958a744fa99eac16a669b0cfd83b5a8ca24b41bcbfa82ad9d`. All 23 assets and existing handler/configuration/three secret bindings retained. Anonymous HTTP returned 401.

**Verification limit / remaining work**
The interactive staging browser returned `net::ERR_INVALID_AUTH_CREDENTIALS`. Therefore no authenticated deployed-browser acceptance is claimed; SQL role/transaction checks and local browser fixtures are distinct evidence. Work continued into category transactions and Wanted privacy after that blocker. Private Access must remain enabled. Next: authenticated deployed acceptance, broader conversation-list history beyond the latest global window, durable full-page message recovery, remaining collection/quantity UX and physical Android/PWA checks. PR #2 remains draft/open/conflicted and unmerged. Production, real customer data, live payments/shipping and billing were untouched.
