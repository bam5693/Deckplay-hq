# DeckPlay HQ — final independent collector usability gate

**Status: REQUIRED BEFORE OWNER-APPROVED PUBLIC BETA. Not performed, not booked, and no spending authorized.**

## Release sequence
1. Finish the fixed 48-item V1 acceptance scoreboard at `docs/V1-ACCEPTANCE-SCOREBOARD.md` with current-head evidence; resolve all known P0/P1 issues and verify the integrated release candidate in protected staging.
2. Freeze the beta candidate (record exact commit, staging deployment ID, test-account/fixture setup, and scope). The V1 beta is invite-only and **does not include real checkout, payouts, or purchased shipping**.
3. Recruit **5–8 independent human testers** after owner approves the budget and provider. Prefer collectors who actually buy/sell Pokémon, One Piece/other TCGs, sports cards, and video games, plus at least one novice. Request mobile Android/iPhone and desktop coverage. **Do not hire or pay until step 1 is done.**
4. Run uncoached, task-based **think-aloud** sessions with screen recording and explicit consent. Ask testers to narrate what they expect, what seems redundant, why they hesitate, what they distrust, and what they would change. Do not show them the intended path first. No fake positive reviews or pressured praise.
5. Triaging: log every observation with recording timestamp, screenshot, device, category, reproduction steps, expected customer behavior, actual behavior, severity, and proposed fix. Distinguish bug, UX confusion, missing feature, and deliberate V1 limitation.
6. Fix critical/major issues on staging, retest affected workflows, then perform a **small independent recheck** of changed experiences. Owner signs off on remaining minor issues before any public beta deployment.
7. Production backup/restore verification, migration safety, and **explicit owner authorization** remain separate mandatory gates. Passing human tests does not authorize deployment.

## Tester missions (give outcomes, not click-by-click instructions)
- **First visit / trust:** Arrive as a stranger. Decide what DeckPlay sells, whether fees and shipping are clear, and whether you trust signing up. Report anything that looks fake, repetitive, or inconsistent.
- **Account / recovery:** Create an approved disposable account, sign out, sign in, try password recovery safely, and find settings. Observe confusing labels, dark/light contrast, modal actions, and mobile keyboard behavior.
- **Seller / every category:** Create realistic test listings for TCG singles/sealed, sports cards, video games, and collectibles. Choose attributes, add photos, edit, pause, and delete. Question repeated category choices, wrong category-specific advice, required fields, and dead ends.
- **Buyer discovery:** Search/filter, open a listing, compare variant/condition and pricing, save a Favorite, navigate back, and discover a seller's other listings. Question irrelevant filters, unexpected navigation, empty states, and missing context.
- **Buyer/seller conversations:** With a paired disposable account, send messages, make/counter/withdraw offers, and exercise supported trade flows. Confirm who sees what and whether history, notifications, and controls are understandable.
- **Cross-device:** Repeat key tasks on mobile and desktop, light/dark, long text, small screens, slow network, empty states, and invalid input. Call out any clipped, tiny, overlapping, unreadable, or misleading controls.
- **Independent exploration:** Spend at least 15 minutes doing whatever a real collector would do. Ask *why* something exists, whether anything feels unnecessary, and what would stop you from returning.

## Acceptance / stop rules
- **P0 blocker:** data exposure, destructive account/security issue, unauthorized transactions, serious privacy breach, or impossible core account/listing workflow. No beta launch.
- **P1 major:** repeated confusing steps, broken buyer/seller offer/trade journey, missing essential navigation, unreadable/overlapping controls, or misleading money/shipping behavior. Fix and independently recheck before beta.
- **P2 minor:** cosmetic or low-frequency friction; document with owner approval and follow-up issue.
- Gate passes only with: signed-off scope, named independent testers and device coverage, recordings/notes with consent, consolidated issue log, zero open P0/P1, recheck evidence, and owner's explicit final approval.
- **No invented '100% bug-free' claim.** The goal is feature-complete, independently challenged, and safe for a limited beta.

## Zero-spend preparation
- Reuse existing private staging, synthetic accounts/fixtures, screenshots, and the collector-persona acceptance scenarios; do not create paid accounts, connect billable AI, or use real customer/payment data.
- Compare tester providers and request an exact written quote **when V1 is ready**. Example budget target $25–$75, not a promised market price. If providers cannot recruit genuine collectors at that budget, ask owner before proceeding.
- Collect recordings privately, restrict access, remove personal information, and delete artifacts after the agreed review period.

## Evidence checklist
- [ ] V1 scoreboard fully accepted at pinned candidate SHA
- [ ] All known P0/P1 resolved on staging
- [ ] Owner approves independent test spend/provider and tester brief
- [ ] 5–8 testers complete think-aloud sessions with category/device coverage
- [ ] Issue log links to real observations and evidence
- [ ] All independent P0/P1 fixed and rechecked
- [ ] Recovery/rollback and production release gates verified
- [ ] Owner explicitly approves public beta deployment
