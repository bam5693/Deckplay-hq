# DeckPlay HQ — private production backup setup (free-first)

**STATUS: NOT ACTIVE until the PRIVATE repository, secrets and first successful run are verified.**
This kit lives only on the isolated public source branch `ops/private-backup-automation`; its schedule is NOT active here. Never enable the production-backup workflow in the public `Deckplay-hq` repo.

## One-time owner setup (the GitHub connector cannot create private repos or set secrets)

1. In GitHub, create a **PRIVATE** repository at `bam5693/deckplay-hq-private-backups`. Initialize it with a README; leave it private and do not invite untrusted collaborators. No billing upgrade.
2. In its Settings → Secrets and variables → Actions, add exactly these repository secrets:
   - `DECKPLAY_PROD_DATABASE_URL`: **production** Supabase PostgreSQL 17 connection URL from the Dashboard → Connect, preferably the IPv4-compatible session pooler. Use the privileged Postgres credential and keep SSL required. Do not use the staging URL.
   - `DECKPLAY_PROD_SERVICE_ROLE_KEY`: **production** service-role key, needed to download both public and private Storage objects. Never use a publishable/anon key.
   - `DECKPLAY_BACKUP_PASSPHRASE`: a unique, random 32+ character secret. Save it separately in your password manager for disaster recovery; GitHub Secrets cannot show it to you later.
3. Copy `docs/backup/production-backup-private-repo.yml` from this branch into the **private** repo at `.github/workflows/production-backup.yml`. Replace `REPLACE_WITH_REVIEWED_SOURCE_SHA` with the exact reviewed commit SHA of this backup kit; do not use a mutable branch ref. The workflow refuses to run if its repo is public or incorrectly named.
4. In the private repository, choose Actions → DeckPlay production encrypted backup → Run workflow. Its schedule also runs at 08:37 UTC daily once the workflow is on the private repo's default branch.
5. Confirm **green job**, private encrypted Release assets (`.gpg` and matching `.sha256` only), upload/download byte equality and decrypted archive/database/Storage checksum verification. A failed run is NOT a backup.
6. Before a database migration, trigger a fresh manual run and verify its Release. Keep production deployment blocked until a separate real **isolated Supabase restore** including Auth users and Storage media is performed and verified with credentials/configuration and a rollback plan.

## What it backs up

- PostgreSQL 17 custom archive with `auth`, `public`, `private` and `storage` schemas (includes managed Auth data and private app tables).
- Exact object inventory from `storage.objects` and real bytes of each object, including nested paths in public and private buckets. Every object gets an SHA-256 digest and size in an encrypted manifest.
- The contents are packed into a GPG AES-256 integrity-protected archive, stored in a **private GitHub Release**, never a public code commit, Actions log or ordinary plaintext artifact. Plaintext files are deleted from the ephemeral runner at job end.
- Downloaded Release bytes are compared against the generated encrypted archive and independently decrypted/checked before success.

## Known recovery limitations

- This is a **logical** snapshot, not point-in-time recovery; writes during the multi-step database/Storage export can create version skew. Freeze uploads and writes around a pre-release backup for strict consistency, or use a stronger consistent backup mechanism as the site grows.
- Managed Supabase roles/role passwords, project-level Auth settings, provider keys, Edge Function secrets, Cloudflare settings, DNS, Storage policies tied to external config and actual encryption passphrase need a **separate restricted recovery inventory**. No credentials should be archived into public code.
- `pg_restore --list`, checksums and local archive decryption verify integrity, **not** that a complete Auth/Storage restoration works. Restore rehearsal requires a separate, freshly prepared isolated compatible target and written verification. **Never run a restore against production or shared staging without explicit approval.**
- This setup makes no database changes, public deployment, payments or billing changes.
- Default policy is **not to delete old backups automatically** before a proven restoration, because deleting the only usable recovery point is more dangerous than monitoring usage. Monitor private Release size and GitHub Actions minutes; apply a reviewed retention plan later. Individual GitHub Release assets have size limits and GitHub can change allowances.
- Free-first is an expectation at today's tiny volume, **not an unlimited $0 guarantee**; private Actions runtime and storage allowances are metered. Do not add a payment method or accept overages without owner approval.
- Use private repo notifications / GitHub Actions failure notification for errors; there is no standalone pager/SMS configured.

## Operator restore rehearsal (separate gate)

1. Download a private Release archive securely and verify the SHA-256 file.
2. From the pinned source repo root, run `DECKPLAY_BACKUP_PASSPHRASE=... bash scripts/private-backup/verify-encrypted.sh /secure/path/backup.tar.gz.gpg` from a trusted environment (don't put secrets into terminal history or chat; load using a local secret manager).
3. Use a **separate isolated Supabase project** with correct managed schemas/roles, recreate required settings/secrets, and restore an appropriate database snapshot using a reviewed migration/restore plan. Supabase-managed ownership/grants may require manual reconciliation; never blindly replay `--clean` against a live database.
4. Restore every Storage object in the manifest using proper bucket/permissions and verify SHA-256 of each, Auth sign-in tests, private RLS, listing images, Inbox and trade data. Record the exact restoration evidence and time taken.
5. Only then claim production rollback/recovery verification and authorize a coordinated release.
