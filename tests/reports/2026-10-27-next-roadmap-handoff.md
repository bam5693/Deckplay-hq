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


## Marketplace posting-tools branch — exact card identity and seller flexibility (2026-10-28)

**Existing implementation, do not duplicate:** Listing form already has a 2,000-character free-text description, item name, TCG game, optional set, optional card number, optional variant, condition/grading and required photos. Generated metadata and seller description are saved together. Current dropdown already includes regular, reverse holo, holo, illustration rare, special illustration rare, alternate art, manga rare, promo and Other. The optional set selector can be skipped. Existing tests cover publishing and descriptions.

**Next enhancements, separate branches:**
1. **P1 — Visible free-form fallback:** Label the description as the place to specify any unlisted card/set/variant/rarity, printing, language, edition, foil treatment, serial number and flaws; add contextual examples and show buyers all seller-entered detail. Prefer a targeted UX change rather than new duplicate form fields.
2. **P1 — Exact card identity:** Offer explicit custom set/variant text when dropdown is missing an option, plus rarity, edition/printing, language and card number. Do not collapse two variants because name/number match. Preserve exact seller text through listing detail, search and messaging.
3. **P2 — Price and condition:** Seller-entered asking price remains authoritative. Do not infer price from name or apply auto-valuation; condition, grading company, grade, certification, photo proof and seller disclosure must be distinguishable.
4. **P2 — Quantity and multi-card listings:** Distinguish quantity of identical copies from mixed lots; describe individual variants/conditions separately when needed, avoid silently combining values.
5. **P3 — Photos and quality:** Require photos, encourage front/back, surface/corners and graded-label photos, preserve photo order and provide an informative preview.
6. **P3 — Coverage:** Test Pokémon, One Piece, other TCGs, sports cards, memorabilia, sealed items, video games and collectibles; ensure free-text fallback works for unsupported games/sets.

**Acceptance:** Seller can post three same-name/number cards with different rarity/printing/condition/prices as **three distinguishable listings**; unsupported variants can be accurately described without selecting an incorrect dropdown; listing detail displays exact description. Do not change production or enable checkout. Implement in small staging-only UI batches with matching deployed build verification and relevant targeted tests.


## Future branch — Scan-to-list with price guidance (proposed 2026-10-28)

**Status: LATER / discovery, not implemented.** Do not displace immediate manual listing-detail improvements.

1. Mobile camera/photo upload suggests matching cards by image and/or OCR; never assume one match is definitive.
2. Present candidate **printings/variants with images**, set, number, rarity, finish, edition, language and other discriminators. Seller confirms exact version or selects manual/custom entry.
3. Fetch legally licensed, appropriately attributed pricing from a suitable provider; include source, freshness timestamp, currency, raw/graded condition and comparable-sale basis. Do not label cached/daily figures real-time.
4. Show a suggested price or range, optionally using sold comparable transactions when available. Seller always chooses their own price; no automatic price floor/ceiling or auto-posting.
5. Never transmit card images to external identification services without consent; account for API quotas, licensing, cost, privacy and incorrect matches.
6. Roll out in stages: manual catalog search → photo-assisted candidate lookup → condition-aware price suggestion → optional bulk scanning. Preserve fallback description and manual posting throughout.

**Research note:** TCGplayer API documentation currently says it is not granting new API access; don't assume free integration. Alternative catalogs/price providers require terms, commercial rights, coverage, accuracy and cost review before integration. No paid API or deployment authorized.


## Trunk 2 — Private conversation photo sharing (approved 2026-10-28)

**Status: APPROVED / NOT YET IMPLEMENTED.** User explicitly wants buyers and sellers to send photos in private conversations (card corners, backs, graded labels, condition evidence). No paid services.

