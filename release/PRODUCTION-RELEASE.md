# Coordinated release execution plan — 29 October 2026

Engineering candidate: `e9b0bbd405fa64caae20478584d4d181a3aefa58` in draft PR #5.
**Do not migrate, merge, or publish yet. Actual production backup/recovery remains unverified.**
Main/public Worker/live customer data have not been changed in this preparation.

## Validated scope

The existing coordinated marketplace assets are unchanged: listings and photo editing,
all catalog categories and search, Favorites, profile/collection links and inquiries,
drafts, follows/discovery alerts, Inbox text/history/recovery, price offers and buyer
withdrawal, bundle trades/counters/reservations, seller overview, mobile navigation,
and moderator API compatibility/MFA/status-conflict safeguards.
Private conversation photos remain disabled. Payments, purchased shipping, unfinished
portfolio/growth/support features remain excluded. Desktop Chrome and emulated Pixel 7
were tested; physical Android keyboard/PWA behavior is not certified by these runs.

One production-specific migration supplies the six existing-table columns, two public
tables (six more required columns), private inquiry history, missing RPC implementations,
and the new four-argument moderation overload. The old moderation signature and existing
moderator roles remain. Conflicting transaction triggers are replaced with validated
inventory guards; message/deal/signup guards and production Favorites remain intact.
No historical snapshots are fabricated, no profile nullability is tightened, and no
existing customer rows are backfilled. New collection inquiries default to off.

## Pinned artifacts and evidence

| Artifact | Exact value |
|---|---|
| Candidate code commit | `e9b0bbd405fa64caae20478584d4d181a3aefa58` |
| Migration | `release/migrations/20261029214603_coordinated_production_compatibility.sql` |
| Migration SHA-256 | `680bf22505a9387204cf4f31a1468c1af1799eb3ec56aaea099dce532232609b` |
| Production asset-tree SHA-256 | `90bfb4bf6c301b0168ab752ad748a7eefc5546a53b1f8cd38c6e4200b62801dc` |
| Tested preview asset-tree SHA-256 | `9f3d3fb48f384549475208967dac01f09aff723e8883cb0b5afd339418b094fb` |
| Production-shaped schema snapshot SHA-256 | `d0fb6297db45ca532fef7feb11cd60c28db7b35b724a2c38cea6bd6cf7ace83d` |
| Read-only production function fingerprint, before/after | `ba2ac01b885c76493fe8d6e2816949d3` |
| Public rollback Worker version, rechecked | `d5ab84b6-baaa-4fc3-b8e5-8af8eb10d969` at 100% |

