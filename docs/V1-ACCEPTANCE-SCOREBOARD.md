# DeckPlay HQ — eight-trunk V1 acceptance scoreboard

> Single source of truth for **finite, testable V1 scope** on isolated staging. Created 2026-10-29. The full, larger product roadmap remains in [the eight-trunk master plan](../tests/reports/2026-10-27-next-roadmap-handoff.md); this scoreboard does **not** delete those long-term commitments.

## Rules that make 100% meaningful

- **V1 means a safe, usable invite-only beta with no live checkout, purchased shipping, payouts, or real-money customer transactions.** Pricing/shipping previews must be explicitly simulations. Production publication of separately verified completed features is a different release workstream.
- Every acceptance item has a stable ID and an observable outcome. Do **not** add new V1 items without an explicit scope decision; put new ideas into the original long-term roadmap or a future V2 backlog instead.
- Unchecked = **not yet accepted at the current staging baseline**, *not* necessarily unimplemented. The project already has much historical passing evidence. Start by reconciling that evidence; never rebuild working code merely because a checkbox is empty.
- Mark `[x]` **only** after confirming the relevant code exists at the current staging branch source, cheap/focused checks pass, required staging security/API/buyer-seller mobile+desktop evidence matches the affected source, and attach a commit/test/deployment link **beside that item**. For purely operational or physical-device items, attach the actual recovery/operator/device evidence instead. A previous passing run on a different commit is a candidate, not current acceptance.
- **V1 trunk progress = checked items / 6; total V1 progress = checked items / 48.** Until initial current-head reconciliation is finished, percentages are *unassessed*, not evidence that nothing has been built. No subjective percentages, no inflated tests and no rounding a trunk to 100% while anything is unchecked.
- Use only `ACCEPTED`, `CANDIDATE (historically proven)`, `OPEN`, `BLOCKED` as narrative labels. Commit != deployed != tested != accepted. Work-in-progress limit: **one complete vertical slice, at most two tightly related behaviors**. Keep a short line under the completed item instead of writing another lengthy report.
- Rotate effort to neglected Trunks 7–8; after two consecutive sessions without an accepted buyer/seller feature, choose a different unblocked feature. Do not create duplicate tests, modules, dashboards, launch reports or investigation work merely to appear busy.
- Owner must explicitly authorize production migration, PR merge, public deployment, new spending, irreversible actions or live financial flows. Private staging can continue while the real production backup is blocked.

### Current acceptance state

**Baseline reconciliation pending.** There are 48 fixed V1 acceptance items below, but current-HEAD proof and checked-item counts have not yet been reconciled. Historical successful runs are useful starting points, *not* a claim that 0 features exist or that all requirements already passed today.

## Trunk 1 — Listings and marketplace (6)

- [ ] **T1.1** A seller can create, edit, pause and remove a listing with valid photo, price and honest failure/retry behavior across all supported categories.
- [ ] **T1.2** Buyers can browse and filter all supported categories, card games, sports, memorabilia, video games and other collectibles with a correct empty-results recovery path.
- [ ] **T1.3** Seller-provided exact set/number/variant/printing/grading/condition and free-text descriptions survive publishing and appear accurately on buyer details.
- [ ] **T1.4** Single-copy, identical multiples, mixed lots and deck quantities/contents are distinguishable; no misleading inventory or unit prices.
- [ ] **T1.5** Photos, galleries, seller info and Saved/My listings work safely on mobile and desktop; blocked seller inventory remains private as required.
- [ ] **T1.6** Item asking price and any known buyer charges are clearly separated; unknown shipping/tax/fees and simulated checkout are **not** presented as payable totals or real purchases.

## Trunk 2 — Inbox and messaging (6)

