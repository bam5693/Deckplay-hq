# DeckPlay HQ — active staging roadmap (updated 2026-10-28)

**Scope:** GitHub `bam5693/Deckplay-hq`, branch `test/staging-reporting`, draft PR #2; isolated Supabase `prrrzeelltmyugssqnzk` and Cloudflare Worker `deckplay-hq-staging`. Production/main, real users, payments, shipping, billing and PR merge are out of scope.

## Direction: functional improvements first

Prioritize **one or two real customer-facing fixes per development batch**, with targeted regression coverage, rather than adding tests merely to increase counts. Inspect the latest branch/PR, deployed staging, bot configuration and GitHub Actions first. Fix confirmed failures before new work. Preserve the existing passing test suite as a safety net. Do not claim a feature is live until the matching isolated staging build has been deployed and verified.

## Next work, in priority order

### P0 — Inbox and conversation experience (start here)
- Inspect actual mobile and desktop inbox screens and existing tests. Identify the most disruptive **verified** issue first (conversation list leaking into an open chat, confusing back behavior, misaligned message bubbles, tiny composer, unread badge mismatch, stale conversations after account switch).
- Make one focused layout/navigation fix at a time: clear single-conversation view on narrow screens, intuitive Back to inbox, correctly centered/responsive composer and distinct buyer/seller messages.
- Preserve drafts on failed sends, prevent cross-account stale response display, and ensure offer/trade/message actions route to the correct buyer–seller thread.
- Acceptance: screenshot/browser review on mobile and desktop, targeted tests, no account privacy regressions, exact staging build deployed before deployed Playwright.

### P1 — Offers, counteroffers and trade locking
- Verify offer → counteroffer → accept/decline/cancel from both sides with synthetic accounts, including stale offers, repeated taps, and conflicting transactions.
- Verify trades show each party's selected inventory clearly, preserve drafts on errors, and prevent double acceptance or listing reuse once reserved/sold.
- Fix only verified client or staging-side bugs. Do not enable real checkout or shipping.

### P2 — Notifications that lead somewhere useful
- Route messages/offers/trades to their **specific inbox conversation** instead of a dead-end page.
- Reserve Alerts for favorite price drops, favorite sold, followed-seller new items and other genuinely useful activity; avoid duplicate inbox alerts.
- Check Android Back, badge reconciliation, stale fetches and account-switch privacy.

### P3 — Search, favorites, listings and collections
- Verify card/TCG/deck/video-game/sports memorabilia filters, saved-item visibility, blocked sellers, seller profiles, photo and condition/grading display.
- Review deck listings for consistent quantity and card counts; avoid assuming game-specific legality rules.
- Check favorites price changes, sold status and seller follow/watchlist UX; fix verified defects.

### P4 — Mobile polish and accessibility
- Audit five-button navigation, menus, empty states, profile, dialogs, tap targets, text sizing, keyboard focus, Android Back and small-screen overflow.
- Prefer a small consistent UI improvement over another speculative test-only batch.

### P5 — Launch readiness (preview only)
- Review moderation/reporting, community guidelines, blocked accounts, seller trust, transaction state and shipping/payment **design** without activating money movement.
- Document launch blockers and unresolved decisions for the manager; do not autonomously decide fees or policy.

## Four synthetic personas: distinct, rotating, hands-on

- **Charles (worker):** staging API buyer/seller, offer/counteroffer/trade/message and permissions checks.
- **Kyle (worker):** deployed desktop/mobile browsing, listing, search, favorite, inbox and navigation flows.
- **Tanner (rotating lead):** sports-card and general collectibles collector; verify grading, condition, pricing, photos, seller profiles, watchlists, memorabilia and trade scenarios; also rotate buyer/seller.
- **Jayden (rotating lead):** TCG player/deck builder/video-game collector; verify playable singles, deck listing/search, game collectibles and trades; also rotate buyer/seller.
- Use deterministic synthetic staging fixtures and existing free infrastructure. Leads record suspected UX defects for manager/supervisor review; no autonomous policy decisions. Never claim independent AI agents are online without proof.

## Per-batch completion gate

