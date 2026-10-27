# DeckPlay HQ — next staging verification batch

Scope: `test/staging-reporting` and draft PR #2 only. Do not merge, deploy to production, modify real user data, or enable payments/shipping.

## Verified baseline

PR #2 documents 230 local UI, 48 real staging API, 44 deployed browser and 29 security checks (351 total) at commit `91df3490ec62796e357a6d7e7cffd999ce848b15`. These are distinct layers, not a guarantee of full product coverage. Recheck current branch head and CI before treating this as latest.

## Next batches (in order)

1. Inbox: test rapid conversation switching, stale message fetches, unread count reconciliation, failed send recovery and draft preservation across mobile Back and account switches. Make only targeted fixes supported by failing tests.
2. Deck listings: validate nonnegative integer quantities, consistent stated card counts, duplicate card aggregation and incomplete/missing-card descriptions. Distinguish marketplace metadata checks from game-specific deck legality; do not reject listings based on unverified game rules.
3. Lead personas: Charles = API transactions/permissions; Kyle = deployed browser journeys; Tanner = sports/collectibles; Jayden = TCG/deck building. Rotate seller/buyer in deterministic tests. AI reviewers are advisory, not autonomous users, and must not approve merges or mutate production.
4. Accessibility/mobile: focus management, keyboard and Android Back, empty states, accessible labels, dialogs and small-screen overflow.
5. Moderation/fulfillment: preview-only policy flows, blocked sellers, reported content, reserved/sold negotiation boundaries. Keep real checkout, shipping and money movement disabled.

## Safety and verification gates

- Read PR #2, current staging head, and latest workflow results before changes; avoid duplicate CI runs.
- Only synthetic fixtures with exact verified UUIDs and ownership may be cleaned up; preserve foreign/shared storage.
- No DROP, TRUNCATE, unrestricted DELETE, trigger replacement or destructive migration without explaining the exact SQL and receiving approval.
- Run relevant local checks, security tests and staging CI; report actual pass/fail/skip counts. Do not claim deployment or success without evidence.
- If database access or approval is blocked, continue independent safe code and test improvements.
