# Staging roadmap development — 2026-10-28

Scope: `test/staging-reporting`, draft PR #2, Supabase `prrrzeelltmyugssqnzk`, Worker `deckplay-hq-staging` only. No production/main, real-user data, billing, payment or shipping changes.

## Baseline

Read the complete eight-trunk roadmap at `18e86e2`. Latest feature workflow `40675552913` passed for code `74c3a68`; older failure `40645072205` is superseded by four successful feature runs. PR #2 remains open, draft, unmerged; its body was an older October 27 checkpoint. All 23 public tables currently have RLS. Security advisor reports leaked-password protection disabled; no plan/auth changes made. Existing two public photo buckets are unsuitable for private message attachments. Basic-auth browser access denied an unauthenticated request as expected; trusted existing CI remains the deployed browser path.

## Batch 1 — Inbox / Android Back

POLISH → locally verified: directly opened conversations now have a separate Back entry, so Back returns to the inbox before leaving it. Switching contacts replaces the existing thread entry, eliminating phantom history steps. Returning to the inbox clears the selected-thread pointer and preserves the unsent draft.

Reproduction: two focused regressions failed on both desktop and mobile before the fix (four failures). After the fix, 88 local desktop/mobile checks passed across inbox recovery, request ordering and regressions. All 33 existing security checks passed. Five inline scripts parsed; diff whitespace check passed. These are local simulations, not real API certification.

Deployment: exact Worker content uploaded with content-only API; read-back contains the complete local Worker byte sequence. Deployment ID `55c2795f379f4bb79edb488d58821bac`. Three secret bindings, compatibility date and cron schedules preserved. Extended the existing deployed buyer/seller journey to verify Back and draft restoration against real synthetic conversations without adding duplicate standalone journeys.

VERIFY: matching deployed CI and real staging API results pending branch publication. NEW: private attachments, external collection links and secure admin foundation remain unfinished. Next: precise custom card identity and seller fallback UX, after confirming this batch.

## Batch 2 — Exact card identity and storefront detail parity

NEW → local VERIFIED: optional custom set/release, custom variant/finish, rarity, edition/printing and language. Custom text replaces the corresponding catalog selection; seller asking prices remain authoritative. Card identity fields now also work for sports cards and unsupported TCGs, with no fabricated catalog options. Description help explicitly covers unlisted cards, serial numbers, mixed lots and flaws. All metadata is saved through the existing description field; no schema change.

POLISH → local VERIFIED: seller-profile listings now use the shared marketplace row converter, retaining exact seller descriptions, category and price-offer eligibility. Previously storefront detail pages displayed no description and hid Make an offer.

Validation: 64 distinct local desktop/mobile checks in listing descriptions/publication, catalog sets, seller profiles and selling categories passed (62 initially; the two new repeated-publication cases passed after correcting the test fixture to use the real photo input after form reset). This fixture correction changed no application photo behavior. No inflated cumulative totals. Existing deployed deck journey extended to save custom printing details and compare the storefront description with the actual saved row.

Deployment and current deployed CI: pending, waiting for Batch 1's matching build checks to finish before replacing served assets. Next: fix newly reproduced stale blocked-collector and notification-preference responses across account switches (both reproduced on mobile and desktop).

### Batch 1 deployed completion