- [ ] **T2.1** Authenticated participants can find, open and exchange private conversations; wrong-account and blocked-user access is denied.
- [ ] **T2.2** Inbox search, unread badges, single-thread mobile layout, Back navigation, keyboard and message composer work without losing focus/drafts.
- [ ] **T2.3** Earlier conversation history and negotiation events paginate in correct stable order even on tied timestamps; old offer-only conversations remain discoverable.
- [ ] **T2.4** Send errors, reloads, duplicate taps, stale responses and account switches do not silently drop drafts, duplicate messages or leak private content.
- [ ] **T2.5** Price offers, trades, counters and alerts open the correct conversation, with useful read-state reconciliation.
- [ ] **T2.6** Private message photos can be exchanged and opened by authorized participants on staging, with type/size/rate limits, cross-user denial, mobile retries and safety handling. Public release remains disabled until its own security/recovery approval.

## Trunk 3 — Offers and trading (6)

- [ ] **T3.1** Price offer → counter → accept/decline/withdraw is coherent from both sides, including invalid amounts and stale states.
- [ ] **T3.2** Trades support real selected listings and bundle terms, cash directions and immutable item snapshots displayed to both parties.
- [ ] **T3.3** Repeated/racing acceptances are atomic; sold/reserved inventory cannot be allocated to two deals.
- [ ] **T3.4** Network uncertainty and repeated taps cannot create duplicate price/trade proposals; drafts and failure state are recoverable.
- [ ] **T3.5** Buyers and sellers can view chronological offer/trade decisions, statuses, participant identity and transaction next steps in the Inbox.
- [ ] **T3.6** All supported category/persona transaction paths are covered by focused real synthetic staging acceptance with scoped rollback; checkout and payment remain disabled.

## Trunk 4 — Discovery and collections (6)

- [ ] **T4.1** Favorites, saved listings and followed collectors persist correctly, respect blocking and show truthful current listing status.
- [ ] **T4.2** Wanted Board supports the full supported card-game and non-card catalog and identifies precise matches without self/blocked/incorrect-variant results.
- [ ] **T4.3** Useful price-drop, favorite-sold, seller-follow and Wanted alerts show accurate context and open the right destination, without duplicating Inbox events.
- [ ] **T4.4** Public/private collection visibility, profiles and external public collection links protect identity/privacy and reject unsafe URLs.
- [ ] **T4.5** Collection inquiries are OFF by default; showcase-only, trades-only and buy/trade modes enforce owner consent server-side.
- [ ] **T4.6** Collection first-contact controls prevent unwanted repeats and blocked-user inquiries; a visible collection never falsely implies a listing, price, or agreement.

## Trunk 5 — Mobile, PWA and accessibility (6)

- [ ] **T5.1** Five-tab navigation and subpages are consistent on narrow mobile layouts, with correct active views, Back and history behavior.
- [ ] **T5.2** Listing galleries, photo zoom, seller forms, category filters and trade sheets work on emulated mobile and desktop without overflow.
- [ ] **T5.3** Inbox, soft keyboard, composer, draft recovery and Android Back work on a **real Android/PWA device**, not just an emulator.
- [ ] **T5.4** Accessible labels, keyboard/focus/escape behavior, contrast and tap targets are checked for critical marketplace and messaging flows.
- [ ] **T5.5** Install/update behavior and unavailable-network states are safe; no stale UI pretends an action succeeded or exposes cached private data.
- [ ] **T5.6** An end-to-end synthetic buyer/seller journey passes on mobile and desktop from search to conversation to simulated offer/trade, with no live payment.

## Trunk 6 — Security, trust and readiness (6)

- [ ] **T6.1** Registration, session changes, login, password recovery and basic abuse protection work safely and do not overwrite collector profile identity.
- [ ] **T6.2** RLS/API boundaries deny unauthorized reads/writes across listings, private messages, attachments, offers, trade history, collections and user blocks.
- [ ] **T6.3** Moderator privileges require least privilege, verified MFA, freshness/stale-state checks and auditable sensitive actions.
- [ ] **T6.4** Upload, rate, content, and anti-spam boundaries are tested without exhausting free quotas or weakening security.
- [ ] **T6.5** **Real** production data/managed Auth/Storage bytes and required configuration have a privately verified backup and isolated restore/recovery plan; existing customer data can be protected before public migration. Synthetic rehearsal alone does not satisfy this.
- [ ] **T6.6** Appropriate privacy/terms/community rules, reporting/incident response, account recovery/export/deletion and safe beta operating boundaries are established and reviewed.

