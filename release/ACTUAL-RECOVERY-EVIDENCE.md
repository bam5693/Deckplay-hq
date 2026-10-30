# Actual production recovery and release preparation — October 29, 2026 (Central)

Application candidate: `bec838936f1963617fd1124a85989bbeb4dae938`.
This document contains only procedures and aggregate verification evidence. Archives,
object names, customer records, connection strings and credentials remain private.
**No production migration, main merge or public deployment is authorized.**

## Recovered work, not a replacement rehearsal

Reused Codespace `lifeless-corpse-6vwqg5wqpp74c579g` and its existing
`/workspaces/Deckplay-hq/private-backups/` directory (mode 0700).

- Original `deckplay-production.dump` remains present and fully decodes with PostgreSQL 17.
  It is not the complete recovery package: its earlier schema-filtered/no-ACL creation
  omitted dependencies and separate object bytes.
- Existing `deckplay-production-2026-10-29-full.dump` fully decodes and restored atomically
  with ownership and ACLs, without `--no-owner`, `--no-acl`, ignored errors or `--clean`.
  SHA-256: `8a94b7ba9979e3ed5f6627523a8aa3868e38fb30ff81db71f152766b743f2afe`.
- Existing encrypted database and Storage copies remain present. Current checksums were
  recorded privately. A newly generated checksum is a current integrity baseline, not
  evidence that an old encrypted copy decrypts or that a second device holds the full package.

## Restore failure repaired and exercised

Reused `deckplay-supabase-restore-test` (`supabase/postgres:17.6.1.064`). Its existing
`supabase_admin` account is a superuser; its `postgres` account is not. The earlier
`log_min_messages` failure was therefore a restore-role mismatch. A new database created
from `template0` avoids collisions with the image's preinstalled Auth schema.

The older image also lacked `supabase_realtime_admin`. The recovery-only role was created
with the verified production attributes: NOINHERIT, NOLOGIN, no superuser, BYPASSRLS,
replication, role-creation or database-creation privilege. No production role was changed.

The container has no attached Docker networks and no published ports. Auth, email and
Storage service processes were not started. No customer credentials or records were used
to send messages, authenticate externally or perform synthetic marketplace transactions.

Actual archive restore passed into `deckplay_recovery_20261030`. The checked-in
`scripts/restore-supabase-private-container.sh` was also executed successfully against the
same real archive, creating `deckplay_recovery_20261030_script`. The script refuses CI,
non-recovery container/database names, non-Supabase images, attached networks and published
ports; it never drops an existing database. Both restores used atomic, fail-fast pg_restore.

## Data and security verification

Read-only live production and recovered database comparisons agreed across all 61 tables
in Auth, public application, private/admin and Storage schemas. Sorted complete-row hashes
and row counts cover accounts/identities/password hashes/sessions, listings, Favorites,
messages, offers, trades and Storage metadata without exposing their contents. The checked-in helper restore produced the same complete fingerprint.

Aggregate full-data fingerprint: `5172250aa4b940e57e59c401e0f625d7`.
Application/Storage fingerprint: `e806a4a06610ea804af5bd2a8ba7f15d`.
These MD5 values are equality checks; archive integrity uses SHA-256.

Additional production/recovery comparisons passed:

| Catalog | Matching fingerprint |
|---|---|
| Application functions | `216b486b5fcacf4941bd8a34e14b15ad` |
| Table owners, normalized grants and RLS flags | `adc5c6125a72bbbd23e094a5f0d52e3d` |
| All 63 RLS policy definitions | `519815a5158615c799c421b55a18b7c2` |
| Noninternal application/Auth/Storage triggers | `3ec2f8979592d043a67c1f9eb6a84e2a` |

Policy comparison explicitly set `search_path=public,extensions`; the image administrator's
default Auth search path otherwise deparses `auth.uid()` as `uid()`. Grant comparison sorts
role names/privileges rather than cluster-specific role OIDs or ACL array order.

An authenticated outsider UUID in a read-only transaction saw zero rows in Favorites,
messages, price offers and trade offers on the migrated recovery copy; the transaction
was rolled back. No customer record was modified.

## Release migration on actual recovered data

Cloned the recovered database into `deckplay_release_recovery_20261030`; preserved the
unmigrated original. Matched production's database owner (`postgres`) on this local clone.
This corrects the template-created database privilege mismatch rather than granting new
production privileges.

Executed the unchanged migration as the non-superuser `postgres` role:
`release/migrations/20261029214603_coordinated_production_compatibility.sql`.
SHA-256: `680bf22505a9387204cf4f31a1468c1af1799eb3ec56aaea099dce532232609b`.

Migration exit status: 0. Read-only release schema/RPC/RLS contract: zero mismatches.
Before/after fingerprints explicitly projected the original columns of every original
table; all 61 tables retained identical counts and original values. New nullable/defaulted
fields therefore cannot hide changes to historical records. No synthetic canary data was
inserted into the customer-data clone.

## Storage bytes

The existing Storage tar has exactly four regular object files, no path traversal or
symlink/hardlink members. Its complete object set matches recovered/live Storage metadata.
All four bytestrings were downloaded again from the two already-public production buckets,
and SHA-256, size and MIME type match the old archive and metadata. No service-role key was
needed or obtained, and no bucket visibility changed.

