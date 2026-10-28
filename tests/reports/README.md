# Staging development checkpoints

Read the latest checkpoint first. Earlier reports remain historical evidence and can contain next-step lists that were completed by later batches. Passing counts describe separate local, API and deployed-browser layers, not complete certification of the roadmap.

| Order | Report | Scope |
|---|---|---|
| Latest | [Authenticator setup and access verification](2026-10-28-mfa-onboarding.md) | Deliberate TOTP setup, transient key privacy and signed-session test; lasting operator grants remain separate |
| Previous | [Moderator authorization and audit foundation](2026-10-28-admin-foundation.md) | Server role/MFA/session enforcement, reasoned review, private audits; operator onboarding remains unfinished |
| Previous | [Roadmap development, six staging batches](2026-10-28-roadmap-development.md) | Inbox Back, exact printing, account/report privacy, moderation UI, deck quantity checks; see per-build CI evidence |
| Previous | [Listing description formatting](2026-10-27-listing-description.md) | Readable generated descriptions; final served code `91df349` |
| Previous | [Price-offer recovery](2026-10-27-price-offer-recovery.md) | Duplicate send/response guards, exceptions, draft/account boundaries |
| Previous | [Cleanup safeguards](2026-10-27-cleanup-safety.md) | Exact synthetic markers, verified IDs/ownership, isolated transport |
| Historical | [Five development batches](2026-10-27-work-mode.md) | Inbox, profile, trade-picker and discovery fixes |

## Next priorities

1. Complete deliberate MFA enrollment/challenge and safe operator onboarding; verify actual signed-session acceptance before granting lasting admin access.
2. Extend the protected moderation queue, audit visibility, evidence/enforcement and support intake after the security gate passes.
3. Continue confirmed marketplace/inbox/trade reliability defects and physical Android/PWA verification. Explicit deck quantity consistency is implemented; game legality is not certified.
4. Verify email/reset delivery, backup/rollback, account deletion/export and remaining beta gates within the isolated test setup.
5. Private attachments and external collection inquiries require private authorization and opt-in/spam protections; neither is complete.

Payments and shipping remain disabled/preview-only. AI lead review of actual worker findings is not yet automatic. Four named testing personas share two disposable staging accounts; deterministic browser actions and model inference have separate verification boundaries.

## Development constraints

Only `test/staging-reporting`, draft PR #2, Supabase `prrrzeelltmyugssqnzk`, and the existing isolated staging Workers are authorized here. Never change production, main, real users/data, billing or paid plans. Keep the PR draft and unmerged.

Prefer non-destructive changes. Cleanup must target exact synthetic fixtures with verified IDs and safe WHERE conditions. Avoid DROP, TRUNCATE, unrestricted DELETE and trigger replacement. Explain any necessary destructive migration before requesting approval. If a database action blocks, continue independent safe GitHub development/testing.

Read current branch head and active runs before changes. Preserve other staging commits with expected-SHA leases. Deploy the exact matching private build before deployed tests and preserve Worker secrets/settings/schedules. Inspect actual results before updating the verified checkpoint. Avoid duplicate/superseded runs.
