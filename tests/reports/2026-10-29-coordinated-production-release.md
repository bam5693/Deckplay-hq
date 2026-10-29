# Coordinated production release candidate — 29 October 2026

Status: **integration candidate, NOT approved or ready to publish**. Draft PR #5,
branch `release/2026-10-29-marketplace`. Main and the public Worker were not changed.
PR #2 remains draft and unmerged. This report distinguishes source inclusion from
production readiness; a green UI suite does not clear database or recovery gates.

## Source and conflicts

- Production baseline: main `98dbde611b8f26063f0138588f49804232260ea7`.
- Initial staging integration: `6f45769c76d4e8aa2b8b71379728b019ee367d34`.
- Additional staging application changes through `eac24ea` were integrated:
  conversation-scoped negotiation history and direct trade-card conversation navigation.
  Staging continued moving independently; this is a pinned candidate, not a moving deployment.
- Actual conflicts: `index.html` content and `favorite-actions.js` add/add.
  Retained the current production Favorites controller, including compatibility guards,
  save/remove rollback and account scoping. Integrated staging's homepage/application
  plus the release CSS correction. GitHub reported PR #5 mergeable after integration.
- Staging deployment workflow changes were not blindly imported. Existing OIDC trust
  remains unchanged. New release CI uses contents:read and no customer/account secrets.

## Feature inventory across all eight roadmap trunks

READY means that component has compatible existing production dependencies and relevant
evidence; it does not imply the entire integrated page is publishable. NEEDS WORK means
source is included for coordinated integration but cannot yet be enabled as a production
release. NOT READY features are excluded from the proposed production functionality.

| Trunk | Component and source included | Classification / remaining work |
|---|---|---|
| 1 Listings | Modern listing cards/details; exact descriptions; custom identity/set/variant/printing/language; grading; category classification; quantities/lots; listing editor/photo ordering; owner inventory actions | READY at component level. Real staging listing/category/authorization transactions passed. Full production-shaped browser acceptance is still required for the bundle. |
| 1 Listings | Private account listing drafts | NEEDS WORK: production lacks `listing_drafts`. Reviewed additive candidate SQL exists, but production-specific migration acceptance/recovery is incomplete. |
| 2 Inbox | Focused conversation UI, search, drafts across tab reload, uncertain text-send recovery, read markers, earlier messages, account-switch cleanup | NEEDS WORK for production integration: explicit message selectors require missing `collector_messages.attachment_ids`, even with photo controls disabled. Preserve the text features; reconcile the dependency rather than assume mocked tests establish compatibility. |
| 2 Inbox | Per-conversation price-event/trade-counter history; deterministic timestamp/UUID pagination, retry and draft preservation | NEEDS WORK for bundle acceptance. Integrated newest staging source and targeted its affected UI matrix. Real 51-event timestamp-tie paging and outsider RLS test passed. Older parent offers/trades must also be recovered through existing activity paging. |
| 2 Inbox | Private conversation photos | NOT READY for production; explicitly disabled in BOTH release builds. Missing production attachment table/private storage/RPC/Edge Function dependencies; existing handler only accepts the original staging project and origin. No CORS or authorization weakening was used. |
| 3 Transactions | Price offers, counteroffers, accept/decline/withdraw, shared decision lock, in-thread withdrawal, USD display | NEEDS WORK: same public RPC signatures do not establish same semantics. Production allows withdrawal by last actor; staging allows buyer withdrawal after a seller counter. Reconcile under real production-shaped transaction tests. |
| 3 Transactions | Multi-item trade picker, cash terms, original snapshots, reload-safe retry, counteroffers, accept/decline/cancel, reservations, trade-to-Inbox navigation | NEEDS WORK: production lacks three trade columns and `respond_trade_offer`. Its immutable-update and reservation triggers differ. Porting wrappers alone is unsafe; current guards can reject counter acceptance or conflict with new reservation logic. Real staging lifecycle/bundle tests passed. |
| 4 Discovery | All supported collectible categories/subcategories, search/filter/sort, scope resets, Favorites persistence, blocked-seller Saved filtering, wanted-match privacy | READY at component level. Coverage uses 124 catalog combinations, not just Pokémon/One Piece/sports. Actual categories include trading cards, games, consoles, controllers, accessories, collectibles and other. |
| 4 Discovery | Profile identity preservation, account inventory, profile photo/settings and catalog-wide collecting interests | NEEDS WORK as integrated profile UI selects/writes the two missing collection fields. The chosen username is now preserved on listing publication. |
| 4 Discovery | External collection links and opt-in collection inquiries; seller following; discovery alerts | NEEDS WORK: missing profile fields, `seller_follows`, private inquiry history and `send_collection_inquiry`; notification/block trigger parity needs audit. Default inquiries remain OFF. Public collections do not imply sale availability. |
| 4 Discovery | Full independent portfolio inventory, scanning, valuation/import integrations | NOT READY: larger roadmap work is not completed. Do not describe profile listing inventory or manual external links as a completed portfolio manager. |
| 5 Mobile | Responsive homepage/navigation, Inbox layout/composer, focus treatment and desktop/mobile interactions | READY at component/simulated-browser level. Physical Android keyboard/Back/PWA rehearsal is NEEDS WORK. |
| 6 Security | Account generation/request isolation, blocked-action checks, retry identity cleanup, private-page access boundaries, preserved Turnstile | READY source safeguards where existing backend contracts apply. Production authorization/transaction parity remains NEEDS WORK; client guards do not substitute for server authorization. |
| 6 Security | Moderator MFA setup and advanced moderation UI | NEEDS WORK: source production project binding fixed, but production `review_deckplay_report` uses `(p_report_id,p_status,p_notes)` and staging UI expects `(p_report_id,p_status,p_reason,p_expected_status)`. Verify server MFA/role/queue/audit behavior before enabling advanced controls. |
| 6 Security | Backup restore, export/deletion, broader operational/legal launch readiness | NOT READY for unrestricted marketplace launch. A restorable production backup has not been demonstrated. Existing public policy pages are retained, not newly certified legal advice. |
| 7 Growth | Homepage/discovery appearance and existing public category access | READY components retained. Seller overview source is NEEDS WORK because production lacks `get_my_seller_overview`. |
| 7 Growth | Referrals, scanner/price feeds, full analytics, badges, paid growth | NOT READY / unfinished or unavailable infrastructure; excluded. No paid service was added. |
| 8 Operations | Allowlisted builds, asset hashes, private preview, scoped CI, explicit SHA publication gate, rollback runbook | READY release tooling; source changes are reviewable in this PR. |
| 8 Operations | Full support/dispute/appeals/Command Center and recovery rehearsal | NOT READY / not completed. Backup recipe improved but actual restore evidence is still missing. |