VERIFIED at `460438ce212ab3cb44f7c1baae083ae7cd9f12ab`, [run 40680128125](https://github.com/bam5693/Deckplay-hq/actions/runs/40680128125): 48 real staging API, 44 deployed desktop/mobile cases, 86 selected local checks and 11 cleanup-safety checks all passed. The existing real buyer/seller journey now verifies chat Back navigation and draft restoration. These separate layers are not a roadmap completion percentage.

### Batch 2 deployment

Code `50bb34fd3bae7967ca1b9dd4799e6d7b93a8973d`, deployment `499e38f928bc472e8296018bbfe1dcc2`, exact complete Worker content read-back matched. [Run 40681070226](https://github.com/bam5693/Deckplay-hq/actions/runs/40681070226) is the matching verification run; pending at this checkpoint. Reviewed local mobile/desktop custom-printing screenshots; no new schema or storage permissions.

## Batch 3 — Block list and notification preference privacy

Confirmed defects: late block-list responses could merge a former account's blocked IDs into a current account; late notification-preference responses could overwrite current account settings. Both reproduced on mobile and desktop before the fix. These are client state-isolation defects; existing database RLS was not bypassed.

Fixes: account/request guards on block-list reads and block mutations; stale blocked-name enrichment discarded; account switches immediately clear blocked names/counts. Preferences require a successful load for the current owner before edits; controls disable during load/save, recover after errors, reject stale responses and clear on account changes/sign-out. No backend/RLS weakening or database changes.

Local evidence: 94 desktop/mobile checks passed across account boundaries, inbox ordering/recovery and profile editing. The expanded account suite then passed 28 checks, covering delayed block mutations and failed-load/retry/former-account-save behavior. These overlap; do not sum them as unique checks. Added relevant existing listing/account specs to the single private staging workflow so new regressions actually run in its CI path.

VERIFY: exact deployment and matching CI pending, waiting for Batch 2 to finish. Next: harden the legacy moderation page's session/MFA boundaries; staging currently has no moderator authorization/queue RPCs, so a functioning admin backend remains NEW, not certified.

### Batch 2 deployed completion

VERIFIED at `50bb34f`, [run 40681070226](https://github.com/bam5693/Deckplay-hq/actions/runs/40681070226): 48 real API, 46 deployed browser, 86 selected local and 11 cleanup checks passed. Exact custom text and storefront disclosure parity passed against real synthetic saved rows.

### Batch 3 deployment

Code `ae063ba56b965cb6a6dbd08ab5bc0e79603a3efe`, deployment `a256360bdfb94e548b7e060d22761a68`, complete Worker read-back matched. [Run 40681791376](https://github.com/bam5693/Deckplay-hq/actions/runs/40681791376) is the matching CI run; pending at this checkpoint.

## Batch 4 — Command Center moderation UI security

POLISH: existing `moderation.html` now uses the vendored Supabase client, a mobile-friendly Command Center shell, live status messages and 44px action buttons. It verifies the current user, requires AAL2 MFA and then the server moderator-role RPC before requesting reports. Administrative writes revalidate identity/MFA/role. Losing authorization clears reports and controls. Auth events immediately clear private data; old queue results cannot restore it. Pending actions disable duplicate controls, and service failures remain visible.

Reproduction: the legacy page displayed synthetic reports with AAL1 and retained them after sign-out; four mobile/desktop regressions failed before the fix. Four focused scenarios (eight mobile/desktop cases) now cover MFA denial, sign-out clearing, stale queue rejection and revalidation before writes. Full local suite after this batch: **310 passed**, no failures. It includes existing marketplace tests; this is not additive to earlier local counts.

Security boundary: these are UI privacy/MFA safeguards, not a substitute for server authorization. Staging has no `is_deckplay_moderator`, `moderation_report_queue`, `review_deckplay_report` or `hide_deckplay_listing` functions. No roles were granted, no real reports read/changed, and no working admin backend/audit trail is claimed. Backend least-privilege roles, server-enforced MFA and audit logging remain NEW. Added a real deployed ordinary-collector denial case, pending matching build CI. No billing or auth-plan changes.

VERIFY: deployment pending Batch 3 completion. Next confirmed defects: report dialog allows duplicate submissions, retains private drafts after account switches and accepts stale block-status lookups from the previous target. Targeted regressions reproduced each on desktop/mobile; fix these before expanding moderation features.

### Batch 3 deployed completion

VERIFIED at `ae063ba`, [run 40681791376](https://github.com/bam5693/Deckplay-hq/actions/runs/40681791376): 48 real API, 46 deployed browser, 158 selected local and 11 cleanup checks passed. The larger local selection includes previously existing account/listing regressions added to this workflow; it is not 72 newly implemented features.

### Batch 4 deployment

Code `8827f7455c8b71ed21843b63a74c18542bffb95b`, deployment `a12f7a10a1854489829627584ca616d9`, exact complete Worker read-back matched. [Run 40682581715](https://github.com/bam5693/Deckplay-hq/actions/runs/40682581715) is the matching CI run; pending at this checkpoint. Local mobile screenshot review confirms readable locked access with no report data or controls.

## Batch 5 — Private report intake and counterfeit/photo categories

POLISH: report submissions now guard duplicate taps, snapshot the reporter/target/reason/details before awaiting, preserve newer edits on success and retain drafts with retry controls after errors. Switching accounts immediately erases report drafts/targets and closes the dialog; old submissions cannot affect the new account. Block-status lookups are scoped to account and report target. Blocking remains a separate explicit control.

NEW: suspected counterfeit/altered-item and stolen/misleading-photo report categories. Existing staging report schema accepts these text categories; no migration needed. Expanded the existing report privacy API test to verify the counterfeit category persists while preserving cross-user/anonymous/impersonation denial checks.

Validation: three initial report regressions failed on both mobile and desktop. After fixes, 62 targeted desktop/mobile account/report, option and marketplace-safety checks passed. The existing 33 security tests passed against current sources. Full local suite: **318 passed**, no failures; deployment waits for Batch 4's exact build checks. No real report or user data changed.

Next independent listing branch: deck quantity consistency. Current deployed synthetic deck fixture declares 51 cards but only lists 9; current UI does not flag the mismatch. Implement explicit-quantity arithmetic without claiming game-specific deck legality.

## Batch 6 — Explicit deck quantity consistency

NEW / local VERIFIED: deck posting now counts explicit `4x Card`, `4 x Card` and `4× Card` lines. Fully counted decklists must match the stated card count; invalid explicit quantities are rejected before uploads/publication. Notes and unsupported formats are identified as uncounted, with no guessed quantities or legality/completeness certification. Sellers retain their text and choose the correct stated total. This is a client posting safeguard; structured server-side deck inventory enforcement remains future work.

The real synthetic deck fixture now lists 1 leader + 4 named cards + 46 other included cards, matching its stated 51. Its existing deployed journey checks the live count feedback before publication. No claim is made that this generic synthetic list satisfies One Piece rules.

Local validation: 46 desktop/mobile listing description/publication/category checks passed, including mismatch prevention, correction and successful publication, Unicode quantity notation, uncounted notes and zero-quantity feedback. Five inline scripts parse and diff whitespace checks pass. Exact deployment and matching CI pending earlier batch completion.

## Eight-trunk boundary and remaining beta gates

- **Trunk 1 — POLISH:** custom identity/disclosures and quantity feedback implemented this session. Mixed-lot structured inventory, identical-copy quantities, seller vacation controls and durable drafts remain NEW/VERIFY.
- **Trunk 2 — POLISH:** direct-chat Back, contact switching and report/account privacy improved. Private image attachments remain NEW: existing buckets are public; private storage authorization, content validation and signed access need a separate tested implementation.
- **Trunk 3 — VERIFIED historically/current regression:** API/browser offer/trade reservation flows pass in cited runs. Server idempotency after uncertain network outcomes and durable offline transaction recovery remain VERIFY. No live commerce.
- **Trunk 4 — POLISH:** storefront descriptions/offer eligibility preserved; discovery regressions pass. External collection links and server-enforced inquiry opt-in OFF by default remain NEW; no inquiries were silently enabled.
- **Trunk 5 — POLISH:** Chromium desktop/mobile history and responsive layouts tested. Physical Android device, installed-PWA and mobile keyboard behavior still require device checks.
- **Trunk 6 — VERIFY:** 23 public tables have RLS; existing API denials and security suite pass. Leaked-password protection warning remains. Full recovery email, backup restore/rollback drill, deletion/export and legal/support readiness remain unresolved.
- **Trunk 7 — NEW/VERIFY:** no storefront analytics/referrals/founding badges/SEO expansion claimed this session.
- **Trunk 8 — POLISH/NEW:** moderation UI MFA/session safeguards and counterfeit/photo intake added. Real privileged roles, server-enforced MFA, audit trail, admin queue/action RPCs, support tickets, Help Center and emergency controls remain NEW. Default denial is verified separately; a functioning administrative backend is not certified.

Payment/shipping preparation remains preview-only. Competitive/capped fee ownership and exact rates need owner decisions; fee-inclusive listing displays must exclude shipping and tax, with selectable shipping/final tax-inclusive totals later. No payment provider, shipping labels, purchases, plan upgrades, production edits or PR merge occurred.


### Batch 4 deployed completion

VERIFIED UI at `8827f74`, [run 40682581715](https://github.com/bam5693/Deckplay-hq/actions/runs/40682581715): 48 real API, 48 deployed browser (including ordinary-collector Command Center denial), 166 selected local and 11 cleanup checks passed. Backend admin implementation remains NEW.

### Batch 5 deployment

Code `aa4fcaaf7e08377acbe697e419eb435e4e1b9a92`, deployment `0cdcfce9cf1f4c2086aa32cc76d635c4`, exact complete Worker read-back matched. [Run 40683363764](https://github.com/bam5693/Deckplay-hq/actions/runs/40683363764) is the matching CI run; pending at this checkpoint.

### Final local release check

After the deck quantity changes, **322 full local desktop/mobile checks passed**, no failures. This replaces earlier local counts for current source coverage; do not add 310, 318, 322 or targeted subsets together. The 33 security checks are tracked separately; cleanup's 11 are a subset of that suite. Unauthenticated direct staging access returned HTTP 401. Current remediation reference: [Supabase leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No auth setting or subscription was changed.

### Resumed checkpoint — deck quantities

Prior report-intake run `40683363764` completed successfully (all staging jobs). On resume, 46 targeted local desktop/mobile listing checks and all 33 security checks passed. Deck quantity Worker deployment `6e9756740f474a7ba214705cd3db28d5` is staging only; matching CI pending publication. Next priority: least-privilege server moderator access, live session/MFA enforcement and an auditable report-review path. No moderator grants or production changes authorized by this checkpoint.

### Concurrent staging integration

While Batch 6 waited for CI, owner commit `ecf9af27cc884ed33401f27ed002edd297eae8b6` added seller-description/variant/language/condition search and its existing regression. The expected-head lease prevented overwriting it. Batch 6 was rebased onto that commit, preserving both its search text/placeholder changes and its tests. Forty targeted desktop/mobile search, listing-publication and deck-description checks passed on the combined source; full local integration verification is rerunning because the source changed. Earlier `322` is the pre-integration full-suite count, not a current combined claim. Unpublished candidate `65d2c76` is superseded and must not be used as the final checkpoint.

Batch 5 is VERIFIED at `aa4fcaa`, [run 40683363764](https://github.com/bam5693/Deckplay-hq/actions/runs/40683363764): 48 API, 48 deployed, 174 selected local and 11 cleanup checks passed. The final combined build will receive a new exact deployment and matching CI run.

### Trunks 6/8 — server moderator foundation

See [moderator authorization and audit foundation](2026-10-28-admin-foundation.md) for the current security batch. Staging now has explicit private moderator grants, live session/MFA enforcement, bounded report reads and reasoned status-review RPCs with atomic private audits. Initial report status must be open. Database authorization simulations passed with every fixture/grant rolled back; **326 current-source local checks and 33 security checks passed**. No lasting role grants, real operator onboarding or actual signed privileged MFA journey is claimed. Operator setup and the remaining admin/support/beta gates remain unfinished. Matching exact deployment/API CI evidence is pending publication.

### Deck/search combined staging verification

The preserved collector-search and deck-quantity build `2cf2b1d953e7c5f1e4cfa5bd1c11cc26a90a0560` completed [run 40684599015](https://github.com/bam5693/Deckplay-hq/actions/runs/40684599015) successfully: 48 real API, 48 deployed desktop/mobile, 180 selected local and 11 cleanup checks. This verifies the integrated deck/search checkpoint before the moderator-foundation batch; it does not certify game legality or complete Trunk 1.

### Moderator foundation final matching CI

Foundation code `616cc03`, exact deployment `7ef9cb60bb69470ba100e0fb99286916`, [run 40685434694](https://github.com/bam5693/Deckplay-hq/actions/runs/40685434694): **49 real API, 48 deployed browser, 182 selected local and 11 cleanup checks passed**. The separately executed full local suite passed 326; security passed 33. Selected/cleanup subsets overlap. Trunks 6/8 now have a staging-verified access/audit foundation; operator MFA setup/onboarding and the actual signed privileged journey remain the next security gate. No lasting roles or live commerce were enabled.


## Completed batch index — verified 2026-10-28

| Batch | Result | Code | Passing workflow |
|---|---|---|---|
| 1 — VERIFIED | Direct-chat Back/contact switching and drafts | `460438c` | `40680128125` |
| 2 — VERIFIED | Custom card printing and storefront disclosure/offer parity | `50bb34f` | `40681070226` |
| 3 — VERIFIED | Block-list and notification-preference account isolation | `ae063ba` | `40681791376` |
| 4 — VERIFIED UI | Moderator UI MFA/session clearing | `8827f74` | `40682581715` |
| 5 — VERIFIED | Private report intake, duplicate protection, counterfeit/photo categories | `aa4fcaa` | `40683363764` |
| 6 — VERIFIED | Explicit deck quantity checks with concurrent collector search preserved | `2cf2b1d` | `40684599015` |
| Integrated foundation — VERIFIED within stated limits | Server role/MFA/session checks, reasoned review and private audits | `616cc03` | `40685434694` |

Current release evidence: 326 full local checks, 49 real API checks, 48 deployed browser cases and 33 security checks passed. CI's 182 selected local and 11 cleanup checks overlap those suites. Current full Worker SHA-256: `a46b8cd76fb292618888b31e6fcd97893c34f014e419ff79a453821e475408d4`; complete current-source read-back matched. Zero enabled moderators were observed. These are staging verification boundaries, not full beta readiness or signed privileged MFA certification. The current foundation report supersedes earlier statements that moderator RPCs were absent or reason/status UI wiring was missing.

## Roadmap development session — inbox trade clarity and opt-in collections

Scope remains branch `test/staging-reporting`, Supabase `prrrzeelltmyugssqnzk`, Worker `deckplay-hq-staging`; no production, merge, payments, shipping purchase or billing change. Four personas remain deterministic roles. Concurrent commits `18f35cd`, `661a7cd` and `26142b4` were preserved, including chronological counter events, notification routing and exact proposal focus.

### Customer-facing batches

- **Trunks 2/3:** Conversations show both listed items as **You give / You receive**, expandable exact current listing disclosures, original cash direction relative to the viewer, pending counter terms, chronological counteroffer events and separately labelled accepted counter terms. Pending counters suspend original acceptance; recipients can accept/decline directly in the conversation. Shared per-offer decision locks prevent competing inbox/dialog actions. Dialog transport failures restore controls; stale-account responses are ignored. Counter creation refreshes an open inbox. Terms-load failures withhold decisions. These are existing two-listing proposals, not structured multi-item inventory snapshots.
- **Trunks 2/5:** Search loaded conversations by collector/recent update and filter unread. Clear feedback for no matches; read receipts reconcile the filter, while conversation switching and Back preserve drafts. Search covers bounded loaded conversations, not full server message history.
- **Trunks 4/6/7:** Up to three named public HTTPS collection links on collector profiles, including collectors without listings. External hostname/leaving-site cues, safe links, unverified ownership and no-sale-availability disclosure. Add/edit/remove in profile settings. Showcase/inquiries **OFF** is the database default; explicit Trades Only or Buy/Trade opt-in, instantly pausable. A dedicated private inquiry form preserves failed drafts and clears on account change. The server locks preference/rate checks, denies disabled modes, buying in trades-only mode and blocked users, rejects duplicate item inquiries and limits first contact to one per recipient/day and five/day overall. Inquiry creates a private inbox message only. No external inventory scraping, listing or transaction is fabricated. Existing ordinary marketplace messages remain separate; this feature does not classify or moderate arbitrary free text.
- **Trunk 8:** Feature-source changes now run the existing isolated staging workflow once after matching deployment; report-only commits do not restart it. Browser CI ignores documentation-only PR changes to avoid redundant minutes. No new paid runner/service.

### Fixes and evidence

- Fixed the remaining `1 characters remaining` regression assertion.
- Integration reproduced literal `${escapeHtml(...)}` in a concurrent review button's ID; corrected template interpolation. Fixed constant reassignment in the older-than-100-trades lookup path. Preserved exact proposal focus.
- **Full local checkpoint before the last dialog/focus integration:** 396 desktop/mobile checks passed. **Final combined targeted source:** 80 inbox, trade-details and collection checks passed; subsets overlap. 35 security checks passed. Five inline scripts parse; staging build guards pass.
- Collection schema/RPC was first exercised inside a rollback transaction, then applied to isolated staging and verified again. Authorization assertions cover unsafe/missing URLs, OFF default, trades-only, block, duplicate and daily recipient limits, recipient versus outsider message RLS, anonymous execute denial, private-table grants and successful real `authenticated` role invocation. All generated users/messages/notifications/inquiries rolled back; follow-up count: zero `collection-rollback-*` accounts.
- Advisor after explicit deny policy: only the pre-existing leaked-password-protection warning remains; no auth plan/billing changes. Private rate records have RLS and no client table grants. Public wrapper is invoker; private implementation is narrowly granted and checks identity/preferences/blocks/limits.
- Final application code commit: `bed97fb0c1e1dc913aadb61141c0055561c0fd99` (GitHub API publication; local author hashes differ). Worker version `41a9e2bf-b4d9-4c6e-a118-bf30fd90942a`; source SHA-256 `e4cdded7065aeb1f81765ebfa3af5dad019be7cf810166f3066e2b1c2df82521`. Deployment uses content-only replacement to preserve secret bindings/config/schedules. Full read-back comparison and matching CI are tracked in PR #2's latest verification note; do not interpret this pending checkpoint as deployed browser certification. Unauthenticated staging returned 401.
- Initial historical CI inspection: run `40724659866` API/local jobs passed; deployed browser failed from homepage source mismatch and hidden authenticator setup after successful enrollment. No repeated reruns. Current signed MFA behavior must be established by the new matching run; the current branch already contains subsequent QR decoding fixes.

### Remaining priority / honest eight-trunk estimate

No trunk is fully finished or certified for launch. Trunk 1 has an advanced listing baseline (custom printings/decks/photos); structured quantities/lots/durable drafts remain. Trunk 2 has a strong text inbox baseline; private image attachments, durable uncertain-send recovery and long-history pagination remain. Trunk 3 has a working offer/two-listing trade baseline; structured multi-item snapshots and stronger ambiguous-network idempotency remain. Trunk 4 has discovery plus a new opt-in collection MVP; matching/import and inquiry dismissal/reopening remain. Trunk 5 has responsive/browser-tested baseline; physical Android/iOS/PWA/keyboard checks remain. Trunk 6 has isolation/RLS/block/MFA authorization foundations; signed MFA/recovery/deletion/export/backup drills remain launch gates. Trunk 7 has storefront/follow/shareable-collection baseline; analytics, vacation mode and referrals remain. Trunk 8 has audited moderator foundation/report intake; complete operator onboarding, enforcement/dispute/support workflows remain.

Next: finish matching deployment/API/browser verification and resolve any critical signed MFA failure; implement structured multi-item trade terms/snapshots and reservations; build private image messaging with safe storage/content checks; then listing quantities/drafts and seller vacation/analytics, followed by operator/support and launch-readiness gates. Collection first-contact limits are intentionally conservative; no paid integrations enabled.

### Final matching verification — 2026-10-28 session close

This entry supersedes the pending deployment/MFA statuses in the preceding session checkpoint.

- Final application code: `9c0654b6bffdf54f85edc23f7c79e4b7aa916467`; Worker version `916e891e-52df-4372-a62a-f371f1fb13cb`. Full exact source read-back matched (648,152 characters); Worker source SHA-256 `c1373a36737d507f68fed17d22fb92b2ab75a853e17f8f5a9cebf5505d4b5e83`. Existing secret bindings, compatibility settings and schedules were preserved. Unauthenticated staging returned 401.
- **PASS:** [matching run 40757391096](https://github.com/bam5693/Deckplay-hq/actions/runs/40757391096): **49 real API**, **49 deployed browser**, **262 selected local** and **11 cleanup-safety** checks. One intentional mobile MFA duplicate is skipped; the desktop case performs actual signed enrollment/challenge/verification, confirms AAL2 and moderator denial, and removes its exact test factor. The reporting allowlist accepts only this named mobile skip, while other skips/failures remain failing evidence. Durable staging report saved `passed: true`.
- Separate local evidence: **402 full desktop/mobile checks** passed before the final QR-size correction; **48 focused MFA checks** passed with the final correction; **37 security checks** passed. These overlap CI/each other and must not be added together. No post-correction full-suite count is invented.
- Two real MFA presentation defects were fixed: SVGo's XML generator comment, and an incorrect 200 KB cap. A signed disposable probe returned a legitimate 406,128-character SVG. The decoder now accepts bounded SVG up to 2 MiB and still rejects executable markup and oversized payloads. Source references: [Supabase Auth QR generation](https://github.com/supabase/auth/blob/master/internal/api/mfa.go), [SVGo prolog](https://github.com/ajstarks/svgo/blob/master/svg.go). A direct signed probe additionally completed real TOTP verification and received AAL2 while moderator and queue access were denied. A local signed-browser probe could not load its account; that environment-specific attempt is not presented as passing evidence. The subsequent deployed signed-browser run above did pass.
- Collection-only profiles now omit the generic profile-message CTA, directing new collection contact through explicit opt-in. SQL/role tests and real anonymous HTTP denial passed; public collection columns are exposed successfully. A dedicated signed-user end-to-end collection inquiry journey remains additional coverage, not a claimed result of the existing baseline deployed journeys.
- **Unresolved housekeeping:** test MFA factor removal was confirmed for the diagnostic probe. Deleting the disposable diagnostic account was interrupted; a read confirmed one account remains (`3d64a832-a581-41c6-bffb-f060b2a0cd9f`, `mfa-probe-3d64a832-a581-41c6-bffb-f060b2a0cd9f@deckplay.test`). No moderator grant was created. Its generated local password/session/enrollment files were removed. The rollback collection fixtures left zero accounts. Do not confuse this one diagnostic account with real customer data or certify its deletion.
- Earlier matching attempts `40754266860` and `40755729295` failed the MFA setup presentation case; their 48 passing deployed cases are historical subsets. Each rerun followed a diagnosed code correction; the final green run replaces those release claims.

Published code commits: `96f42d5` (trade items/terms), `914683b` (collection links/opt-in inquiries), `29c5e56` (conversation filters/dialog locks), `5f01de1` (accepted terms/staging checks), `bed97fb` (exact trade focus fixes), `d5e9775` (MFA prolog/reporting/collection entry points), `9c0654b` (legitimate QR sizes). Report/CI economy checkpoint: `0d775b2`. Concurrent owner commits were preserved; PR #2 remains draft and unmerged. Production/main, real customer data, live money/shipping and billing remain untouched.

Next priority: resolve the confined diagnostic-account cleanup; implement structured multi-item trade snapshots/reservations and durable uncertain-network recovery; add private photo messaging with safe storage/content authorization; then quantities/durable listing drafts and seller availability/analytics. Continue real privileged operator onboarding/MFA, support/dispute workflows, physical-device and recovery/export/backup/launch gates. No trunk is fully complete; the preceding eight-trunk qualitative estimate remains applicable.

## Resumed roadmap batch — structured trade bundles

Trunks 2/3/5/6: proposals now support up to five offered active listings against one requested listing. The existing picker adds/removes individual listings with mobile-sized controls; failures preserve the selected bundle. Account changes clear its private selection. Existing one-item and note-only proposals remain compatible; note-only items are explicitly labelled as unreserved inventory.

The staging database captures title, exact disclosure/condition, category, asking price, owner and photo references at submission, and preserves original note/cash terms separately from accepted counter terms. Proposal inventory and saved snapshots cannot be rewritten. Inbox and trade review render the saved details even if live listings become unavailable. Snapshots retain photo URLs, not separate archival image copies. Old proposals are clearly identified as lacking saved item snapshots; no historical snapshots are fabricated.

All selected listing rows lock in stable UUID order. Trade/counter acceptance reserves the complete bundle atomically; competing trades and price offers involving additional collateral close correctly. A price acceptance on an additional item closes the losing bundle without reserving unrelated items. Changed listing disclosures/price/photos invalidate acceptance with a fresh-proposal instruction. Counters adjust cash/notes only; changing selected inventory requires a new proposal.

Validation before publication: 96 targeted desktop/mobile picker/inbox/trade checks passed; staging transaction/role suite passed and rolled back all generated accounts, notifications, listings and offers (follow-up fixture count zero). It covers server-generated snapshots, ownership, duplicate/target-item injection, outsider denials, multi-item counter reservation, stale-term rollback and extra-item competing-offer closure. Staging advisor has only the existing leaked-password warning. Full local suite and matching deployed API/browser run are pending at this checkpoint. Four real API cases and the existing deployed sports/TCG journey now exercise multi-item inventory, saved disclosures and concurrent bundle/price acceptance.

Only staging schema and branch were changed; production/main, payments/shipping, billing and PR merge remain excluded. The pre-existing isolated MFA probe account remains a separate confined cleanup item until deletion is confirmed.

### Structured bundle matching verification

Bundle code `c52bd49afdb1d07825ce98ed8c7e4542ff35e135` is VERIFIED at [run 40762847460](https://github.com/bam5693/Deckplay-hq/actions/runs/40762847460). The isolated Worker version is `b47477df-2aef-4702-ab79-e6dbaa7c8bdc`; full source read-back matched (653,163 characters), SHA-256 `d814dd51b3d0ea6e820c86ad467f3dc67fc6c7047d41e526d2380444113ebe72`. Full local: 412 passed. The security suite passed 37. Matching CI confirms all real API/browser/local/cleanup steps succeeded, including the expanded multi-item trade journey and concurrency coverage. Counts/subsets overlap.

## Next batch — recover uncertain message delivery without duplicate sends

Trunk 2: inbox and listing/profile compose now assign one client-generated message ID per exact pending draft, scoped to sender, recipient, listing context and body. If a response is lost after server commit, the client checks the exact saved row. A retry keeps the same primary key, preventing duplicate inserts; only an exact sender/thread/context/body match can confirm delivery. Known authoritative server rejections do not add unnecessary recovery reads. Failure retains the draft and retry reference. Attempts remain in memory and clear on account changes; full-page offline durability is not claimed.

Account generations prevent an earlier send result clearing a newer draft after switching away and signing back into the same account. A late result also cannot remove a newer attempt's reference. Targeted desktop/mobile inbox/account/order suite: 120 passed. No database/schema, payments or billing change in this batch.

Confined diagnostic cleanup retry returned the Supabase connector error `Invalid or expired requestState`; no deletion success is claimed. This provider failure is kept separate from the working marketplace batches, and no alternative privileged bypass was introduced.

## Third resumed batch — private account-backed listing drafts

Trunks 1/5/6: existing browser-tab text drafts are preserved and extended with explicit Save to account / Resume saved draft / Delete saved draft controls. One private metadata draft per collector can be resumed after another visit or on another signed-in device. Drafts never publish automatically. Text, categories, prices, grading, printing/custom identity and trade/offer choices are retained; photos/credentials are excluded, and resuming an account draft clears photos with an explicit re-selection instruction. Saving replaces the previous account draft; it remains until explicitly replaced/deleted.

Owner-only SELECT/INSERT/UPDATE/DELETE RLS and grants protect the new size-bounded `listing_drafts` table; anonymous access, impersonation, malformed content and oversize content are denied. Transaction/role checks passed and rolled back all fixtures (follow-up count zero). Advisor remains limited to the pre-existing leaked-password warning. This adds no storage bucket, paid service or billing change.

Dependent form selections now restore in DOM dependency order, preserving catalog set/variant and grading values instead of resetting them after parent selectors rebuild. Stale loads cannot overwrite newer edits; account/request generations discard old loads/saves and release the correct controls. Save failures preserve the form. Local combined listing/inbox checks passed 116; the final draft-focused subset passed 12 (overlapping, not additive). Real staging API privacy/save coverage and a deployed save-clear-tab-storage-reload-resume journey were added; matching verification pending publication.

Concurrent owner commit `6558c4b` preserves inbox search/unread filters across refreshes and resets them on account changes. It was integrated without overwriting its implementation/tests. Its run superseded message-only run `40764271610`; final combined verification must cover both changes. The message batch's full local suite passed 418 before this integration/draft batch. A new final combined full run will replace that checkpoint.

### Three resumed batches — final verified checkpoint

Current application `29d1d1b2fa5ed127541994980ce6b14a16a18fbe` is VERIFIED at [run 40765854214](https://github.com/bam5693/Deckplay-hq/actions/runs/40765854214): **54 real API**, **51 deployed browser**, **284 selected local** and **11 cleanup-safety** checks passed. One deliberate duplicate mobile MFA case is skipped; real desktop MFA passed. Durable staging report saved passed=true. Full current-source local suite: **428 passed**; separate security suite: **37 passed**. Subsets overlap and must not be added together.

Exact staging Worker `cc26c210-61d1-4e0c-8b19-76fb61b96493`; source SHA-256 `8ef93a2b2c6d4f01448fb9587d1f0867d685b8f397c597fb4fe0d15140df7c64`. Complete source read-back matched (659,818 characters); unauthenticated staging HTTP 401. Existing secret bindings/config/schedules were preserved. Actual signed browser save-clear-tab-storage-reload-resume passed on desktop/mobile, with exact metadata restored and test account draft restored/deleted in finally.

Published feature commits this continuation: `c52bd49` (multi-item inventory snapshots and atomic reservation), `2036172` (uncertain message delivery recovery/account-generation guards), `29d1d1b` (private account listing drafts/dependent-field restoration). Concurrent owner `6558c4b` filter persistence was preserved. Message-only run `40764271610` was superseded; the final combined run certifies the integrated source.

Remaining bounds: bundles currently offer up to five listings against one requested listing; changing selected inventory requires a new proposal, while counters change cash/notes. Photo snapshots preserve URL references, not archival image copies. Message retry IDs last for the current page/account session; full-page/offline recovery remains future work. Account drafts exclude photos. Private conversation attachments are still NEW, not enabled by this checkpoint.

Cleanup status read: zero bundle/draft rollback accounts, zero MFA factors or moderator grants for the old diagnostic probe, but one probe account remains. Its deletion connector call failed with `Invalid or expired requestState`; no deletion/revocation success is claimed and no privileged workaround was added. Existing leaked-password-protection warning remains. Production/main, real customers, payments/shipping purchases, billing and PR merge were not changed.

Eight-trunk estimate: no trunk is fully complete. Trunk 1 now has account drafts plus established listing/printing/photo baseline; structured quantities/lots and photo-draft persistence remain. Trunk 2 has strong text conversations, filtering and retry recovery; private images, pagination and durable offline recovery remain. Trunk 3 now has saved multi-item terms/atomic reservation; both-side baskets and item-changing counter revisions remain. Trunk 4's discovery and explicit opt-in collection MVP are preserved; inquiry lifecycle and matching expansion remain. Trunk 5 has current mobile/desktop coverage and touch controls; physical-device/PWA/keyboard certification remains. Trunk 6 has owner RLS, isolation, blocking and real MFA foundation; recovery/export/deletion/backup gates remain. Trunk 7 retains storefront/follow/collection-sharing baseline; vacation/analytics/referrals remain. Trunk 8 retains audited moderation foundation plus current reports; complete operator/support/dispute/enforcement workflows remain.

Next active branch: private conversation photos, beginning with non-public storage, participant authorization, upload bounds/content checks and failure-safe UI. No public listing bucket may be reused for private conversation files.

## Fourth resumed batch — private conversation photos

Trunks 2/5/6: existing conversations can share up to three JPEG/PNG/WebP source photos from the library or mobile camera. Previews stay in memory per account/thread until Send; unsupported/oversize files are rejected, and photos resize to JPEG at 1200px maximum. Photo-only messages get an explicit “Shared photos” caption. Failed uploads preserve the exact caption/photos/message ID, lock uncertain terms and offer Retry or Discard; retry read-back now compares attachment IDs as well as thread/body. Account changes revoke previews and clear private drafts. Thread navigation preserves them for the current page session.

New isolated private `conversation-photos` bucket, participant-only metadata/Storage RLS, restrictive direct-write denials and validating `message-photos` Edge Function (`verify_jwt=true`, explicit getUser verification) replace any public-upload path. Server decodes and re-encodes actual JPEG pixels without EXIF/comments/trailing content, caps streamed bytes/pixels/memory, and fixes hashes immutably across retries. Existing conversation, bilateral blocks, max three attachments and thirty upload attempts/rolling 24h are enforced server-side. Recipients cannot read unsent photos; the message insert atomically links only validated uploaded files. Delivered files cannot be canceled, substituted or attached to another message. Read access uses participant-authorized 60-second signed URLs; images are loaded explicitly rather than placed in discovery alerts.

Staging SQL role/transaction suite passed and rolled back all fixture accounts/messages/Storage metadata; it covers pending/uploaded/attached recipient boundaries, outsider denials, unvalidated direct uploads, foreign draft IDs, immutable retry content, cancellation, three-photo and daily limits, and privileged helper grants. Security suite: 43 passed, including real JPEG sanitation and endpoint boundaries. Targeted desktop/mobile inbox/photo suite: 82 passed. Full local and matching deployed buyer/seller verification are pending at publication. Added a live two-user photo exchange/retry/private-public-URL denial journey with exact dedicated-fixture cleanup; no customer storage paths can be selected by that cleanup.

Worker content source read-back matches exactly (670,397 characters), SHA-256 `dda0eebb3ee8f756cbb79f256b9f005cf45d37fe13113df550b2cd5ed16efae0`. Existing Worker secrets/config/schedules preserved. Edge Function version 1 deployed to isolated staging. Security advisor still shows only the earlier leaked-password-protection warning. Source assets now explicitly exclude the entire server-side Supabase directory.

Bounds: JPEG/PNG/WebP input only; no videos/HEIC, offline/page-reload photo draft persistence, automatic unsent-upload retention sweeper or media moderation queue yet. Abandoned pending objects remain inaccessible to recipients; existing per-user rate limits bound new uploads. Signed links can be used by a recipient until their short expiry. Image safety validation is not counterfeit/content moderation. This is staging-only, with no production, payment, shipping, billing or PR merge changes.

### Private photo matching verification

Photo code `e3d42d891d878314c633276f902df165aaef9637` is VERIFIED at [run 40770394971](https://github.com/bam5693/Deckplay-hq/actions/runs/40770394971): 54 real API, 53 deployed browser, 290 selected local, 6 photo-content/endpoint and 11 cleanup-safety checks passed. One intentional duplicate mobile MFA skip remains. Both desktop and mobile live photo exchanges, immutable retries, recipient signed-image retrieval and public-URL denials passed; durable report saved passed=true. Full local photo release: 434 passed. Separate security suite: 43 passed (overlapping). Exact Worker `a9de92ce-ea78-4e85-b414-503164c52d20` matched the source recorded above. Additional rollback-only bilateral-block upload coverage passed; a provider requestState error on the first cleanup-shaped test query was resolved by removing unnecessary explicit fixture deletion and leaving all generated rows inside the transaction rollback. The earlier diagnostic-account deletion remains blocked and was not bypassed.

## Fifth resumed batch — private seller overview

Trunks 7/1/5/6: an optional collapsed “Your seller overview” on the owner's profile shows active/reserved/sold/removed listing counts, active asking total, and price/trade proposals awaiting that seller's response. Seller-sent price/trade counters correctly wait on the counterpart. Aggregates run over complete owned records in one database snapshot, with no client row-limit truncation and no seller-ID input or other-collector totals. No tracking SDK, visitor data, paid analytics or payments are introduced.

The UI explicitly distinguishes asking value from earnings; buyer fees, tax and shipping are excluded, sold status is not payment/delivery verification, and deleted listings do not count. It loads on demand with refresh/retry and an Inbox shortcut. Account generations clear private aggregates and reject stale responses; navigating back or updating own listings refreshes an open overview.

Staging role/transaction suite passed: exact state-separated totals, account isolation, anonymous denial, incoming price/trade reply counts and seller-counter wait state. All generated fixtures rolled back. Targeted overview/profile/account desktop/mobile suite: 50 passed. Full integrated local: 440 passed. Existing security suite: 43 passed. Added a deployed owner journey checking active inventory then marked-sold counts/value with exact fixture cleanup; matching CI remains pending at publication.

Staging Worker content source matches (673,955 characters), SHA-256 `b383a7395e1da07e741182b87d64dfae911d3268f0601c4d8f8270ee59b91c61`. No production/main, customer data, checkout, shipping purchases, paid service/billing or PR merge changes.

## Sixth resumed batch — inbox network recovery and empty-state refresh

**Functional change:** A rejected or errored primary inbox fetch now shows an accessible **Retry inbox** action instead of leaving the collector on a dead-end error or indefinite “Loading inbox…” text. An empty inbox offers **Refresh inbox**. Retrying preserves the selected collector and existing unsent message draft; the existing account/request-version guards still reject stale responses. No SQL, real data or transaction changes.

**Staging commits:** targeted Jayden TCG draft-recovery Playwright regression `8c7333aa75156f33068441789df0eded8b1e142c`; customer-facing fix `70d946e6b8ab00452e7fd6a8afac4a3eddcd809b`. All five inline scripts parsed in local V8 preflight. The new Playwright test was syntax-checked but **not executed**. No additional GitHub Actions runs were initiated; both commits used `[skip ci]` to avoid unapproved minutes.

**Deployed verification:** isolated Worker version `0508a485-ae7a-4326-96a2-be5b5d4faa8e`, 100% traffic, deployed 2026-10-28 22:24:12 UTC. Complete served `/index.html` asset matched the committed staging-build transformation character-for-character (366,311 characters). All 18 Worker assets, three existing secret bindings, compatibility date and three cron schedules were preserved. Staging Supabase remained `ACTIVE_HEALTHY`. PR #2 remains draft/unmerged; production/main untouched.

**Pending:** authenticated deployed browser regression for retry and empty state, plus real staging API rerun. Last previously completed successful feature-bot run was [40773061595](https://github.com/bam5693/Deckplay-hq/actions/runs/40773061595); its results predate this change and must not be attributed to the new fix. Next: validate the retry flow with the existing synthetic Charles/Kyle and rotating Tanner/Jayden journeys, then improve older conversation history and mobile navigation without redundant test-only batches.


## Category coverage and listing-editor continuation

Merge repair `13473cc`, catalog/discovery `208ba4e` and guarded owner editor `4792e75` are published on staging. See [the complete category development handoff](2026-10-28-category-coverage-development.md) and [machine-readable matrix](category-coverage.json) for exact scope, evidence and unverified cells. Matching catalog run `40804649952` passed 54 API / 63 deployed / 312 selected local; editor full local passed 466 with a final overlapping 18-case catalog/editor subset. The editor matching run `40805535118` passed 55 API / 65 deployed / 320 selected local with one expected MFA skip. Additional authenticated database category coverage passed all 496 persona/combination journeys and rolled back all fixtures. Concurrent private-photo preparation fix/regression `954640d` / `08c2f90` was preserved and its 8 local photo checks passed. Retained synthetic inventory spans 124 canonical combinations; no unsupported categories or live commerce introduced.
