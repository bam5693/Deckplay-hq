# Coordinated production release — October 29, 2026 (Central)

Application pin: `bec838936f1963617fd1124a85989bbeb4dae938` in draft PR #5.
Subsequent evidence-only commits do not change the application or migration.
**No production migration, merge or public deployment without explicit final owner approval.**

## Exact release

Includes the coordinated listings/photo editor, all catalog categories/search, Favorites,
collections/inquiries, drafts/follows/alerts, text Inbox/history/recovery, price offers and
withdrawal, bundle trades/counters/reservations, seller overview, mobile navigation and
moderator API/MFA/status safeguards. Reviewed additions: photo next/previous/counter and
keyboard-safe zoom/cleanup; immediate exact offer/trade conversation navigation with Back;
editable Inbox search with focus/caret preservation through slow refresh.

Private-message photos, live payments, purchased shipping and unfinished features remain
excluded. Newer staging startup/polling optimizations and checkout redesign were not
imported. PR #2 remains separate and unmerged. No new database dependency was added.

| Artifact | Exact value |
|---|---|
| Application code commit | `bec838936f1963617fd1124a85989bbeb4dae938` |
| Migration | `release/migrations/20261029214603_coordinated_production_compatibility.sql` |
| Migration SHA-256 | `680bf22505a9387204cf4f31a1468c1af1799eb3ec56aaea099dce532232609b` |
| Production asset-tree SHA-256 | `4936df988f30afef02091d258b4376d490fd7190f4d678d7c590207d79758da1` |
| Isolated preview asset-tree SHA-256 | `311dce5c99b38a3ba9ca23725f992b95b720ae12c85f83784b275eceecc7292b` |
| Public rollback Worker, rechecked at 100% | `d5ab84b6-baaa-4fc3-b8e5-8af8eb10d969` |
| Signed private preview Worker at 100% | `319eb125-398d-4be1-9aa5-a42c93295004` |
| Current main | `98dbde611b8f26063f0138588f49804232260ea7` |

Only the 20 assets in `release/assets.json` may ship. Never deploy the repository root,
backup archives, recovery outputs, reports or test fixtures.

## Executed evidence

[Candidate CI](https://github.com/bam5693/Deckplay-hq/actions/runs/40995201410) passed its
scoped browser/security/build checks and native PostgreSQL migration/concurrency/recovery
rehearsal. [Signed private preview](https://github.com/bam5693/Deckplay-hq/actions/runs/40995463656)
passed six real desktop/emulated-mobile listing/upload/search/Favorites/Inbox/price/bundle
journeys, anonymous 401, signed 200 and pinned homepage verification. The existing staging
service access gate is retained; preview contains no production database reference.

Local: 24 focused UI cases, 16 follow-up cases including slow-refresh caret preservation,
270 broader integration UI cases and 86 security/recovery checks passed. Counts overlap.
Physical Android/PWA behavior is not certified by these emulations.

**Actual full production backup restored**, preserving ownership/ACLs in network-isolated
Supabase PostgreSQL. All 61 Auth/application/Storage tables match current production
counts and complete-row fingerprints. Application functions, table owners/grants/RLS,
all 63 policies and noninternal triggers match. The reusable recovery script was exercised
against the same real archive and produced the same fingerprints.

**Pinned migration passed on a separate clone of actual recovered customer data**, executed
as the non-superuser postgres role. All original fields/counts across all 61 tables were
unchanged; schema/RPC/RLS contract returned zero mismatches. Authenticated outsider reads
returned zero Favorites, messages, price offers and trades. No synthetic customer records
were inserted into that recovered dataset.

All four actual archived Storage objects match fresh live-download SHA-256, metadata size
and MIME type. A fresh private byte archive with per-object checksum manifest was created.
Actual backups were not uploaded to GitHub or CI.

[Full actual-recovery evidence and dependencies](ACTUAL-RECOVERY-EVIDENCE.md) records private
artifact names, checksums, restore repairs and precise limitations without customer contents
or credentials.

## Remaining gates

- Fresh production database dump requires secure connection access in the resumed Codespace.
  The existing full dump matches live data at this checkpoint but is not a new dump.
- Verify complete-package encryption/decryption and a second independent full copy. The
  newly created Storage archive is filesystem-protected, not yet passphrase-encrypted.
- Recover running Auth/sign-in/MFA and external provider configuration; rehearse Storage
  service re-upload/readback/permissions. SQL/row/byte equality alone does not prove these.
- Recheck freshness/schema drift before explicit final owner approval.

`release/gates.json` remains closed: no approved application tree, production schema is
intentionally unmodified/unverified, and managed-service/fresh-backup blockers remain.
Actual SQL restore and migration-rehearsal flags do not replace those requirements.

## Approved execution sequence — only after all recovery gates

1. Recheck final PR head/main, production data/schema, fresh backup and public rollback.
2. Obtain explicit owner approval covering the exact final application/evidence commit,
   migration SHA-256, PR #5 merge and public Worker publication. A changed application or
   migration requires new validation and reconciled approval. This document is not approval.
3. Apply only the pinned production-specific migration once through the controlled mechanism.
   Keep its atomic transaction and timeouts. Never replay staging history/bootstrap or run
   unrestricted db push. On failure stop and diagnose; do not blindly retry partial SQL.
4. Require zero rows from the production read-only `release/schema-contract.sql`, verify
   grants/triggers and record migration identity/hash. Populate the independent publication
   receipt from actual production evidence, not the isolated rehearsal.
5. Under that approval, merge only PR #5, record resulting main SHA and publish the exact
   approved source with deploy.yml and its full approved_sha. Publication preflight and
   all gates must pass; never merge PR #2 wholesale or deploy a moving staging branch.
6. Verify public assets/bindings read-only. Production transaction checks require approved
   controlled beta accounts; do not change existing customer records as a smoke test.

## Rollback

Pre-COMMIT migration failure aborts atomically; leave the public Worker unchanged.
Frontend rollback uses the reverified prior public Worker while compatible additive schema
changes remain. Never erase accepted offers, reservations, messages or later writes to
roll back UI. A destructive production restore requires separate explicit approval and a
plan to preserve/reconcile all writes since the backup; restore into isolation first.
