# Collector-first reviewer baseline — October 31, 2026

**Branch:** `review/collector-first-acceptance-20261031` (NOT deployed or merged). **Source:** `tests/fixtures/category-catalog.json` on the staging base branch. **Scope:** static inventory + source review; not independent customer sessions.

## First executable snapshot audit
- 19 realistic collector challenge cases.
- 41 requested dropdown values **PRESENT** in the existing category fixture.
- 0 requested known option values **MISSING_IN_SNAPSHOT**.
- 14 required facets **NOT_TRACKED** by current extracted catalog, including `sportsSport`, `sportsProductLine`, `consoleModel` and third-party accessory brand. **NOT_TRACKED is not proof the actual seller UI lacks those fields.**
- Seller-to-buyer search/filter, result correctness, visual screenshots and real Android: **NOT TESTED BY THIS STATIC AUDIT**. No release acceptance is granted.

## Fresh code-inspection questions worth testing (not claims about current deployed UI)
1. The inspected staging `index.html` includes both “What are you listing?” / `#listingType` and “Category” / `#category` in the same form. The catalog's automated 124-journey test programmatically assigns both values, meaning it can pass while a human encounters a redundant question. Check conditional visibility after selecting video game, console and card; avoid a second required decision where the first determines the second.
2. The form's `#listingDescriptionHelp` includes universal advice about cards, sets, rarity and foil. In the raw HTML this help paragraph is not hidden by default. Confirm a video-game customer doesn't receive irrelevant card guidance on the *actual rendered* screen before deciding a fix.
3. The `#sportsBrand` select includes Upper Deck, Fleer and Bowman under one label; there is no `sportsProductLine` in the extracted catalog fixture. Review the actual sports model: manufacturer, historical publisher, product brand, year/set and parallel are distinct. Test 1983–84 O-Pee-Chee hockey and modern Upper Deck O-Pee-Chee without falsely attributing vintage publishers.
4. The currently extracted buyer-side `marketGame` records TCG choice but not sport-specific or product-line filtering. Verify seller→buyer round-trip manually before claiming buyers can filter O-Pee-Chee by hockey or Prizm by football.

## Assigned continuation
- **Trunk 1 owner**: choose one major sports product brand and one TCG variant, reproduce staging end-to-end, implement real product-catalog/buyer-search changes on its owned branch, run focused tests, submit PR for integration; do not dump hundreds of options into a dropdown.
- **Tanner/Jayden independent reviewer**: challenge both buyer/seller workflows and the screenshot-atlas cases; report precise repros and missing evidence, not self-signed passes.
- **Integration lead**: refuse UX READY status until real screenshot review (where relevant), first-time-customer journey and targeted regression evidence exist; preserve staging/production boundaries.

## Important limitation
The private Workers AI reviewer is a **text-only evidence critic**. It is not four independent people browsing the website, does not automatically receive prior screenshots, and has not been redeployed by this branch. Live AI inference and browser execution require separate verification; no model usage or CI minutes were consumed to produce this static audit.