1. Re-read branch head/PR and current workflow status; avoid conflicts, duplicate tests and redundant CI.
2. Choose one verified defect or useful UI improvement; check whether it is already implemented.
3. Implement 1–2 focused changes with expected SHA and relevant targeted tests.
4. If served assets changed, deploy the **exact isolated staging build first**, verify content match, then run deployed Playwright. If safe deployment is unavailable, do not make undeployable UI changes.
5. Report **separately** local UI, real staging API, deployed browser and security/health outcomes. Label pending or unverified checks. Link commit and workflow run.
6. Preserve staging Basic auth, secrets, bindings, RLS, production isolation and free usage; never delete real data or run destructive SQL without explicit approval.

## Previously documented checkpoints (historical, not current-run claims)

- Earlier roadmap reported 351 checks (230 local UI, 48 real staging API, 44 deployed browser, 29 security) at commit `91df3490ec62796e357a6d7e7cffd999ce848b15`.
- A later conversation-reported completed run #155 recorded 80 local, 48 API, 44 deployed and 11 cleanup security checks (183 in that run). Counts are **not interchangeable**; verify current run directly before reporting.


## Trunk-and-branch tracking — avoid repetitive work

**Status vocabulary:** VERIFIED = working at a cited historical checkpoint; POLISH = functional but a distinct UX gap remains; VERIFY = evidence insufficient or needs a current deployed check; NEW = not yet implemented; LATER = intentionally deferred. Never translate these into ungrounded completion percentages.

| Trunk | Branch | Current status | Existing evidence / next action |
|---|---|---|---|
| Marketplace/listings | Listing CRUD, photos, search, favorites | VERIFIED historically | Real staging API/deployed browser tests; avoid rebuilding |
| Marketplace/listings | Grading, deck metadata, readable generated descriptions | VERIFIED historically | 2026-10-27 listing-description report, run 40588122824 |
| Marketplace/listings | Deck quantity consistency and missing-card collection workflow | NEW / VERIFY | Inspect existing deck-listing tests and UI before building |
| Inbox | Private threads, stale fetches, account isolation | VERIFIED historically | Inbox race/privacy regressions and prior successful runs |
| Inbox | Mobile chat layout, Back navigation, offer/trade thread deep links | POLISH / VERIFY | Inspect current deployed UI; fix one reproduced defect |
| Transactions | Offer/counteroffer, trade selection, duplicate submits, locking | VERIFIED historically | 2026-10-27 work-mode and price-offer-recovery reports |
| Transactions | Transaction history, uncertain-network recovery | VERIFY | Reproduce specific gap before changing behavior |
| Discovery | Favorites, wanted posts, follow/block and basic alerts | VERIFIED historically | Existing integration and browser tests |
| Discovery | Price-drop/sold/followed-seller alert UX and precise routing | POLISH / VERIFY | Confirm what's already deployed; avoid duplicate alerts |
| Mobile | Installable web app, core navigation and browser coverage | VERIFIED historically | Existing manifest, local/deployed Playwright |
| Mobile | Consistent spacing, typography, keyboard/Back, accessibility | POLISH | Audit screens and fix distinct defects |
| Security/testing | Private staging, synthetic personas, isolation, cleanup | VERIFIED historically | Security and staging reports; keep regression suite |
| Launch | Account recovery, moderation, disputes, payment/shipping | NEW / LATER | Plan only; no real payments/shipping |

**Anti-repeat rules:**
1. Before each batch, consult this table, last two commits, current PR head, existing tests and deployed behavior.
2. Choose an unfinished branch, not a trunk already verified. A test-only change must address a **newly observed failure or concrete missing behavior**; no repeated privacy permutations solely to raise test counts.
3. Mark a branch VERIFIED only with a commit, matching staging deployment where applicable, and relevant passing checks. Mark POLISH if functional but UX remains imperfect.
4. Prefer breadth: after two consecutive batches in one trunk without a user-visible change, move to the next unfinished branch or explicitly explain the blocker.
5. Keep a short dated change log: branch, user-visible effect, commit, deployment, local/API/deployed/security results, remaining gap.
6. Tanner and Jayden identify usability concerns; manager decides product policy. Charles/Kyle exercise deterministic supported workflows.
