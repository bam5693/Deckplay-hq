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
  - **CANDIDATE, not accepted:** Listing/profile share buttons and guarded UUID deep-link resolution at [2b1bd0c](https://github.com/bam5693/Deckplay-hq/commit/2b1bd0cf13782a1fa80e4557c31005eaadc2f38d), [067bf30](https://github.com/bam5693/Deckplay-hq/commit/067bf30b03166ac7ff3d8adc88ce9f032bbf3713), [d5322df](https://github.com/bam5693/Deckplay-hq/commit/d5322df3bbc8db6a6b96c6b448f35fade3efda35); focused category/privacy browser specs [6767ac7](https://github.com/bam5693/Deckplay-hq/commit/6767ac726dc619b12097328745d26f6898f84520) and [e080404](https://github.com/bam5693/Deckplay-hq/commit/e080404ff1f59fedb2919649cbb405b8ac486f3d). Static parsing and local mocked logic for active, missing and blocked listings passed. Private Worker `cc56cf65-4715-467f-98c0-de04b819fa6e` deployed 2026-10-30 04:18:30 UTC; readback confirms **exact homepage and share-module parity** with current staging-transformed source (25 assets total), staging noindex/robots and preserved three auth secret bindings. Focused Playwright run ID/results, signed buyer/seller mobile/desktop and public-facing release remain **unverified**. Links on private staging require staging access; no public rollout authorized.
- [x] **T7.2** Seller storefront/profile presents accessible active inventory and trustworthy seller identity for **all** categories.
  - **ACCEPTED on private staging, 2026-10-29 Central:** Search within seller listings, all seven category filters, name/price/newest sorting, correct seller identity, explicit empty/error states and 60+ inventory pagination with retry at [145c0f3](https://github.com/bam5693/Deckplay-hq/commit/145c0f34553cc9a269e1238c77c94959b6003783), [5e3f094](https://github.com/bam5693/Deckplay-hq/commit/5e3f094774b8fa3a5267862c3e938d9059b0946b), [410d79c](https://github.com/bam5693/Deckplay-hq/commit/410d79c8ca4bf7657e223787e7d554b73170e9ab), with focused mobile/desktop tests at [8a8b0d3](https://github.com/bam5693/Deckplay-hq/commit/8a8b0d3d6e0bb725a7f96b96d0bfb3556b4e5ed8) and [c1d2c3d](https://github.com/bam5693/Deckplay-hq/commit/c1d2c3dd9ce13d02c18a33ef0174c6bf3aaf15dd). [Trusted staging run 41003953357](https://github.com/bam5693/Deckplay-hq/actions/runs/41003953357) **PASSED** focused UI tests, exact served-asset parity, private Basic Auth denial and signed read-only buyer/seller desktop/mobile sessions. Deployed private Worker `28b62b10-9bab-4013-b638-55f41a079a54` serves 100% staging traffic. Inventory sort/filter intentionally applies to currently loaded pages; the UI states this and offers **Load more** for older listings. Not yet in the public release.
- [ ] **T7.3** Search engines and social previews have useful public titles/descriptions/metadata for real public content, without indexing private messages or staging.
- [ ] **T7.4** First-time buyer and seller flows explain how to list, find, save, contact and negotiate, including the current no-payment limitation.
- [ ] **T7.5** Basic privacy-conscious, no-paid-service growth diagnostics can identify empty searches, listing discovery and drop-off without exposing message content.
- [ ] **T7.6** Buyers/sellers can provide beta feedback and sellers can share an accurate profile/listing without misleading incentives or fabricated popularity.

## Trunk 8 — Operations and support (6)

- [ ] **T8.1** Authenticated privileged moderators can review reports with real MFA, reasoned actions, audit history and consistent permission denial.
- [ ] **T8.2** A mobile-friendly private operator dashboard displays real meaningful queues/health/status and never fabricated counts or customer-sensitive details.
- [ ] **T8.3** Users can open support tickets, view status/replies and access a self-service Help Center; staff can respond privately with scoped authorization.
  - **CANDIDATE, not accepted:** Private support schema/RPC and owner/staff RLS applied only to staging at [46ff9dc](https://github.com/bam5693/Deckplay-hq/commit/46ff9dcafbffed1882f1a20988659b5d076fd744); Help Center, ticket/reply/status UI [b442697](https://github.com/bam5693/Deckplay-hq/commit/b44269774c8a9c143914aabe91a5be228b1931e4), account-isolation patch [77dcd52](https://github.com/bam5693/Deckplay-hq/commit/77dcd521bb3b60d20e181ef72ad7cd4d21b15325), targeted synthetic UI tests [98ad107](https://github.com/bam5693/Deckplay-hq/commit/98ad107ba7c51aa1d49c0f7aaeabe9fd9b7e5e31). SQL inspection confirmed RLS on both tables, authenticated SELECT only and anonymous RPC execution denied. **Deployed source readback:** private Worker `0bcb1ad1-e660-45f9-9d1c-e1ce0daaf400` (2026-10-30 02:45:48 UTC) includes the Help Center and latest account-switch privacy fix, 24 asset entries, staging Supabase URL and all three existing secret bindings; no production DB URL was present. Full byte-for-byte asset parity, focused Playwright result and signed real synthetic owner/staff reply acceptance remain **unverified** (the connected GitHub run listing does not expose push-triggered runs). Zero verified staff moderators exist, so staff MFA acceptance is blocked without an approved staff setup.**
- [ ] **T8.4** Evidence-based counterfeit/abuse/report triage, safe listing enforcement and user appeal paths are available without arbitrary bans.
- [ ] **T8.5** Incident monitoring, feature controls, production rollback and recovery runbooks are verified with clear staging/production separation.
- [ ] **T8.6** Beta invitations, feedback, status notices and escalation ownership are established; support can handle reported simulated trade/shipping problems without claiming live funds moved.

## Starting evidence — **historical only, reconcile against current HEAD**

- [Run 40967795638](https://github.com/bam5693/Deckplay-hq/actions/runs/40967795638): focused listing-gallery/negotiation/mobile work; 23 served-asset parity and signed read-only buyer/seller checks recorded.
- [Run 40959129290](https://github.com/bam5693/Deckplay-hq/actions/runs/40959129290): signed read-only staging buyer/seller desktop/mobile verification for Inbox navigation.
- [Run 40915598917](https://github.com/bam5693/Deckplay-hq/actions/runs/40915598917): Wanted matching/privacy focused verification; separate real staging transaction cases recorded in [clock-in development report](../tests/reports/2026-10-29-clock-in-development.md).
- [Release PR #5](https://github.com/bam5693/Deckplay-hq/pull/5) **merged on 2026-10-29 Central** and [published successfully](https://github.com/bam5693/Deckplay-hq/actions/runs/41002002982). The owner explicitly accepted the remaining prelaunch test-data backup/Auth/Storage recovery risk; those unrehearsed recovery steps remain outstanding. Continue to require explicit owner approval for **future** production migrations/merges/deployments. PR #2 is still draft staging and must not be merged wholesale.

## Execution queue — value-first, not report-first

1. **Reconcile only the affected acceptance items** from existing commits/runs and deployed source; do not spend a session checking all 48 before building.
2. Complete **T8.3 support-ticket verified-staff acceptance** (existing working UI and staging schema are built; only test actual staff MFA/response boundaries when a properly authorized test moderator exists), or a genuine security blocker.
3. Finish **T7.1 sharing acceptance and T7.3 safe SEO/social previews** on private staging; do not redo accepted T7.2 inventory. Then tackle first-time onboarding and feedback.
4. Keep Trunks 1–5 advancing through one actual unfinished customer journey at a time; target the concrete physical Android gate when a real device is available.
5. PR #5 has shipped; leave subsequent production releases separate and gated by explicit owner approval. Continue improving independent backup/Auth/Storage recovery without halting staging development.

**Output per development run:** `Trunk ID; customer-visible change; exact commit; verified local/API/browser/deployment evidence; accepted checklist IDs; next unfinished ID`. If code cannot run, say exactly what could not be verified. Do not claim progress percentage until current-head acceptance reconciliation is honest. Never change this scoreboard merely to report activity.
