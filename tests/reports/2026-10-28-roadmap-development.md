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