Created fresh private `deckplay-storage-20261030T025140Z.tar.gz` (October 29, 9:51:40 PM Central)
with all four objects and a per-object SHA-256/size/MIME manifest.
Archive SHA-256: `c7e366c9b403fdf2c3a2d29b3f6538d0c5388dfb8946c5a109fa346219449236`.
This fresh copy is protected by filesystem permissions; it has not been encrypted with
the owner's unavailable passphrase or copied to a second independent device.

Storage service re-upload and signed/private permission behavior have not been rehearsed.
Database metadata and byte equality do not by themselves certify a running Storage service.

## Reviewed release additions

Retains the coordinated listings/search/Favorites/collections/drafts/follows/Inbox/price
offer/bundle-trade/seller-overview/mobile/moderation candidate. Adds only these reviewed
staging fixes: listing photo next/previous controls and counter, keyboard-safe zoom and
overlay cleanup; immediate exact offer/trade conversation navigation with Back behavior;
editable Inbox search whose focus/caret survive slow refresh. No new database dependencies.

Excluded newer staging startup/polling optimizations and checkout-preview redesign pending
separate review. Payments, purchased shipping, private-message photos and unfinished roadmap
features remain excluded. PR #2 is not merged wholesale.

Local verification: 24 focused desktop/mobile cases; 16 follow-up cases including the new
slow-refresh/caret regression; 270 broader integration UI cases; 86 Node security/recovery
checks. Counts overlap. No physical Android/PWA certification is claimed.
Allowlist: 20 assets. Production asset-tree SHA-256:
`4936df988f30afef02091d258b4376d490fd7190f4d678d7c590207d79758da1`.
Preview asset-tree SHA-256:
`311dce5c99b38a3ba9ca23725f992b95b720ae12c85f83784b275eceecc7292b`.

[Exact candidate CI](https://github.com/bam5693/Deckplay-hq/actions/runs/40995201410) passed,
including native PostgreSQL migration/concurrency/recovery rehearsals and scoped browser,
security and asset checks. Real customer backups were never uploaded to CI.

[Signed pinned preview acceptance](https://github.com/bam5693/Deckplay-hq/actions/runs/40995463656)
passed all six desktop/emulated-mobile listing, search, Favorites, Inbox, price and bundle
trade journeys. Its cheap boundary smoke verified anonymous 401, signed 200 and pinned
homepage bytes. Preview Worker version `319eb125-398d-4be1-9aa5-a42c93295004` is at 100%,
retaining the existing STAGING_GATE service binding. No production routes were changed.

## Remaining gates and minimum next access

1. Fresh production database dump remains blocked: the resumed terminal has no production
   connection/password or service-role environment, and no existing pgpass was found at
   the checked standard/task paths. Connected SQL tools cannot run pg_dump or supply a
   privileged client connection. Securely enter the current production PostgreSQL connection
   URI in the recovered Codespace's hidden terminal prompt; never paste it into chat.
   The existing full dump matches production data at this checkpoint but is not a fresh dump.
2. Verify encryption/decryption of the complete package with the owner's passphrase and
   retain a second independently accessible encrypted copy. The phone copy is only known
   to contain the earlier original archive.
3. Preserve/recover managed Auth configuration and exercise local sign-in appropriately.
   Password-hash/session table equality is proven; running Auth/signing/MFA recovery is not.
   Record Auth image/schema compatibility, JWT/signing keys and rotation plan, site/redirect
   URLs, OAuth/provider settings/secrets, SMTP credentials/templates, hooks and CAPTCHA keys
   privately. Preserve any Auth/MFA/Vault encryption keys through the provider-supported
   process. Current MFA-factor tables are empty; no enrolled factor was available to test.
   Do not reset customer passwords/factors or send real reset emails as a rehearsal.
4. Restore Storage into an isolated service, prove upload/readback/permissions and verify
   the complete key set against the byte manifest. Preserve bucket settings/policies/owners
   and object metadata. Public-byte GET verification is not upload recovery.
5. Preserve managed role attributes/memberships, database-level grants, extensions and
   provider-owned schemas outside the app dump assumptions. Live production database is
   owned by postgres. Do not overwrite managed provider roles/schemas on a hosted project
   using a raw local full restore. The older local image is a verified SQL recovery target,
   not a full matching managed-service deployment.
6. Preserve Cloudflare bindings, routes and deployment baseline; Turnstile configuration;
   Supabase service secrets/webhooks and Edge Function source/configuration. Production
   `send-collector-notification` is active version 3 with JWT verification; its service
   secrets are not included in pg_dump and were not retrieved into this report.
7. Recheck freshness/schema drift and obtain explicit owner approval for the final exact
   application commit, the migration hash, merge of PR #5 and public Worker deployment.
   Production contract is deliberately not marked satisfied before the authorized migration.

Public rollback version was rechecked at 100%:
`d5ab84b6-baaa-4fc3-b8e5-8af8eb10d969`. Main remains
`98dbde611b8f26063f0138588f49804232260ea7`. A frontend rollback must not erase post-release
messages, accepted offers or other new writes. Any destructive production restore requires
separate explicit approval and preservation/reconciliation of writes since the backup.
