# V1 whole-product customer acceptance — owner directive

**Decision:** the six-screen V1 vision integration is a *pilot, NOT the V1 release coverage limit*. Never label V1 visual acceptance complete from those six screens. After pilot prove real model inference and cost controls, extend to all high-impact journeys with a manifest of synthetic screenshots and reproducible steps.

## Two major V1 passes (not 2 total tests)
**Pass A — integrated staging:** run one coordinated full cross-feature acceptance at a pinned staging commit. Cover anonymous discovery, account create/login/reset/signout, listing create/edit/draft/delete for TCG/sports/video game/hardware/collectibles, buy-side search/filter/variants, listing/gallery/photo, Favorites/Wanted/collections, Inbox, price negotiation, trades/bundles, support/report/moderation and mobile navigation/PWA. Test light+dark, phone+desktop where affected, incorrect inputs, loading/empty/error/offline, wrong account and stale actions. Capture representative screenshots of each *different customer-visible state*, not merely one image per entire category; use accessibility checks and screenshot baselines before invoking AI.

**Pass B — after defects fixed:** repeat impacted customer journeys plus the cross-feature critical path on the final pinned candidate, then approved real Android/PWA manual smoke. Do not rerun every unaffected historical unit test; only full integrated customer acceptance is repeated.

## Responsibilities and cheapest useful evidence first
1. Source/syntax and existing API/security/SQL regressions (no inference).
2. Playwright actual UI tasks, app-state and buyer/seller contract; include functional negative path and proper privacy checks. Do not confuse mocked with signed staged.
3. Playwright screenshot difference baselines + programmatic geometry/contrast and axe-core accessibility checks: deterministic, free, catches circular buttons, clipped fields, missing labels. Review intentional snapshots carefully to avoid accepting an already-broken baseline.
4. AI vision as independent quality reviewer on representative screens from each journey after deterministic checks pass. Also assess whether field descriptions and hierarchy seem intuitive; compare goal and before/after state. No automatic calls on hourly, push or per-test workflows.
5. Independent human review on flags (visual AI may hallucinate or miss problems), then physical Android verification for release candidates.

## Domain/role matrix
| Journey | Required collector knowledge | Screens worth vision review |
|---|---|---|
| TCG single/sealed/deck | Pokémon sets, One Piece OP/EB/ST/PRB; major other games, variants and rarity | Type, set, variant, condition, publish preview, buyer search |
| Sports by sport | Baseball, football, basketball, hockey, soccer, racing; vintage O-Pee-Chee vs Upper Deck; maker/brand/year/parallel | Product hierarchy and buyer filter, seller cards, edit preview |
| Video games/hardware | Platform, game edition, completeness, console/controller compatibility | Type, platform, condition, details, buy-side filter |
| Other collectibles | Figures/statues/comics; quantities and authenticity | Subcategory, photos, details |
| Account and navigation | First-time sign-in, reset, sign-out; real Android keyboard | Auth, mobile dock/header, empty states |
| Search/discovery | Aliases, zero-results, favorites/Wanted | Marketplace/collection, results, filters |
| Inbox/offers/trades | Messaging privacy, drafts, 2-sided negotiations, stale states | Thread, offer/counter/trade, failure/success clarity |
| Trust/support | Report, block, help, privacy | Report/support, explanatory warnings, moderator controls |

## AI budget and privacy policy
Start with pilot six screenshots. After verifying cost and inference, use an **approved finite V1 manifest** (proposed 20–40 distinct screens, cap at account's measured remaining free allocation rather than promising 40 free); one vision pass for integrated staging and second for the final release candidate. Prefer cropped image states, reduce duplicate images and record skipped cases explicitly as NOT REVIEWED. If quota/licensing unavailable, do not spend automatically or mark review passed. Synthetic accounts only; screenshots containing private text, credentials or real people are forbidden. No automatic purchases, emails, live transactions or public deployment.

## Acceptance rule
Release may proceed only after no known blocker/major buyer/seller usability/security problems, explicit owner approval and verified backup/recovery gates. A guarantee of 'flawless' is impossible; neither passing 100% tests nor AI vision alone proves that. Report model coverage, missing cases, tested screenshot artifacts, bugs found/fixed, integration hash and physical Android limitations separately.