- [PostgreSQL 17.11 migration, transaction and recovery rehearsal](https://github.com/bam5693/Deckplay-hq/actions/runs/40962139762): passed. Real separate PostgreSQL sessions, no hosted customer fixtures.
- [Signed private preview desktop/mobile acceptance](https://github.com/bam5693/Deckplay-hq/actions/runs/40961637983): 6/6 passed, including actual uploads, listing/stale edits, search, Favorites, messages, price acceptance and bundle cash counter acceptance. Anonymous access 401; signed access 200; homepage bytes matched the pinned source. Synthetic cleanup readback: zero rows for the run window.
- Production-shaped acceptance: zero schema/RPC/RLS contract mismatches; legacy-field/Favorites fingerprints unchanged; nullable profile preserved; guarded old-frontend trade cancellation works; outsider private reads denied; existing moderator role/MFA/CAS/audit checks pass. 496 category journeys/124 combinations, 42 price actions, 28 category trade lifecycle scenarios, bundle inventory, 51 timestamp-tied negotiation events, Inbox paging, drafts, collection sharing, seller overview and editor checks passed. These groups overlap.
- Forced failure before migration COMMIT left the pre-migration schema unchanged.
- The actual private backup and local restore scripts executed on the synthetic migrated database, then schema/RPC/RLS/data/Favorites checks passed in the second database. Checksums and extension prerequisites were included. This is a procedure rehearsal, **not an actual production backup**.
- Local focused UI regressions: 36/36 passed. Node security/recovery: 86/86 passed.

The production application tables/functions/constraints/indexes/policies/grants/triggers
were reconstructed from read-only catalogs. Auth tables are minimal synthetic fixtures;
this does not certify restoration of the full managed Supabase Auth/Storage system.
No production rows or passwords are in the schema fixture or CI artifacts.

## External gate: actual private production recovery

A privileged PostgreSQL connection or privately downloadable production backup is absent
from this environment. The connected Supabase tools expose neither backup download nor
restore. Do not paste a database password or connection string into chat or commit it.

On a trusted machine with PostgreSQL 17 client tools, use the production connection in
`DATABASE_URL` and run `bash scripts/backup-production-private.sh /secure/private-path`.
This reads production; it does not migrate it. Retain the complete archive, checksum,
prerequisite SQL and restore list privately. Never run a real production backup in CI.

Prepare an empty local recovery database with compatible Supabase managed roles and
extension versions. Set its URL in `RECOVERY_DATABASE_URL` and run
`bash scripts/restore-production-private-local.sh /secure/private-path/<archive>.dump`.
The restore script refuses hosted destinations and populated targets. It preserves ACLs;
missing managed roles/extensions must cause a stop, not be suppressed. For a real project,
verify real table counts/fingerprints and Auth dependencies privately, using isolated
credentials and disabled outbound email/webhooks. Do not run synthetic insertion tests
against restored customer records. An auth-table count alone does not establish that
actual sign-in and MFA recovery work.

Database dumps contain Storage metadata, not object bytes. Independently preserve and
verify listing/avatar object bytes and required Auth/SMTP/Turnstile/Edge Function settings.
A full production recovery rehearsal must cover these dependencies before recommending
migration. No paid Supabase branch/project or billing change is required by this plan.

## One coordinated release, after recovery is verified

1. Recheck main, PR #5, production catalogs, current Worker version and backup freshness.
   Resolve any drift before choosing the final full commit. Retain the verified prior
   Worker version and private backup. Never replay staging bootstrap or its migration history.
2. Record the recovery evidence and final gate receipt in PR #5; present the final pinned
   release commit, exact migration hash, included/excluded scope and rollback evidence
   for the owner's explicit approval. No approval is being requested while recovery is blocked.
3. Following that approval, apply **only** the pinned SQL above to production once through
   the controlled migration mechanism. It has BEGIN/COMMIT, a five-second lock timeout
   and a 60-second statement timeout. If it fails, stop and diagnose; do not run a second
   partial script or blindly retry. Record its migration identity and hash in the independent
   production history. Do not run `supabase db push` over the staging migration directory.
4. Run `release/schema-contract.sql` read-only against production and require zero rows;
   verify function grants and transaction triggers against the tested post-migration state.
   Populate the publication receipt from that evidence. The checked-in publication gate
   currently remains closed. Evidence/receipt-only changes must be identified explicitly;
   any application or migration change requires new focused testing and a new approved pin.
5. Merge PR #5 only under the explicit approval, record the full resulting main commit,
   and publish that exact approved source using `.github/workflows/deploy.yml` with the
   required full `approved_sha`. Only the 20 allowlisted assets in `dist-release` may ship.
   The workflow and `scripts/release-preflight.cjs --publish` must pass. Never bypass a
   failing gate, merge PR #2, deploy a moving staging branch, or deploy the repository root.
6. Perform read-only public page/asset/binding checks immediately. Production transaction
   checks require the approved controlled beta accounts/scope; do not insert synthetic
   customers or change existing customer records as an unapproved smoke test.

The owner approval must cover the migration hash, merge of PR #5, exact publication pin
and public Worker deployment as one release. A changed commit must be reconciled with
that approval before deployment; this plan does not grant future publication permission.

## Rollback and failure handling

- Migration failure before COMMIT: aborts atomically. Leave the public Worker as-is;
  diagnose locks/schema drift with read-only checks. Atomic rollback was exercised.
- Frontend failure after publication: restore recorded Worker version
  `d5ab84b6-baaa-4fc3-b8e5-8af8eb10d969` at 100%, after confirming it is still the correct
  baseline. Compatible additive columns/tables remain. Existing Favorites and legacy
  trade cancellation were verified against the reconciled backend.
- Accepted offers/reservations and new messages are real business data. A frontend
  rollback must not delete them, drop the new columns, or rewind production to an old dump.
- Backend incident: pause affected actions using the approved incident mechanism, preserve
  post-release data and investigate. Restore a backup into an isolated recovery target
  first. Any destructive production restore requires a separate explicit decision and a
  plan to preserve/reconcile writes since the backup. A Worker rollback is not DB recovery.