**Feature branches**
1. **Discovery first:** inspect existing messages schema, listing photo upload/storage, inbox rendering and RLS; avoid duplicating an existing feature or exposing storage.
2. **Private attachments:** support a limited number of image attachments per message using existing isolated staging storage where feasible. Enforce per-file type, size, count, ownership, conversation membership and server-side authorization; deny cross-thread and anonymous access. Do not use public listing-photo buckets for private images.
3. **UX:** attach previews before sending; show sending/failure/retry state; display thumbnails inline and full-screen view with accessible controls. Preserve message text and drafts on failures; handle mobile upload/camera capture.
4. **Safety:** strip or avoid retaining sensitive EXIF metadata where practical; validate file contents, not just extension; protect against malicious file types, oversized images, storage abuse and spam; ensure attachments cannot leak through direct URLs or account switching.
5. **Testing:** Charles verifies staging API authorization and cross-account denials; Kyle verifies mobile/desktop send/receive/open/retry; Tanner reviews sports-card condition-photo use cases; Jayden reviews TCG card back/rarity use cases.
6. **Costs and deployment:** stay within existing free staging quotas; estimate storage/egress before enabling at scale. No paid provider, new subscription, production change, real data, real payments/shipping or merge without approval.

**Acceptance:** two authorized synthetic users can exchange and open private card photos on mobile/desktop; unauthorized third party cannot retrieve them; rejected uploads fail clearly without losing drafts; existing text conversations and inbox privacy still pass.


## Trunk 4.13 — External collector app links and collection inquiries (user-approved 2026-10-28)

**Status: APPROVED CONCEPT / NOT IMPLEMENTED.** Collectors can add public collection-profile links (e.g. Holodex, Collectr, CollX or other services) to their DeckPlay profile even if they have no active listings. Other users can open the external collection and send a private inquiry asking if the collector might sell or trade a specific card. Displayed collection ownership **does not** imply an item is listed, available or priced.

**Free-first MVP:** manually add/edit/remove a small set of HTTPS public collection links, provider label and optional custom name; render clearly as external links with a leaving-DeckPlay cue. Do not scrape, synchronize, mirror or claim verified ownership of external inventories. Validate URL scheme and hostname safely, disallow dangerous schemes, sanitize labels, protect against phishing/malicious links, and apply safe external-link handling. Use existing profile/inbox capabilities; no paid APIs.

**Inquiry flow:** message a collector through the existing private inbox, ideally prefilled with a user-editable note identifying the external card and a pasted card URL/name; no automatic offers, transactions or assumptions of availability. Collector controls: allow buy/trade inquiries, trades only, or display-only/no collection inquiries; block/report and spam/rate protections. Ensure messages obey existing privacy/RLS.

**Deal boundary:** if both users want a transaction, require an actual DeckPlay listing or verified trade-item snapshot with photos, variant, condition, quantity, agreed price/terms, mutual confirmation and inventory locking before entering transaction flow. Never transact based only on an external collection page.

**Future, conditional:** deep link to individual cards, optional import/sync only if provider permissions, commercial terms, user consent and cost allow. Never pay for API/integration without explicit approval.

**Acceptance:** a synthetic collector without listings can share a valid public collection link; another synthetic user can view it and initiate a private inquiry; owner can disable inquiries; unsafe URLs and blocked users are rejected; no listing or sale is fabricated.


### Trunk 4.13 addendum — prevent unwanted collector inquiries (approved 2026-10-28)

**Privacy-first default:** external collection links may be visible without accepting any sale/trade inquiries. Collection inquiry permission is OFF by default (opt-in); never equate a public collection with an item being for sale.

**Controls:** Showcase Only (no collection inquiry CTA), Trades Only, Buy/Trade Inquiries; allow instant pause/mute; later optional per-card availability flags. Respect block/privacy controls. Hide inquiry CTA for disabled modes, and enforce denial server-side even if someone submits a crafted request.

**Anti-spam:** rate-limit first-contact collection inquiries and repeated requests; prevent duplicate unanswered requests for the same collector/card; allow dismiss/report/block. Keep collection inquiries separate/filterable from active listing/deal conversations so sellers can prioritize actual transactions. Do not imply off-platform collector apps grant access to card-specific availability or messaging.

**Tests:** a large-collection synthetic user with default settings receives no collection inquiries; opting in permits controlled first-contact requests; turning off inquiries blocks subsequent new requests without deleting existing conversations; blocked users cannot initiate contact. Preserve existing normal listing messaging.


## Cross-trunk pricing transparency — listing price plus actual buyer cost (approved 2026-10-28)

**Status: APPROVED REQUIREMENT / NOT IMPLEMENTED.** Applies to Trunks 1 (listing cards/search), 3 (offers/bundles/checkout) and 6 (payments/compliance).

