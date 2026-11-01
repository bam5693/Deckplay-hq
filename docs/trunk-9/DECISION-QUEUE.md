# Trunk 9 — actionable decision queue

Updated **2026-11-01**. Advisory only; no approved implementation or product-policy change. Source baseline `test/staging-reporting@9a73010078e4de085b9b4a948e20c095a458c5c3`. Evidence: [2026-11-01 competitor log](./2026-11-01-competitor-evidence-log.md). Workstream owner: T9 analyst; recipient for implementation recommendation: Trunk 1 integration lead (not an automatic assignment).

## DQ-001 — Sports-card brand identity and buyer discoverability

**Decision recommendation: DO NOW / IMPROVE (P1), owner approval required before scope change.**

**Observed source gap:** sports seller brand select offers seven named options and Other / Unknown, not O-Pee-Chee. The stored sports `Brand:` text is read by the buyer's `marketSportsBrand` filter; choosing Other/Unknown may hide exact brand from structured brand search. The user has specifically identified vintage O-Pee-Chee as important. [PSA 1983 O-Pee-Chee](https://www.psacard.com/cardfacts/hockey-cards/1983-o-pee-chee/870) and [Upper Deck 2025–26 O-Pee-Chee](https://upperdeck.com/2025-26-o-pee-chee-hockey/) demonstrate the historical versus modern distinction. This is source evidence, not a live user test or popularity claim.

**Small proposed change (Trunk 1 owner, with Trunk 4 buyer-filter review):**
1. In Sports Cards → Hockey seller brand, expose `O-Pee-Chee` as a selectable collector-facing brand/line without implying every O-Pee-Chee card was published by Upper Deck. Allow a nonempty exact **Other brand** free-text value (trim, length cap, escaped display, no extra database schema required if existing description metadata format is used). Do not make vintage cards require a modern publisher.
2. For modern products, if needed later, add optional **Publisher/manufacturer** separately from **Collector-facing brand/product line**; do not require a second brand field for V1. Do not equate `Topps` and `Bowman`, or `Upper Deck` and `O-Pee-Chee` in one generic set dropdown.
3. Buyer brand search should match the normalized exact brand or known alias (e.g., `OPC`, `O Pee Chee`, `O-Pee-Chee`) for **both vintage and modern** relevant listings. Preserve existing behavior for Topps/Panini/etc. Do not auto-rewrite seller-entered historical publisher data.
4. Preserve free-text description and unknown-set fallback; no massive all-era taxonomy list, mandatory set/parallel, AI scan, or paid catalog API.

**Proposed acceptance scenarios (Trunk 1, review before implementing):**
- Seller A lists `1983–84 O-Pee-Chee Hockey`, selects Hockey → O-Pee-Chee, enters year and player; buyer B filtering `OPC` or `O-Pee-Chee` finds it; editing and resaving preserves brand.
- Seller C lists `2025–26 Upper Deck O-Pee-Chee Hockey` with brand/line O-Pee-Chee and optional manufacturer in descriptive details; buyer searches both `O-Pee-Chee` and `OPC`, but listing does not falsely claim the 1983–84 issue was made by Upper Deck.
- Seller D selects Other brand and types a real obscure brand; buyer E searches that exact brand and finds the listing. An empty Other brand must be blocked or explicitly treated as Unknown, not silently create an unsearchable bogus brand.
- Signed-in seller and buyer, mobile and desktop; search/filter behavior after edit; no XSS from free text; no regression for existing brand values or saved listings. Run cheapest focused tests once, only after code change; avoid broad repeat suites.

**Customer benefit:** fewer forced Other choices, more accurate vintage card listings, improved buy-side search. **Estimated engineering effort:** small to medium, depending on data parsing and backwards compatibility. **Confidence:** high in source gap, medium in priority (user complaint, not measured frequency). **Owner approval requested:** approve narrow Trunk 1 P1 change and the listed acceptance scenarios. **Status:** PROPOSED, not assigned or implemented.

## DQ-002 — Catalog type clarity, not a giant dropdown

**Recommendation: DO LATER / IMPROVE (P2), no immediate code scope.** [Cardmarket Pokémon categories](https://www.cardmarket.com/en/Pokemon/Products) explicitly distinguish Singles, Boosters, Booster Boxes, Sealed Products, Lots/Collections and Accessories. DeckPlay has `listingType` for single/deck/lot/sealed but should eventually distinguish loose booster packs vs factory sealed booster boxes in **seller item specifics and buyer filtering** without duplicate category questions. The right fix requires live current-staging screenshots and review of the existing product type/quantity fields first. **Acceptance candidate:** a buyer filtering sealed booster box excludes loose packs; seller's title and quantity never imply a sealed box when listing individual packs. **Owner:** T1 with T4 review; **confidence:** medium; **do not change yet**.

## DQ-003 — Photo scanning / automatic pricing

**Recommendation: DON'T DO FOR V1 / DEFER.** [eBay scan-to-list](https://pages.ebay.com/co/en-us/scantolist/) advertises limited game support, and [TCGplayer inventory](https://help.tcgplayer.com/hc/en-us/articles/201574827-How-do-I-list-individual-products) depends on a mature product catalog. Matching image-to-card, pricing, and current sold comps would introduce false matches, API costs, support burden and version errors. Keep manual exact-set/variant entry, editable drafts and actual-item photos. Reconsider after verified catalog quality, enough beta sellers and a free, legally permitted data source. **Owner:** product/marketing; **confidence:** medium-high.

## Trunk 9 finite-workstream tracking

| Objective | State as of 2026-11-01 | Evidence required next |
| --- | --- | --- |
| T9.1 Sourced competitor comparison | **IN PROGRESS** — initial US/EU catalog/fees/taxonomy baseline documented | Cover COMC, CollX, PSA marketplace, real trading platforms and trust/mobile/payment limitations; mark advertised vs tested for each |
| T9.2 Proven DeckPlay differentiators | NOT STARTED | Source-level or current signed staging proof and 3 buyer reasons |
| T9.3 UX/friction review | IN PROGRESS (sports-card source gap only) | Current seller/buyer real UX and ranked keep/improve/defer/remove |
| T9.4 No-cost beta acquisition | NOT STARTED | Channel plan with experiment, measurable stop criteria, owner approval |
| T9.5 Metrics/launch gates | NOT STARTED | Definitions, event instrumentation feasibility, privacy/trust |
| T9.6 Owner decision memo | NOT STARTED (queue is working draft) | Prioritized completed recommendation memo and explicit decisions |

**Release guard:** No app code changed, no staging deployment, no production data accessed, no checkout or shipping activated. Do not mark T9.1 or any other objective accepted yet.