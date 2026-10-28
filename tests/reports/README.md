# Staging development checkpoints

Read the latest checkpoint first. Earlier reports remain historical evidence and can contain next-step lists that were completed by later batches. Passing counts describe separate local, API and deployed-browser layers, not complete certification of the roadmap.

| Order | Report | Scope |
|---|---|---|
| Latest | [Moderator authorization and audit foundation](2026-10-28-admin-foundation.md) | Server role/MFA/session enforcement, reasoned review, private audits; operator onboarding remains unfinished |
| Previous | [Roadmap development, six staging batches](2026-10-28-roadmap-development.md) | Inbox Back, exact printing, account/report privacy, moderation UI, deck quantity checks; see per-build CI evidence |
| Previous | [Listing description formatting](2026-10-27-listing-description.md) | Readable generated descriptions; final served code `91df349` |
| Previous | [Price-offer recovery](2026-10-27-price-offer-recovery.md) | Duplicate send/response guards, exceptions, draft/account boundaries |
| Previous | [Cleanup safeguards](2026-10-27-cleanup-safety.md) | Exact synthetic markers, verified IDs/ownership, isolated transport |
| Historical | [Five development batches](2026-10-27-work-mode.md) | Inbox, profile, trade-picker and discovery fixes |

## Next priorities

1. Continue asynchronous listing-publication and upload/account boundary coverage; inspect requests that read form fields or currentUser after awaiting service calls.
2. Extend remaining inbox/trade response error recovery, unread-state and keyboard accessibility coverage.
3. Define and test deck quantity consistency and game-specific decklist rules before claiming legality validation.
4. Evaluate collection/missing-card workflows and remaining moderation/fulfillment authorization.
5. Verify real email/reset and full upload lifecycle behavior within an explicitly isolated test setup.

Payments and shipping remain disabled/preview-only. AI lead review of actual worker findings is not yet automatic. Four named testing personas share two disposable staging accounts; deterministic browser actions and model inference have separate verification boundaries.

## Development constraints

Only `test/staging-reporting`, draft PR #2, Supabase `prrrzeelltmyugssqnzk`, and the existing isolated staging Workers are authorized here. Never change production, main, real users/data, billing or paid plans. Keep the PR draft and unmerged.

Prefer non-destructive changes. Cleanup must target exact synthetic fixtures with verified IDs and safe WHERE conditions. Avoid DROP, TRUNCATE, unrestricted DELETE and trigger replacement. Explain any necessary destructive migration before requesting approval. If a database action blocks, continue independent safe GitHub development/testing.

Read current branch head and active runs before changes. Preserve other staging commits with expected-SHA leases. Deploy the exact matching private build before deployed tests and preserve Worker secrets/settings/schedules. Inspect actual results before updating the verified checkpoint. Avoid duplicate/superseded runs.
