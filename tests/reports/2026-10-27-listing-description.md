# Listing description formatting — October 27, 2026

## Scope and reproduction

Only staging branch `test/staging-reporting`, draft PR #2 and private Worker `deckplay-hq-staging` were changed. No SQL, migrations, trigger changes, existing listing updates, production deployment or real user data changes occurred.

A new local publish-and-inspect test reproduced literal backslash-n characters in generated deck descriptions. The decklist textarea retained its real newlines, but surrounding generated labels and section separators used double-escaped sequences, resulting in visible escape text.

## Changes

Code commit: `91df3490ec62796e357a6d7e7cffd999ce848b15`.

Generated deck, grading, hardware, video-game platform and TCG-set descriptions now use real line breaks, with blank lines between sections. The seller's supplied multiline description and decklist are preserved. The existing detail view uses pre-wrap, so the saved section breaks render correctly.

Added two local desktop/mobile publish-and-display checks. Strengthened both existing deployed deck journeys to check actual persisted newline formatting and reject literal escape sequences.

This batch changes only newly generated descriptions; historical database rows are not rewritten. Deck quantity totals and game-specific legality are still not validated.

## Verification

- 230 local mobile/desktop browser checks passed, without failures, retries or skips.
- The preceding offer batch passed 29 security checks and real staging run [40587483500](https://github.com/bam5693/Deckplay-hq/actions/runs/40587483500): 48 API and 44 deployed browser cases, with no retries/failures/skips. This description-only change does not modify those security modules.
- Inline script parsing and whitespace checks passed.
- Final [staging run 40588122824](https://github.com/bam5693/Deckplay-hq/actions/runs/40588122824): completed successfully: 48 API and 44 deployed browser checks passed, including real deck-description persistence on desktop and mobile. No retries, test failures or skipped test cases occurred. The conditional failure-reporting job was skipped because no failure occurred.

The local publishing tests use a synthetic in-process Supabase client. The strengthened deployed tests separately verify persistence through real synthetic fixtures on the isolated staging database. Fixture cleanup retains exact-marker/UUID ownership checks.

That is 322 marketplace checks plus 29 security checks across distinct verification layers.

## Deployment

After the previous staging transaction workflow completed, the matching build was uploaded using the existing Worker's content-only API. Downloaded module SHA-256 exactly matched the locally generated Worker: `78846f805ee5e64cb8ac367a6e52097c7347d7d2282065080e57d678ed39f0ca`.

Homepage SHA-256: `86721d0f6e850cda79f5953719dc91129b745ee726a441dff078cced7f2798ff`.

All existing Worker settings, three secret bindings and three cron schedules were preserved and compared before/after. No production route or other Worker was changed.

## Next roadmap work

Continue inbox/trade recovery and accessibility, consistent deck quantity checks, collection/missing-card workflows, moderation and fulfillment. Real email/reset lifecycles and full upload cleanup remain bounded verification gaps. Pending UI guards prevent duplicate in-flight requests but do not certify server idempotency after an uncertain network outcome. Payments and shipping remain disabled or preview-only.
