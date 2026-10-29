# DeckPlay HQ public preview: private photos and release verification (2026-10-29)

## Verified staging-only storage
- `conversation-photos` is PRIVATE, JPEG only, maximum 2,097,152 bytes.
- Production lacks this bucket. Production's existing public `listing-images` and `profile-avatars` must not be reused for private conversations.
- Staging has storage read policy `private_chat_photo_reads` requiring `deckplay_chat.can_read_photo(name)`; direct insert/update/delete policies are restrictive.
- Staging photo RPCs `prepare_private_message_photo`, `claim_validated_private_photo`, `finish_validated_private_photo`, `cancel_unpublished_private_photo` exist as SECURITY INVOKER.
- Port authorization helper, exact grants, private storage policies, attachment table and lifecycle RPCs as one unit. Do not create an open-access bucket.

## Production compatibility work already validated in rollback transactions
- Six additive columns in `profiles`, `trade_offers`, `collector_messages`.
- New owner-private `listing_drafts` and `seller_follows` tables with seven RLS policies.
- No production feature migration or private photo bucket applied yet.

## GitHub checks for latest branch commit
- `Prepare staging assets` run 40814378542: passed.
- `DeckPlay browser tests` run 40814378483: in progress when inspected; setup, fixture cleanup boundary and browser installation passed. Do not claim browser pass until complete.

## Release blockers
- Verified restorable production backup and Worker rollback version.
- Production-specific migration covering new tables, columns, constraints, private functions and storage; production and staging migration histories diverge.
- Signed-in feature and cross-user privacy tests on production-schema clone.
- Explicit release SHA and post-deploy smoke tests.
- Preserve all existing production auth.users and profiles; no synthetic staging fixture copy.