## Trunk 7 — Growth and collector adoption (6)

- [ ] **T7.1** Shared listing links, profile links and copy/share actions land on the correct public-facing item/profile and do not disclose private data.
- [ ] **T7.2** Seller storefront/profile presents accessible active inventory and trustworthy seller identity for **all** categories.
- [ ] **T7.3** Search engines and social previews have useful public titles/descriptions/metadata for real public content, without indexing private messages or staging.
- [ ] **T7.4** First-time buyer and seller flows explain how to list, find, save, contact and negotiate, including the current no-payment limitation.
- [ ] **T7.5** Basic privacy-conscious, no-paid-service growth diagnostics can identify empty searches, listing discovery and drop-off without exposing message content.
- [ ] **T7.6** Buyers/sellers can provide beta feedback and sellers can share an accurate profile/listing without misleading incentives or fabricated popularity.

## Trunk 8 — Operations and support (6)

- [ ] **T8.1** Authenticated privileged moderators can review reports with real MFA, reasoned actions, audit history and consistent permission denial.
- [ ] **T8.2** A mobile-friendly private operator dashboard displays real meaningful queues/health/status and never fabricated counts or customer-sensitive details.
- [ ] **T8.3** Users can open support tickets, view status/replies and access a self-service Help Center; staff can respond privately with scoped authorization.
- [ ] **T8.4** Evidence-based counterfeit/abuse/report triage, safe listing enforcement and user appeal paths are available without arbitrary bans.
- [ ] **T8.5** Incident monitoring, feature controls, production rollback and recovery runbooks are verified with clear staging/production separation.
- [ ] **T8.6** Beta invitations, feedback, status notices and escalation ownership are established; support can handle reported simulated trade/shipping problems without claiming live funds moved.

## Starting evidence — **historical only, reconcile against current HEAD**

- [Run 40967795638](https://github.com/bam5693/Deckplay-hq/actions/runs/40967795638): focused listing-gallery/negotiation/mobile work; 23 served-asset parity and signed read-only buyer/seller checks recorded.
- [Run 40959129290](https://github.com/bam5693/Deckplay-hq/actions/runs/40959129290): signed read-only staging buyer/seller desktop/mobile verification for Inbox navigation.
- [Run 40915598917](https://github.com/bam5693/Deckplay-hq/actions/runs/40915598917): Wanted matching/privacy focused verification; separate real staging transaction cases recorded in [clock-in development report](../tests/reports/2026-10-29-clock-in-development.md).
- [Release PR #5](https://github.com/bam5693/Deckplay-hq/pull/5) has a **separate** tested release candidate and production-migration plan; its actual private production backup/Auth/Storage restore gate remains open. Do not auto-merge PR #2, merge release PR #5 or deploy the public Worker.

## Execution queue — value-first, not report-first

1. **Reconcile only the affected acceptance items** from existing commits/runs and deployed source; do not spend a session checking all 48 before building.
2. Finish **T8.3 support tickets** as one end-to-end user/staff slice (check existing schema/UI first); or a genuinely blocking security defect.
3. Finish an independent **Trunk 7 seller storefront/share/SEO slice** that benefits all categories.
4. Keep Trunks 1–5 advancing through one actual unfinished customer journey at a time; target the concrete physical Android gate when a real device is available.
5. Prepare public release PR #5 separately: restore actual backup + Storage bytes/Auth dependencies first, reconcile only release-ready commits, then request explicit approval before migration, merge and publish.

**Output per development run:** `Trunk ID; customer-visible change; exact commit; verified local/API/browser/deployment evidence; accepted checklist IDs; next unfinished ID`. If code cannot run, say exactly what could not be verified. Do not claim progress percentage until current-head acceptance reconciliation is honest. Never change this scoreboard merely to report activity.