## Exact production contract findings

Ran `release/schema-contract.sql` read-only against BOTH projects. It inspects catalogs,
named RPC arguments, types and RLS; it reads no customer rows and calls no business RPC.
Staging returned zero mismatches. Production returned these 16 rows:

- `collector_messages.attachment_ids`
- `profiles.collection_links`, `profiles.collection_inquiry_mode`
- `trade_offers.offered_listing_ids`, `trade_offers.item_snapshots`, `trade_offers.initial_terms`
- Missing `listing_drafts`: `user_id`, `content`, `updated_at`
- Missing `seller_follows`: `follower_id`, `seller_id`, `created_at`
- Missing `get_my_seller_overview`, `respond_trade_offer`, `send_collection_inquiry`
- Incompatible `review_deckplay_report` named-argument signature

The contract deliberately excludes staging reporting/fixture functions and the disabled
private-photo table/RPCs. Passing this structural check would still NOT prove equivalent
authorization, triggers, migrations, storage, auth configuration or transaction semantics.
Production has 16 application triggers versus staging's 9; do not replay staging bootstrap
or replace production's independent migration history. No migration was applied to production.

## Work and evidence from this session

- `29b0464`: coordinated source integration; preserved main Favorites; fixed literal escaped
  newlines in Inbox CSS; corrected production MFA setup project; allowlisted builds,
  private preview handler, release gate and no automatic production deployment.
- `fb05de5`: exact read-only schema contract; same photo exclusion in preview/production;
  skip unchanged browser testing for tooling-only changes.
- `90b34b7`: corrected two stale test fixtures without relaxing current product safeguards.
- `611a4c5`: integrated latest negotiation paging and direct trade conversations;
  added real price-action tests and source-pinned focused UI scope.
- `d40a498`: fixed test readiness waiting; publication-gate tests; real negotiation paging
  test; backup recipe now includes private signup dependencies and retains grants.

Executed checks (overlapping groups, not an additive certification count):

| Check | Result |
|---|---|
| Inline/external JS syntax, build configuration, local asset links, whitespace | Passed |
| Security/recovery Node suite | 86/86 passed locally and in final CI run 40958608904, including preview-boundary and publication-gate checks. |
| Broad candidate UI, run 40956841483 | 632/636 passed. Four failures were two stale fixtures on both devices: committed photo retry now avoids a second INSERT; discovery now fetches the active record instead of trusting cached cards. |
| Corrected fixtures, run 40957716016 | 34/34 passed, desktop and mobile; 81 Node checks passed. |
| New history/trade affected matrix, run 40958103297 | 247/248 passed. One mobile test timed out waiting for unrelated network idleness. Readiness now waits for the actual mocked application initialization, without longer timeouts or weaker assertions. Follow-up run 40958608904 passed 106/106 affected desktop/mobile Inbox checks. The application source is unchanged from the 247/248 matrix; only test readiness changed. |
| Real staging category transactions | 496 authenticated role/RPC journeys across 124 combinations passed; rollback |
| Real staging trade lifecycle | 28 cases passed across all seven database categories; rollback |
| Real staging bundle integration | Existing multi-item reservation/snapshot/competing-offer assertions passed; rollback |
| Real staging Inbox history | Microsecond/keyset boundary and unrelated-participant RLS assertions passed; rollback |
| Real staging collection sharing | Opt-in/disabled/blocked/third-party inquiry assertions passed; rollback |
| Real staging listing editor | Active-only edits and outsider denial assertions passed; rollback |
| New real staging price actions | 42 withdrawal/counter-withdrawal/decline/participant/inventory checks passed across seven categories; rollback |
| New real negotiation history | 51 actual RPC-generated timestamp-tied events paged 50+1 without duplication; outsider RLS denied; rollback |
| Cleanup readback | Zero remaining release-price users/listings and category fixture users |
| Backup script | `bash -n` passed; no dump or restore executed |
| Publication guard | Refuses release branch; five unit cases cover unresolved gates, blocker list, stale app approval and mismatched commit SHA |

