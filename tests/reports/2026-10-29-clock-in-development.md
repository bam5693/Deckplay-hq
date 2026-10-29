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
