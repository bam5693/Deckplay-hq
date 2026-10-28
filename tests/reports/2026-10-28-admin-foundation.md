# Staging moderator authorization and audit foundation — 2026-10-28

Scope: only branch `test/staging-reporting`, draft PR #2, Supabase `prrrzeelltmyugssqnzk`, Worker `deckplay-hq-staging`. No production/main, real users, live transactions, billing or role bootstrap.

## Implemented

- Private `deckplay_admin` tables for explicit enabled moderator grants and audit events. Both have RLS, explicit client-deny policies and no client table privileges. No client can grant a role or edit audit records.
- Public RPC wrappers use invoker security. Narrow implementations in the non-public schema use fixed empty search paths and enforce identity, explicit live grant, signed JWT AAL2, matching live AAL2 session, session expiry and a verified factor belonging to that session/user. User-editable metadata does not authorize access.
- The report queue returns at most 100 ordered reports, omits reporter identity and records successful queue reads. It is a first bounded queue, not a complete searchable/paginated Command Center.
- Report review requires an 8–1,000-character reason and the displayed prior status. Row locking plus an expected-status check reject stale reviews. Status change and audit event commit atomically. Trusted SQL moderator grant changes are audited too. There is no browser role-management API.
- Review UI submits the reason/prior status and preserves existing session-clearing protections. Listing removal has no implemented RPC and is explicitly unavailable; review does not hide, ban or delete anything.
- Reporter INSERT policy now requires `status='open'`, closing crafted requests that previously could create reports already marked reviewed. Existing reporter ownership/privacy rules remain.

Applied staging migrations: `staging_moderation_access_audit_foundation` and `staging_explicit_admin_client_denial`. The consolidated reproducible SQL is `supabase/staging/moderation-foundation.sql`; it must never be automatically applied to production.

## Verification

- `tests/integration/moderation-foundation.sql` passed against staging inside a single transaction with generated synthetic users, a synthetic MFA session/factor, report and temporary moderator grant. It covers metadata spoofing, collector/anonymous denial, private table access/self-grant denial, initial report status, valid authorized review, mandatory reasons/status validation, stale decisions, audit records, revoked roles, password-only claims, expired/missing sessions and unverified factors. Every fixture/grant/audit event was rolled back; follow-up reads confirmed **zero** synthetic fixture users, lasting moderator grants and audit events.
- This SQL test simulates authenticated database claims; it is **not** certification of a real MFA enrollment/challenge, signed privileged JWT or operator session. No real account has been promoted.
- Ten targeted desktop/mobile moderation UI checks passed. Twenty-four combined search/moderation integration checks passed after preserving the concurrently published collector-description search. An initial local integration candidate had two search regressions; those were corrected before publishing. Full current-source regression result is recorded below when complete.
- All 33 existing security checks passed. Database advisor shows no new RLS/function warnings; the pre-existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains. No auth-plan setting or subscription was changed.
- Final combined-source local suite: **326 passed**, no failures, including preserved collector-description search, deck quantity validation and the reasoned review UI. This replaces the failed integration candidate; targeted subsets are not additive.
- Mobile screenshot reviewed using synthetic data: 412px viewport has no horizontal overflow, reason field fits, and action buttons are approximately 47px high. Physical Android/installed-PWA verification remains open.
- Expanded the existing real staging API suite to verify denial through the actual moderator RPCs (requiring SQL authorization errors, not missing-function failures) and rejection of reporter-supplied resolved status. Matching CI result remains pending until publication.

## Remaining gates / next priority

Trunks 6/8 have an implemented, database-verified authorization/audit foundation, not a completed admin product. Next: MFA enrollment/challenge and safe operator onboarding, owner-selected least-privilege access with an actual signed-session acceptance journey, queue pagination/filtering and protected audit visibility. Preserve default denial until those gates pass. Listing enforcement/evidence preservation, appeals, support tickets, monitoring/rollback and beta readiness remain unfinished. No moderator bootstrap, real report processing, listing removal, live checkout/shipping, production deployment or merge occurred.

## Staging publication checkpoint

Deployment `7ef9cb60bb69470ba100e0fb99286916`: full Worker source read-back matched the uploaded byte sequence (608,350 characters, within the returned multipart body). Existing three secret bindings, compatibility date and scheduled handler remained. Waited until the prior combined deck/search run's deployed browser step completed before changing the served build. Branch publication and matching real API/deployed CI are the remaining verification step at this checkpoint.

## Safe fallback and next acceptance gates

If this foundation must be disabled, deny EXECUTE on its three public moderator RPCs for `authenticated` and restore the previously verified staging Worker content. Preserve reports and audit tables; no DROP, data deletion or broad policy relaxation is needed. No role bootstrap exists to undo in this batch. This is a documented fallback, not a performed rollback/restore drill.

Next operator-setup acceptance must cover deliberate TOTP enrollment/challenge, account-switch/sign-out erasure of setup secrets and private UI, retry/error recovery, actual signed AAL1 denial/AAL2 acceptance and fresh-session/role revocation. Do not put TOTP secrets, recovery material or tokens in logs/artifacts. Choose an operator identity explicitly before granting a lasting role; do not infer authority from email, username or user metadata. Keep the queue inaccessible by default until this is verified. Support intake and listing enforcement follow this security gate.

## Final matching staging verification

**VERIFIED for this foundation batch** at code `616cc03d25e001d229de3311aca80b48455724de`, [run 40685434694](https://github.com/bam5693/Deckplay-hq/actions/runs/40685434694): **49 real staging API**, **48 deployed desktop/mobile**, **182 selected local** and **11 cleanup-safety** checks passed; workflow conclusion success. The selected local checks overlap the separately run 326-check full local suite; cleanup overlaps the 33-check security suite. Do not add overlapping subsets. Real API checks require authorization denial from existing moderator RPCs and reject reporter-selected resolved status. Private staging still returns HTTP 401 without access credentials. Production/main remain untouched and PR #2 remains draft/unmerged.

The broader operator setup, signed privileged MFA journey, listing enforcement, support and beta gates above remain unfinished. No lasting moderator grants were created. This is a staging foundation verification, not a trunk-completion percentage or production readiness certification.