- On every listing card and detail page, show the seller's asking/listed price prominently and, immediately underneath, the **estimated total buyer cost**, itemizing buyer-facing marketplace/protection/service fees and estimated shipping. Include applicable taxes in final checkout; display tax estimate earlier when determinable from destination.
- Clearly label totals **estimated** until shipping destination, shipping method and applicable taxes are known. When these are known, show the **final payable total** before payment confirmation, including item price, shipping, tax and all mandatory buyer fees; never surprise buyers with a new mandatory fee after confirmation.
- Never misrepresent a seller-side marketplace commission or card processing cost as an additional buyer charge. Decide and document who pays each fee, whether seller fee is deducted from proceeds, and whether a buyer protection fee exists. Avoid double-counting.
- On bundle/multi-item orders, calculate per-order charges correctly and combine shipping when feasible; don't multiply fixed payment fees per item unless separate charges actually occur. Show seller payout/fee breakdown separately from buyer cost.
- For an anonymous viewer or unknown shipping destination, show a transparent estimated total/range or “Shipping/tax calculated with address,” not a falsely exact price. In the invite-only beta with checkout disabled, label any price calculator as preview/simulation, not payable.
- No paid integrations or live payment/shipping enablement without user approval. Confirm provider rules, fees, and applicable all-in price display requirements before production.
- Tests: Charles checks arithmetic and fee ownership across small orders/bundles; Kyle checks mobile card/details/checkout legibility; Tanner and Jayden verify collectible/trade examples, including shipping and changing destination.


### Pricing display correction — shipping is separate (approved 2026-10-28)

This supersedes the earlier suggestion to display item+fees+estimated shipping as the primary secondary price on listing cards.

- Listing card/detail: **seller listed price** first; directly underneath **price including mandatory buyer fees, excluding shipping and applicable tax**, clearly labeled (e.g. "$3.50 with fees · + shipping"). No assumed flat $5 shipping.
- Shipping is a separate line and **buyer-selectable at checkout** among eligible options; show actual shipping prices for each option and the final payable total (item + buyer fees + chosen shipping + applicable tax) before confirmation. Any mandatory fees must be disclosed up front.
- For single low-value cards, investigate eligible economical letter/envelope shipping; never assume tracking, insurance or buyer protection on a stamped letter. Distinguish stamped untracked letters, eligible tracked letter products (if provider actually supports them), USPS Ground Advantage and expedited parcels. Verify mailpiece thickness, rigidity, dimensions, weight, machinability, card protection and current USPS/provider rates; do not advertise an unsupported service or guarantee a low rate.
- Shipping choices depend on seller packaging, order value, quantity, carrier eligibility and protection rules. If a transaction requires tracking/protection, clearly explain why untracked envelope shipping is unavailable. Allow combined shipping for multi-card orders where appropriate.
- No live label generation or payment integration until explicitly approved; use previews/simulation in beta.


## Trunk 8 — Operations, Support and Marketplace Management (owner-approved priority order, 2026-10-28)

**Planning decision only; not a claim that these features are implemented.** Use staging-only development, no paid services, no production modifications, no real transactions until approved.

1. Admin access security: least-privilege roles, MFA for privileged accounts, secure sessions, auditable administrative actions, explicit safeguards for sensitive controls.
2. Private mobile-friendly DeckPlay Command Center: actionable counts for reports, tickets, listings, users and health, with no fabricated data.
3. Report intake and moderation: counterfeit/stolen-image/prohibited-item/abuse reports, evidence preservation, moderation queue, reasoned actions and appeals.
4. Support ticket intake and self-service Help Center: user-facing issue categories, status, response history, saved replies and privacy protections.
5. System monitoring and emergency controls: alerts, staging/production isolation, verified rollback and backups, narrowly scoped feature kill switches.
6. Account administration and appeals: safely review account status, fraud signals and seller controls with minimal private-data access.
7. Beta feedback and announcements: feature requests, maintenance banners, feedback triage and metrics.
8. Pre-payment operations: shipping issues, refunds, chargebacks, disputes and transaction snapshots, first in simulation/test mode.
9. Pre-payment seller onboarding and finance: provider-managed identity verification, payout support, fee reconciliation, transaction reporting and cost monitoring.
10. Later: rule-based support triage and optional AI drafts; never autonomous bans, refunds or real financial actions.

