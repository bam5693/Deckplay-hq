# Trunk 1 collector-first catalog coverage and search — 2026-10-31

**Scope / truth:** Source audit of `dev/hourly-trunk1` only, with a small buyer search + seller set-option fix. No deployed staging, signed accounts, buyer/seller publication, screenshot pixels, independent reviewer, physical Android, or production verification. **Disposition: UX BLOCKED / FUNCTIONAL ACCEPTANCE PENDING.** Existing T1.1 and T1.2 scoreboard acceptance is not reopened; new functionality has separate acceptance gates.

## DONE — one narrow catalog slice, not the entire catalog
- `af922412`: Seller Magic set picker now offers officially named **Bloomburrow**, **Magic: The Gathering Foundations**, and **Magic: The Gathering—FINAL FANTASY** (the last under Universes Beyond, not a publisher/manufacturer). Preserves optional `Other / unknown` and custom set input. Source: [Wizards Bloomburrow](https://magic.wizards.com/en/products/bloomburrow), [Foundations](https://magic.wizards.com/en/products/foundations), [FINAL FANTASY](https://magic.wizards.com/en/products/final-fantasy). These are selected **sets**, not product types; the seller's existing set disclosure is buyer-searchable, but actual publication/readback is **NOT VERIFIED**.
- Same code: Buyer marketplace text search now matches One Piece `OP17` with `OP-17` and similarly `EB05/EB-05`, `ST31/ST-31`, `PRB02/PRB-02`, including card numbers such as `OP17-093` versus `OP-17-093`. Unrelated `PS-5` stays unchanged. This is a search alias, **not** a claim that a new set is released or that the listing is live.
- `91bd1d17`: 3 focused offline Node assertions for seller catalog and buyer search; `bea0f5e9`: dedicated cheap workflow. [Run 41265673725](https://github.com/bam5693/Deckplay-hq/actions/runs/41265673725) **PASS**. This is source-level evidence, not a browser journey.
- [Draft PR #25](https://github.com/bam5693/Deckplay-hq/pull/25) remains **unmerged**; integration owner must reconcile divergent `index.html` with staging and verify actual signed seller→buyer path.

## Prioritized gaps — static evidence, not exhaustive coverage

| Priority | Collector scenario / domain | Source observation and customer harm | Owner / focused next check | Status |
|---|---|---|---|---|
| P0 | All 8 types: single, deck, lot, sealed, game, console, figure, other | Form asks **What are you listing?** then **Category** again; type handler silently auto-selects category but leaves second selector. Owner screenshot **33656.jpg** reported duplicate game selection. A novice can choose conflicting values. | T1 owner: one canonical classification control per journey; test eight type-to-category paths and edit/buyer readback in mobile light/dark. | **OPEN — UX BLOCKED** |
| P0 | Video games / hardware / noncards | Description help always says missing card/set/variant and foil; game and hardware customers see irrelevant card instructions. Owner screenshot 33656.jpg. Hardware type is also selected after the broad console/controller/accessory type. | T1 owner: category-conditional help and no redundant type choice; test game, console, controller and accessory save/edit/buyer. | **OPEN — UX BLOCKED** |
| P0 | Hockey O-Pee-Chee, O-Pee-Chee Platinum, Parkhurst; vintage attribution | Sports brand selector contains Topps, Panini, Upper Deck, Fleer, Donruss, Bowman, Score, Other. **O-Pee-Chee/Parkhurst are missing as selectable product brands**; Upper Deck is not a substitute for vintage O-Pee-Chee manufacturer attribution. [Upper Deck O-Pee-Chee](https://upperdeck.com/2025-26-o-pee-chee-hockey/), [Parkhurst](https://upperdeck.com/product/2024-25-parkhurst-champions-hockey/). | T1 owner; review [candidate PR #30](https://github.com/bam5693/Deckplay-hq/pull/30) **separate branch/not live**; test vintage hockey brand/year/number vs modern Upper Deck product line and buyer filters. | **OPEN — separate candidate, not integrated** |
| P1 | Other TCGs (Magic, Lorcana, Yu-Gi-Oh!, Digimon, Dragon Ball, Gundam, etc.) | Only Pokémon and One Piece had structured set/era menus; others had custom-set fallback but mainstream releases required free text. Magic's 3 verified releases now selectable, broader series remain missing. | T1 owner: add mainstream sets by verified official release, preserve free text; test one sealed/single and buyer discovery per game. | **PARTIAL FIX — Magic slice PASS source only** |
| P1 | One Piece OP/EB/ST/PRB and card numbers | Seller OP-17/EB-05/ST-31 group choices existed; buyer `OP17` did not text-match seller `OP-17` under old normalization. Starter decks remain grouped `ST-31 and later`, not precise individual decks. | T1 owner: targeted OP-17 parallel and ST-31 sealed cold seller/buyer journey; verify metadata, variant, title, search alias, edit. | **Alias source PASS; buyer/staging UNKNOWN** |
| P1 | Baseball / football / basketball / soccer / racing | One generic brand list shared across sports; no separate manufacturer/product-line/set-year model. Some brands are sport-specific, and forcing wrong brand or Other harms trust and buyer filtering. | T1 owner: sport-specific mainstream product audit using official manufacturers; exact sport/brand/year/player/parallel buyer round-trip. | **OPEN — not audited exhaustively** |
| P1 | Game platforms and hardware | Seller platform select includes generic `Sega` and `Atari` rather than model-specific Saturn/Genesis/Dreamcast/2600, while buyer platform filter uses the same coarse values. Model may be free text but platform filters cannot distinguish consoles. | T1 owner: exact platform model + seller/buyer shared choices; test Dreamcast disc, Switch 2 game, PS5 controller. | **OPEN** |
| P2 | Pokémon Base Set, 151, recent Mega Evolution | Structured seller era/set options include these examples; precise printing/condition/graded-vs-raw and sealed ETB product-type semantics require buyer round-trip. | T1 owner: Jayden Base Set Charizard 4/102, 151 ETB, printing and condition changes. | **PRESENT IN SOURCE; journey UNKNOWN** |
| P2 | Collectible figures and mixed lots | Collector subcategory exists; type/category duplication, quantity/contents help and photo requirements need realistic multi-item review. | T1 owner: figure and mixed-lot cold mobile journey, cancel/reenter and buyer details. | **PRESENT IN SOURCE; UX UNKNOWN** |

## Eight-type source-only matrix (not eight browser passes)

| Listing type | Current mapped category | Source-only collector objection |
|---|---|---|
| single | trading_cards | Type + Category repeated; a single noncard item is confusing |
| deck | trading_cards | Type + Category repeated; dark/light deck fieldset and quantity UX not visually inspected (33662.jpg) |
| lot | trading_cards | Type + Category repeated; mixed lots need precise contents |
| sealed | trading_cards | Type + Category repeated; sealed video game vs sealed TCG ambiguity |
| game | video_games | Duplicate choice, irrelevant card help (33656.jpg), contents quantity clutter (33658.jpg) |
| console | consoles | Broad hardware type plus separate Console/Controller/Accessory selection; mapping may not track actual hardware subtype |
| figure | collectibles | Type + Category repeated, then collectible subtype |
| other | other | Type + Category repeated but user may need an actual category choice |

## SCREENSHOT REGRESSION / UX ACCEPTANCE
- **Owner-reported issues:** 33656.jpg duplicated Type/Category and irrelevant card help; 33654.jpg long One Piece set chooser; 33666.jpg Pokémon set chooser; 33652.jpg sports brand chooser; 33662.jpg dark deck panel; 33660.jpg Cancel/footer; 33664.jpg variants; 33668.jpg sports variants; 33658.jpg quantity; 33648.jpg onboarding. Source: `docs/OWNER-SCREENSHOT-REGRESSION-ATLAS.md`. **Original image bytes not available to this worker; not visually inspected.** Historical screenshot observations are not automatically current staging defects.
- **Jayden desk critique (not an independent browser actor):** A buyer types `OP17-093` for a seller's `OP-17-093`; before this source fix exact substring matching failed. The alias is now source-tested, but buyer results and account state are **NOT VERIFIED**. A Magic player listing a FINAL FANTASY single now has a named set option; no signed publish/edit/readback proven.
- **Tanner desk critique (not an independent browser actor):** A 1980s O-Pee-Chee hockey card should not be forced to `Upper Deck`; current selector still lacks product-brand distinctions. Source audit FAIL; PR #30 is only a candidate. For a console seller, hardware subtype/category can disagree. No actual mobile screenshots examined.
- **Visual:** mobile light **NOT VERIFIED**, mobile dark **NOT VERIFIED**, long Android native menus **NOT VERIFIED**, Cancel/Post placement **NOT VERIFIED**; physical Android **NOT VERIFIED**. No independent reviewer assigned or model-browser navigation observed. Do not claim screenshot acceptance.
- **Functional:** 3 offline Node tests PASS at `bea0f5e9`; browser, authenticated seller publish/edit, buyer search/details, offline/wrong-account, private staging deployment parity **NOT VERIFIED**. No production changes.
- **Owner next:** T1 worker should first remove redundant type/category and irrelevant help as a focused UX fix, then improve sports product-brand/year and per-sport coverage without overwriting PR #30. Integration lead must secure independent reviewer and one Android-sized light/dark browser journey before release. Do not merge merely on these source tests.

## 22:30 CDT — P0 listing UX source fix update (branch only)
- Type/Category duplication: source candidate 061245e/540bc73 removes second category question for seven explicit types; Other alone has category selector; hardware subtype maps to consoles/controllers/accessories. Buyer readback not verified.
- Noncard guidance: source candidate aa763f7/540bc73 adds game/hardware/figure/card-specific description and quantity guidance; no foil/rarity prompt for game.
- Focused source check: eight types, hardware Controller and Other-to-video-game checks pass; all five inline scripts parse. Dedicated two-case mobile light/dark Playwright test and workflow added at 06361a3/3fb8a6b; browser run and actual screenshot inspection not confirmed.
- UX BLOCKED: Jayden and Tanner self-critiques are not independent reviewer acceptance. No physical Android, signed seller/buyer, exact served staging parity. 33656 and 33658 source-fixed candidates; 33660 Cancel browser check pending; 33662 dark deck panel unresolved. Original JPG bytes unavailable.
- P0 hockey O-Pee-Chee/Parkhurst still awaiting separate PR #30 reconciliation; no duplicate catalog edits attempted.

## 2026-11-01 focused catalog gap delta (T1.3)
| Priority | Source / impact | Owner | Exact focused check | Fix status |
|---|---|---|---|---|
| P0 | Game platform buyer filter read the **original** `Platform:` even after seller edited it; wrong buyer discovery for PS5 → Nintendo Switch 2. | Trunk 1 | Current edited classification vs legacy source mapper/search, [4/4 Node run 41289361779](https://github.com/bam5693/Deckplay-hq/actions/runs/41289361779); future signed seller edit and buyer PS5/Switch 2 filter/detail. | **Branch fixed** [635f6d5](https://github.com/bam5693/Deckplay-hq/commit/635f6d585f2425265e10c2eaa877ad66f764a69a); staging/UX **UNKNOWN**. |
| P1 | Seller and buyer share broad `Sega`/`Atari` choices; Genesis, Saturn, Dreamcast and Atari 2600/7800 cannot be precisely filtered. [Official SEGA history](https://www.sega.jp/history/companyTimeline/en/); [official Atari compatibility](https://atari.com/products/atari-2600-plus). | Trunk 1 | One cold Dreamcast and one Atari 7800 game seller→buyer search/filter/edit journey, both themes; ensure old generic listings still work. | **OPEN**; avoid blindly lengthening already-long Android native menu without usability review. |
| P0 | Every `index.html` change launches unrelated Inbox/browser Actions on T1 branch, consuming free CI. | Manual G integration/CI | One scoped branch change should start only matching workflow; retain staging security/parity gates. | [Issue #34](https://github.com/bam5693/Deckplay-hq/issues/34) filed; no unauthorized CI edits. |

**UX / screenshot gate:** Owner 33656.jpg is a relevant game classification regression seed, not visual proof of this filter issue. Jayden and Tanner source critiques only; no independent visual reviewer, owner JPG pixels, actual mobile light/dark screenshots, physical Android or signed staging seller→buyer proof. **UX BLOCKED; functional acceptance PENDING.** T1.1/T1.2 remain accepted, T1.3–T1.6 unchecked.


## 2026-11-01 incremental gap update — price scope and fee contrast (not catalog completion)

| Priority | Collector case | Evidence and impact | Owner / exact next check | Fix status |
|---|---|---|---|---|
| P1 | Tanner: four vintage O-Pee-Chee hockey cards sold as one lot for $45.50 | Seller price field and buyer offer field previously did not say whether $45.50 was the lot total or per card; a buyer could reasonably misinterpret an offer. | T1; signed seller creates four-card lot, buyer opens details and offers $40, confirms lot quantity and no invented charges, seller edits/reopens. | **Branch code 07ae4cf; V8 focused 5/5; staging UNKNOWN** |
| P1 | Jayden: buyer opens listing details in dark mobile theme | Fee disclosure had fixed inline `#657087` against dark dialog `#1b2636`, ~3.07:1 calculated contrast for 12px text. | T1; inspect actual light/dark mobile screenshots, buyer detail fee note and offer modal; independent reviewer required. | **Branch code 89a73ff; calculated contrast light 7.58:1/dark 10.27:1; visual/staging UNKNOWN** |

**Scope and source:** `docs/V1-ACCEPTANCE-SCOREBOARD.md` T1.6 and owner screenshot atlas 33658/33660 (related UX seeds, not direct screenshot proof). Test source [04e8452](https://github.com/bam5693/Deckplay-hq/commit/04e845269cbf95e5261b23e974f331129bab9e65), executed only in a V8 Node-style harness against the branch HTML; no GitHub Actions run. Existing catalog gaps above remain open. **UX BLOCKED / REAL CUSTOMER ACCEPTANCE NOT VERIFIED.**

## 2026-11-01 T1.3 repeated classification edit gap scorecard (new)
| Priority | Source/impact | Owner | Focused verification | Fix status |
|---|---|---|---|---|
| P0 | Multiple generated classification blocks: sports buyer filters and detail previously used **first** instead of current last; O-Pee-Chee hockey correction could display Fleer | Trunk 1 | `tests/security/trunk1-latest-classification.test.cjs`; Tanner old/new brand and year, blank brand | **Branch fix; V8 synthetic PASS; signed staging/UX UNKNOWN** |
| P0 | Pokémon corrected Base Set 4/102 → 151 199/165: buyer detail could show first old block | Trunk 1 | Same focused regression; Jayden exact number/set buyer detail | **Branch fix; V8 synthetic PASS; signed staging/UX UNKNOWN** |
| P1 | Editor reopening multiple historical classification blocks could rehydrate stale condition | Trunk 1 | Latest-block helper + fallback source guard; actual edit/reopen browser not run | **Branch fix; UI NOT VERIFIED** |

## 2026-11-01 05:30 CST — repeated seller edit metadata gap

| Priority | Collector mission / impact | Owner | Focused check | Status |
|---|---|---|---|---|
| P0 | Tanner edits 1981 Fleer to 1983–84 O-Pee-Chee twice: old generated classification remained visible in seller notes and could be republished. | T1 | `trunk1-editor-repeated-edits.test.cjs`: note stripping, latest classification, preserved quantity | **FIXED ON BRANCH** [316934b](https://github.com/bam5693/Deckplay-hq/commit/316934b8026b8523ca14adca0e906dadb56699b7), 5/5 V8 harness; signed buyer **UNKNOWN** |
| P0 | Jayden edits deck quantities twice: reopening used first historical decklist rather than latest. | T1 | Same focused test: latest 3x/1x, not old 4x | **FIXED ON BRANCH** [f82e5cf](https://github.com/bam5693/Deckplay-hq/commit/f82e5cf885be9dda04e8dc8a3e2877b72dff244c); rendered mobile **UNKNOWN** |

**SCREENSHOT REGRESSION / UX:** Owner atlas 33652/33666/33662 are related seeds only; original JPG pixels unavailable. Tanner and Jayden were developer-authored source challenges, not independent reviewers. Native Node, mobile light/dark screenshot inspection, real signed publish/edit/buyer readback, offline/wrong-account, physical Android and private staging parity **NOT VERIFIED**. **UX BLOCKED**; T1.3–T1.6 not accepted. PR #30's missing O-Pee-Chee catalog option remains a separate candidate, not live. [PR #25](https://github.com/bam5693/Deckplay-hq/pull/25) awaits manual G integration; production untouched.

**05:30 focused correction:** The original 5/5 V8 pass did not cover creation-generated `[Sports Cards]`/`[Video Game]` legacy blocks. A new cold source repro found stale Fleer/PS5 text still visible in the editor. [Fix 03f94d7](https://github.com/bam5693/Deckplay-hq/commit/03f94d779528225187795706e4942c7935c2356b) plus [two targeted regressions 47806a6](https://github.com/bam5693/Deckplay-hq/commit/47806a653b2b8b728113922fc83acc6a4719608c) now yields **7/7 V8 Node-compatible PASS**. This is still branch-only; legacy unmarked TCG lines and actual signed buyer readback remain **UNKNOWN**. Independent mobile UX and physical Android remain **BLOCKED**.


## 2026-11-01 T1.4 quantity integrity follow-up (scoped, not catalog completeness)

| Priority | Gap / source | Customer impact | Owner / exact focused check | Fix status |
|---|---|---|---|---|
| P0 | `index.html` deck publish guard checked `invalid||mismatch` but not `complete`; `deckQuantitySummary` flagged uncounted lines without rejecting submission. Owner atlas 33662.jpg is a UX seed, not direct proof. | Jayden could post a deck containing `Leader: Yamato` without a counted quantity, despite the declared total. | T1; `tests/security/trunk1-decklist-completeness.test.cjs` valid, uncounted, empty, mismatch, oversized cases. | **FIXED on branch** `051c42c`, 5/5 V8 harness PASS; browser/signed seller→buyer/Android UNKNOWN. |
| P0 | `listingDisclosedQuantity` reused `readListingContents` draft defaults for a malformed public contents block missing quantity or unit. | Tanner's malformed/legacy hockey lot could be presented to buyers as one card without any seller declaration. | T1; `tests/security/trunk1-buyer-quantity-truth.test.cjs` valid four-card lot, missing quantity/unit, zero/oversized/legacy. | **FIXED on branch** `fd626bb`, 4/4 V8 harness PASS; deployed buyer detail and mobile visuals UNKNOWN. |

**UX ACCEPTANCE / SCREENSHOT REGRESSION: BLOCKED.** Developer-authored Tanner/Jayden desk challenges only; no independent reviewer, inspected screenshot pixels, actual mobile light/dark render, physical Android, or authenticated seller→buyer journey. Reuse historical eight-type classification evidence only for unchanged choices; do not call the new deck publish guard accepted until the changed path is staged and checked. T1.1/T1.2 stay accepted; T1.3–T1.6 remain unchecked. PR #25 is unmerged.


## 2026-11-01 09:30 CST — exact One Piece ST-31–ST-36 catalog slice

| Priority | Source / collector impact | Owner | Exact focused check | Fix status |
|---|---|---|---|---|
| P1 | [Official ONE PIECE product announcement (2026-07-10)](https://one-piece.com/news/80780/index.html): six separate starter products ST-31 Luffy, ST-32 Zoro, ST-33 Kuzan, ST-34 Katakuri, ST-35 Sabo, ST-36 Kid. Seller catalog had only `ST-31 and later`, making common products imprecise. | T1 developer; independent acceptance by manual G | Existing `trunk1-catalog-search.test.cjs`: six exact catalog options, codes searchable with/without hyphen, edit restoration without stale custom override, legacy Other preserved; one later signed seller→buyer ST-35 edit→ST-31 readback. | **Branch fixed** `2141af4`, test `078e536`/fixture repair `eef156b`; final **6/6 V8 harness PASS**, staging **UNKNOWN**. |
| P1 | Legacy broad `ST-31 and later` option still exists for previously saved listings; cannot infer which of six it meant. | T1 developer | Edit a legacy grouped listing, require seller to choose a specific code rather than silently remapping historical data. | **PRESERVED**; not automatically upgraded; signed UX **UNKNOWN**. |
| P1 | Owner atlas `33654.jpg`: long Android native set selection; six more options may increase scroll cost. | Manual G independent UX reviewer | Android-sized mobile light/dark picker screenshot review, wrong selection, skip, Cancel/reentry, scroll and focus; physical Android owner check. | **VISUAL REVIEW BLOCKED**; original JPG bytes unavailable; no browser or physical device proof. |

This was a small catalog correction, **not** an all-TCG/sports audit or complete acceptance. Product code is a set/product identifier, not manufacturer, rarity, grade or printing. The seller and buyer share the existing `deckplaySets`/classification/search pipeline; **actual** publish/edit/buyer discovery remains unverified. No unrelated trunk, shared staging or production edits.

## 2026-11-01 — retro platform collector-first gap delta (T1.3, branch-only)

| Priority | Source / customer impact | Owner and exact check | Fix status |
|---|---|---|---|
| P1 | Broad Sega/Atari could not distinguish Genesis/Mega Drive, Saturn, Dreamcast, 2600 or 7800 games. [Official SEGA](https://www.sega.jp/history/hard/megadrive/index.html) and [Atari](https://atari.com/products/atari-2600-console-joystick-emea). | T1: seller selects Dreamcast, edits from PS5, buyer searches/filters exact platform; repeat 7800 vs legacy generic Atari. | **BRANCH FIXED** [397f5978](https://github.com/bam5693/Deckplay-hq/commit/397f5978ebf95265c144e9d91cc5234566a36e11); fixture 0795316c; V8 3/3 source PASS; staging/UX UNKNOWN. |
| P1 | Five additional native mobile platform choices could make Android select harder to navigate. Screenshot atlas 33656/33658 describes related game-form friction, not these new choices. | T1 + independent reviewer: actual Android-sized light/dark screenshots, scroll/focus/Cancel/reentry, physical phone separately. | **VISUAL REVIEW BLOCKED**; no actual screenshot inspection. |
| P0 | Hockey O-Pee-Chee/Parkhurst manufacturer-vs-product-brand distinction and sports catalog coverage. | T1 / manual integration PR #30; vintage 1983–84 versus modern Upper Deck buyer readback. | **SEPARATE UNMERGED CANDIDATE**; not resolved by platform work. |

**Shared taxonomy:** `gamePlatform` is the seller source; `marketPlatform` copies its options and the edit form clones the same select. Exact saved `Platform:` is used for buyer filters; no inferred 2600/7800 from generic Atari. Focused regression [trunk1-retro-platform-catalog.test.cjs](https://github.com/bam5693/Deckplay-hq/blob/dev/hourly-trunk1/tests/security/trunk1-retro-platform-catalog.test.cjs) 3/3 V8 Node-compatible source harness PASS after test-only corrections; native Node/CI, real browser, signed buyer/seller and deployment parity **NOT VERIFIED**. Static fixture now has 129 rows, not 129 accepted journeys. Jayden/Tanner developer-authored desk scenarios only; no independent second reviewer, original screenshot bytes, rendered light/dark mobile visuals or physical Android. **T1.3–T1.6 unchecked; UX BLOCKED.**
