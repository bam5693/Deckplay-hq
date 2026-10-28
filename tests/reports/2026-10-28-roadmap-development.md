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