**Execution:** security and audit foundations first; then dashboard, moderation, support, monitoring, and account controls. Invite-only/public beta gates must pass before real users; payments/shipping branches stay disabled until explicit approval. Charles checks access controls and audit tests, Kyle mobile workflows, Tanner seller/collector support, Jayden buyer/trade support. Verify existing code and tests before marking each branch VERIFIED; don't duplicate already passing tests. 


## MASTER EXECUTION PLAN — Eight trunks, phased and anti-duplicate (2026-10-28)

**Status:** consolidated implementation order approved by owner; this is a plan, NOT a claim of feature implementation or current test pass. Follow the detailed sections above; later corrections supersede earlier ideas. In particular, listing display is **seller price + buyer mandatory fees, excluding shipping**; shipping choices/prices are separate and final total (including applicable tax) is shown before payment. Do not assume $5 shipping for a single card.

### Phase 0 — Baseline and security (gate for all further work)
- Inspect latest staging branch and draft PR #2, recent commits, CI, deployment and isolated Supabase; record actual results and avoid overlapping hourly automation changes.
- Inventory current code, deployed features and tests; distinguish VERIFIED historically, POLISH, VERIFY, NEW and LATER. Preserve verified features.
- Trunks 6/8: admin authorization, least privilege, privileged MFA, audit trail, staging/production isolation, RLS, account privacy, report/block safety, rollback/backup review. Prioritize confirmed security defects over new features.
- Charles owns API/RLS/admin negative cases; Kyle verifies admin mobile access and safe denial; Tanner/Jayden exercise user-visible trust and reporting flows.

### Phase 1 — Make existing marketplace excellent (before invite beta)
1. Trunk 2: inbox single-thread mobile layout, back behavior, message composer, unread counts, offer/trade deep links and account-switch privacy. Fix reproduced issues in 1–2 change batches.
2. Trunk 3: offers/counteroffers/trades, multi-item proposals, idempotent locking, deal snapshots and retry/error recovery; do not activate payment.
3. Trunk 4: useful favorite-price-drop/sold/followed-seller alerts; route messages and negotiations to inbox, not generic Alerts.
4. Trunk 1: precise variant/printing/condition listing and custom fallback, photos, drafts, quantities/lots, seller listing controls; preserve existing free-text listing and grading.
5. Trunk 5: Android Back, five-tab nav, mobile keyboard, readable type, tap targets, responsive layout, listing preview and PWA updates.
6. Trunk 2: private conversation photo attachments with private storage and authorization; only after RLS/storage review and free-tier budget check.
7. Trunk 4: external collection profile links with inquiry opt-in OFF by default, spam protections and no assumed sale availability.
8. Trunk 1/3/6: fee-inclusive display below listed price **excluding shipping**, separate buyer-selectable eligible shipping options, honest tax estimates and checkout preview only. Fee ownership and exact rates require later owner decision.

### Phase 2 — Operate the beta safely
- Trunk 8 order: (1) admin security/audits, (2) mobile Command Center, (3) reports/moderation/counterfeit queue, (4) support tickets/Help Center, (5) health/kill switches/rollback, (6) account management/appeals, (7) feedback/announcements. Financial operations and automation follow later.
- Trunk 6: signup protection, recovery, moderation policy, abuse detection, account deletion/export, backups, terms/privacy/community rules, accessibility, smoke tests, incident playbook.
- Trunk 7: shareable listing links, SEO, lightweight analytics and seller storefronts; invite/referral tracking and founding member badges if simple. No paid promotions, ads or marketing APIs yet.
- **Invite-only beta gate:** verified access controls, no cross-user leaks, functioning reports/support, stable listings/inbox/offers/trades, mobile smoke tests, backup/rollback, transparent no-checkout/no-shipping labels and support ownership. No live money movement. Beta transactions are simulations, clearly labeled.

### Phase 3 — Enable real commerce only with explicit owner approval
- Trunks 3/6/8: provider-supported marketplace checkout/onboarding/payouts, refund and dispute processes, ledger reconciliation, idempotent inventory/payment state and seller/buyer protections.
- Trunks 1/3/6: shipping eligibility and choices for economy letters where valid, tracked parcel options, combined shipping, postage quotes/labels, lost/damaged claims and carrier requirements. **Never claim untracked envelope is insured/tracked.**
- Show seller asking price, price including mandatory buyer fees (not shipping), separate selectable shipping cost, applicable tax and exact final payable total before confirming. Show seller net proceeds separately. Avoid duplicate payment fees on bundles.
- Document actual provider pricing, fee cap, small-order break-even, refund/chargeback exposure, tax/compliance, and operating cost alerts; seek owner approval before enabling paid services, live payments, labels or production changes.