These database tests use real PostgreSQL authenticated roles/JWT claims and RPCs, not
mocked transactions. They do not prove HTTPS sign-up/login, email delivery, image upload,
or signed browser acceptance of this integrated preview. No unsafe production journey ran.

## Preview and assets

- Isolated Worker: `deckplay-hq-release-preview` on the existing account, standard usage model.
- URL: https://deckplay-hq-release-preview.cstivers56.workers.dev/
- Auth delegates only a fixed HEAD request to existing private staging through a service
  binding. No password copied, new CI credential endpoint, timers, scheduled transactions,
  production routes or production DB binding. Client version-override headers are not forwarded.
- Anonymous live request returned HTTP 401 + Basic challenge, no-store, noindex, nosniff
  and frame denial. Existing staging username/password apply. Signed visual acceptance
  remains unverified; a protected URL is not a claim that all live journeys passed.
- Final preview application source: `d40a498aa13caaa36d90af2f383cf75c370428ff`; preview asset-tree SHA-256 `9f3d3fb48f384549475208967dac01f09aff723e8883cb0b5afd339418b094fb`.
- Release has 20 explicitly allowed public assets plus generated manifest/headers.
  Testing pages, synthetic inventory placeholder, reports, SQL, package files, scripts,
  node_modules and staging workers are excluded. Every asset has a SHA-256 manifest entry.
- Production and preview DB bindings are checked separately. Preview uses only isolated
  staging; production uses only production. Private photo controls are disabled in both.

## Why previous releases took hours; changes made

Independent schemas, hundreds of divergent staging commits, manual single-feature
backports and workflows mixing local checks with production-origin account tests made
release work difficult to reproduce. The root Worker config served the repository directory,
and broad/redundant workflow triggers spent minutes before useful failure diagnosis.

This PR introduces one integrated branch, cheap preflight before browser installation,
reproducible public-asset packaging, an inspectable schema contract, isolated preview and
exact-SHA/manual publication gate. Release PRs skip the redundant Favorites workflow;
the broad production-origin browser workflow is confined to staging. Focused follow-ups
use changed specs or an exact-before/after homepage-blob scope; manual acceptance still
supports the full suite. There is no OIDC trust or deployment permission expansion.

## Rollback and safest publishing sequence

Current public Worker rollback version, verified read-only:
`d5ab84b6-baaa-4fc3-b8e5-8af8eb10d969` at 100%; baseline main `98dbde6`.
Record/recheck this immediately before any future approved publication because other
authorized work can advance production independently.

1. Finish a production-specific, non-destructive schema/RPC/trigger reconciliation.
   Existing candidate additive SQL files are inputs, not an approved full migration.
   Do not replace live transaction guards with staging wrappers alone.
2. Test that reconciliation against an isolated production-shaped schema and synthetic
   data, including competing reservation/offer/counter/block cases and existing records.
   No paid Supabase branch or new project was created in this session.
3. Obtain a restorable private production backup and rehearse recovery, including auth,
   public/private functions, grants and object bytes. The available connector cannot
   list/restore a production backup, and this environment lacks a privileged database
   connection and PostgreSQL dump tools. Never paste those credentials into a report.
4. Complete signed integrated-preview journeys and physical Android/PWA checks. Existing
   staging browser/OIDC credentials are scoped to staging; do not broaden trust merely
   to make this candidate appear green. Sign-up/recovery/email/photo journeys remain
   separate acceptance, not implied by rollback SQL tests.
5. Recheck production catalogs and source drift, fill `release/gates.json` with real
   evidence, present the final included/excluded scope, and obtain owner approval of
   the exact candidate. Do not mark this PR ready or merge before that decision.
6. After explicit approval, integrate the approved release branch into main and use the
   manual production workflow with its exact full SHA. Build/deploy the allowlisted
   directory once. Never merge PR #2 or deploy the repository root.
7. Read-only public smoke immediately after deployment. On frontend failure, redeploy
   the recorded prior Worker version at 100%. Retain compatible additive DB additions;
   do not drop columns/tables or roll back user data to reverse a frontend release.
   Transaction failures require the rehearsed incident/recovery plan and may require
   pausing affected actions. A Worker rollback is not a database restore.

No live payments, shipping purchases, paid providers, billing changes, production writes,
customer fixtures, force-pushes or PR merges were performed. **Not ready for final owner
publication approval yet.** The next engineering gate is database reconciliation and
production-shaped/recovery acceptance, not another homepage-only deployment.
