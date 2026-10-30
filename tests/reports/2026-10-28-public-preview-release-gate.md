# DeckPlay HQ public preview release gate — 2026-10-28

Status: BLOCKED pending database compatibility and release validation. This file is a release handoff, not authorization to merge the draft PR or deploy production.

## Verified
- Production Worker: `deckplay-hq`; staging Worker: `deckplay-hq-staging`.
- `main` push automatically triggers production Cloudflare Worker deploy via `.github/workflows/deploy.yml`.
- Production Supabase: `yffruutknztvdyioovmp`; staging Supabase: `prrrzeelltmyugssqnzk`.
- Staging `index.html` in Git references production Supabase URL/key; staging deployment may transform it. Verify exact deployed asset and build transform before release.
- Production currently has 8 profiles and 2 listings; staging has 3 profiles and 357 listings. Never copy staging fixture data into production.
- Production lacks staging-only `listing_drafts`, `seller_follows`, and `message_photo_attachments` tables. Staging adds `collector_messages.attachment_ids`, `profiles.collection_links` and `profiles.collection_inquiry_mode`, and `trade_offers.offered_listing_ids`, `item_snapshots`, `initial_terms`.
- Staging and production migration histories diverge. Do NOT replay staging bootstrap migrations onto production.
- PR #2 is draft and must remain unmerged for ongoing development.

## Required release work
1. Audit all current staging-only SQL migrations for dependencies, RLS, functions, storage buckets and policies. Build a new additive, production-specific migration rather than copying staging bootstrap schema.
2. Back up production database and capture current Worker deployment/version, source commit and rollback instructions; verify restore feasibility.
3. Apply reviewed, non-destructive migration to a disposable clone first; test existing accounts and new features with a safe production-like data fixture.
4. Verify anonymous/authenticated access, cross-account isolation, listing drafts, seller follows, photo privacy, collection inquiry opt-in, multi-item trades, inbox, moderation, and no live payment processing.
5. Freeze an exact tested release commit; ensure frontend points to production Supabase and never ships staging credentials, fixtures, or private gating.
6. Verify production deploy workflow tests, then explicitly authorize a controlled production deployment and post-deploy smoke tests. Roll back if any critical journey fails.
7. Continue normal feature development on the staging branch; do not merge draft PR #2 wholesale.

Owner context: public-site listings and messages are disposable friend testing; retain account identities unless separately approved.