### Phase 4 — Grow without compromising collector trust
- Trunk 7: seller analytics, storefronts, referral metrics, local shop outreach, search-zero-results metrics, share cards, seller vacation mode, founding collector badges and retention funnel.
- Later only: scan-to-list licensed catalog/pricing, optional paid promotions/ads, advanced AI support/recommendations, native app stores and collection imports. Require provider rights, privacy and budget review.
- Trunk 8: expand ticket automation and financial operations only when justified by volume.

### Status and implementation ledger (starting snapshot; confirm in code/deployment before changing)
| Trunk | Historical working baseline | First unfinished work | Initial classification |
|---|---|---|---|
| 1 Listings | CRUD, photos, grading, search | precise custom variants, listing/quantity UX | POLISH / NEW |
| 2 Inbox | private messages and threads | mobile polish, photo attachments | POLISH / NEW |
| 3 Transactions | offer, counteroffer, trade and locking basics | multi-item trade UX, failure recovery | VERIFY / NEW |
| 4 Discovery | favorites, follows, wanted and alerts basics | alert routing, collection inquiry controls | POLISH / NEW |
| 5 Mobile | installable PWA and core nav | keyboard/Back/spacing/accessibility | POLISH |
| 6 Security | staging isolation and synthetic checks | admin hardening, policies, beta gates | VERIFY / NEW |
| 7 Growth | some share/follow primitives | SEO, storefront analytics, referrals | VERIFY / NEW |
| 8 Operations | no comprehensive admin suite verified | secure Command Center, moderation, support | NEW |

### Continuous work rules
- Each batch: read latest branch/PR/CI, select highest-value **unfinished** task, inspect existing implementation, reproduce or define acceptance, change at most 1–2 related behaviors, run targeted tests, deploy exact staging build if applicable, verify and log evidence.
- Four deterministic personas: Charles security/API, Kyle deployed mobile/desktop, Tanner sports collector/seller, Jayden TCG player/deck builder/trader; rotate leads. No assertion that four autonomous paid AI agents are running.
- Do not inflate check totals, rerun passing workflows unnecessarily, overwrite concurrent automation work, or claim deployment without verification.
- Never touch main/production or real user data, merge PR, enable real money/shipping, incur paid services, or run destructive SQL without explicit authorization.
- Next development batch after baseline: first confirmed security blocker, otherwise a reproducible inbox/navigation defect; then move across trunks rather than repeatedly polishing one area.

### Active development checkpoint — 2026-10-28

See [roadmap development](2026-10-28-roadmap-development.md) for current evidence. Inbox Android Back fixes are deployed with exact Worker read-back; 88 targeted local UI and 33 security checks passed. Matching real API/deployed checks pending publication. Preserve historical counts separately. Next unfinished branch: precise custom listing identity and seller fallback UX.

### 2026-10-28 follow-up

Inbox Back is VERIFIED at `460438c` / run `40680128125` (48 API, 44 deployed, 86 selected local, 11 cleanup checks). Exact card printing/custom metadata and storefront description parity are deployed at `50bb34f`, awaiting run `40681070226`. Block-list/preference account-isolation fixes are locally passing; see the dated development report. Legacy `moderation.html` exists, but staging has none of its four authorization/queue/action RPCs: admin backend remains NEW. Private attachments still need a private bucket and server authorization; external inquiry opt-in remains NEW. Do not label these finished merely because a page or historical test exists.

### Current security/intake progress

See [development ledger](2026-10-28-roadmap-development.md). Block/preference isolation is VERIFIED at `ae063ba` / run `40681791376`. The legacy moderation UI is hardened and deployed at `8827f74`; server moderator roles, enforced MFA and audit RPCs remain NEW. Report draft/submission privacy and counterfeit/photo categories are locally passing, pending deployment. Exact card metadata is VERIFIED at `50bb34f`. Next listing gap: explicit decklist quantity mismatch warnings/validation, with no game-legality claims.
