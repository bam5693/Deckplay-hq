# DeckPlay HQ production-preview schema reconciliation — 2026-10-29

## Verified live state
- Production Supabase: yffruutknztvdyioovmp; staging: prrrzeelltmyugssqnzk.
- The two environments have **independent bootstrap/migration histories**. Never replay the staging bootstrap or merge its migration history into production.
- Production has applied `restrict_public_moderation_rpc_execute` and `restrict_demo_order_rpc_to_authenticated`; post-change SQL and security advisor confirm zero anonymous SECURITY DEFINER RPC warnings.
- Production has existing signed-in accounts. Preserve auth.users and profiles; do not copy staging fixtures.
- Browser checks for earlier release head 36b6d029 passed; subsequent commits require fresh verification.

## Exact verified missing production schema
Tables absent: `public.listing_drafts`, `public.seller_follows`, `public.message_photo_attachments`.
Columns absent (rechecked against both databases; staging types/defaults confirmed):
- `profiles.collection_links jsonb NOT NULL DEFAULT '[]'::jsonb`
- `profiles.collection_inquiry_mode text NOT NULL DEFAULT 'off'`
- `collector_messages.attachment_ids uuid[] NOT NULL DEFAULT '{}'::uuid[]` (confirmed staging `udt_name=_uuid`)
- `trade_offers.offered_listing_ids uuid[] NOT NULL DEFAULT '{}'::uuid[]` (confirmed staging `udt_name=_uuid`)
- `trade_offers.item_snapshots jsonb NOT NULL DEFAULT '[]'::jsonb`
- `trade_offers.initial_terms jsonb NOT NULL DEFAULT '{}'::jsonb`

Production existing `profiles.display_name` is nullable while staging is not; DO NOT change existing production nullability without backfill.
Production `trade_offers.offer_note` and `cash_direction` are NOT NULL while staging allows NULL. Check actual frontend writes and existing CHECK constraints before release.
Staging `staging_test_runs` and fixture cleanup RPCs are **not** production features and must not be migrated.

## Security and release gate
- For each new table, capture exact PK/FK/default/check constraints, indexes, RLS policies, grants and triggers from staging.
- For collection inquiries, private photos and seller analytics, review RPC definitions and security-definer authorization, storage buckets/policies and file size/type checks.
- Audit existing production notification and offer reservation triggers before adding new ones; avoid replacing production logic with staging bootstrap definitions.
- Generate an additive, production-specific SQL migration; test on an isolated clone containing production schema and synthetic accounts; verify all new workflows.
- Verify a restorable production backup and Worker rollback version; current available Supabase connector exposes **no backup listing/restore endpoint**. Do not claim backup verified.
- Audit frontend Supabase project binding: staging source contains production URL, staging deployment may transform it. Release must bind explicitly to production without exposing secret keys.
- Run latest GitHub checks, deploy a pinned release commit only after gates, then smoke-test sign-in, listing creation, drafts, inbox/photos, trades, follows, collection links, moderation and demo orders. Keep payments disabled.

## Unresolved nonblocking security advisories
- Three RLS-enabled internal tables intentionally have no direct client policies; verify intended server-only access.
- Eleven authenticated SECURITY DEFINER RPCs warrant function-level authorization review.
- Supabase leaked-password protection remains flagged; review Auth configuration separately.

## Verified RPC gap (live catalog comparison)
- Production currently has **none** of these staging RPC entry points: `public.send_collection_inquiry`, `public.respond_trade_offer`, `public.get_my_seller_overview`; corresponding private implementations also absent.
- Staging `private.respond_trade_offer` depends on `private.trade_inventory_ids`, trade counteroffers, price offers and trade/listing locks; do not port the wrapper alone.
- Staging `private.send_collection_inquiry` depends on `private.collection_inquiries`, user blocks, profile collection preferences and collector messages; preserves opt-in and rate limiting.
- Staging `private.seller_overview` reads listings, price offers, trade offers and trade counteroffers. Its wrapper alone would fail without the private implementation.
- Staging additionally exposes private-photo validation/claim RPCs and trade counteroffer RPCs; each requires a separate dependency and authorization audit. Exclude staging-only fixture functions.
- Do not apply these RPCs to production until their dependencies, grants and ownership checks have been verified together.
