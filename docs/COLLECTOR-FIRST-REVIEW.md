# DeckPlay HQ — collector-first acceptance (staging only)

## Why the old tests missed owner's bugs
A selected dropdown, successful publish API, or 496 fixture paths can all pass while a customer sees redundant category questions, irrelevant TCG help on video games, unreadable dark fields, a mismatched Cancel button or a painfully long mobile form. **Functional pass is not customer acceptance.**

## What actually exists
- Charles and Kyle run deterministic checks, not independent AI customers.
- Tanner and Jayden appear in browser scenarios; the optional private Workers AI text reviewer uses `scripts/ai-leads.mjs` to critique supplied synthetic observations. It does **not** automatically navigate the app, view images, or read all prior owner's screenshots.
- An AI model is only considered operational if a protected reviewer deployment and authenticated inference response are independently verified. A configuration or successful mock test is not proof.
- No task may claim a second independent humanlike visual review when only one developer authored both the journey and the assertions.

## Owner's actual bug history
Read [OWNER-SCREENSHOT-REGRESSION-ATLAS.md](OWNER-SCREENSHOT-REGRESSION-ATLAS.md) first. Its ten Android screenshot IDs (33668, 33666, 33664, 33662, 33660, 33658, 33656, 33654, 33652 and 33648) are regression seeds, **not proof current staging is broken or that the model saw pixels**. Review original screenshot bytes only when genuinely available; never substitute remembered descriptions for visual analysis.\n\n## Real-customer review sequence (run only for affected features)
1. **Choose a mission before seeing the UI.** Select a relevant case from `tests/fixtures/collector-challenges.json`. State exactly what the customer owns or wants, grade/edition/printing, and whether buyer/seller/trader. Use history-accurate brands.
2. **Try it cold.** Start as an ordinary visitor, not from a test locator or developer shortcut. Find the listing path or desired product using the UI; if confused, document the confusion rather than reading code to find the answer.
3. **Seller and buyer must agree.** Enter the product accurately; check preview, publish, saved state, edit, buyer search/filter, details, contact/offer/trade when affected. Test mismatch between typed search aliases and canonical catalog terms.
4. **Deliberately attack the experience.** Ask: Am I selecting the same thing twice? Is a choice irrelevant? Do I have to use Other for a common release? Does the product line get treated as a manufacturer? Is this one screen too tall? What will a first-time seller assume? How does a buyer find the same listing?
5. **Check actual visuals.** Inspect *screenshots*, not just screenshot-file existence, at Android-sized viewport in light AND dark mode; check long dropdowns, labels/placeholder contrast, scrolling, tappable controls, keyboard/focus, Cancel and Back. Text-only Workers AI cannot inspect screenshots: use an authorized image-capable reviewer or explicitly mark **VISUAL REVIEW BLOCKED**. Browser emulation is not physical Android.
6. **Try unpleasant reality.** Empty search, no results, slow/offline failures, interrupted form, stale listing, wrong account, denied action, rejected offer, ungraded versus graded, missing images, save/restore, and editing an existing listing.
7. **Record evidence honestly.** Record exact commit, category and case ID, persona, buyer/seller accounts (synthetic IDs only), URL/path, viewport + theme, clicked steps, expected vs actual, screenshot/artifact link, severity, owner and suggested focused regression. Distinguish static, mocked, signed staging, visual review and physical device evidence.
8. **Second reviewer challenges it.** Do not merely re-run first author's assertions. Ask one unprompted question from a different hobby and a different buyer/seller role; independently describe any confusing screen.
9. **Fix the customer outcome.** Smallest safe fix + targeted regression that fails with original bug; avoid inflating test count. Repeat only the affected journey. If any major complaint remains, mark UX BLOCKED and move to next independent work.

## Triggers that automatically hold UX acceptance
- Duplicate listing type/category or other repeated decisions, irrelevant game-specific tips and fields
- Known high-volume product trapped in Other, missing sport/platform/product line, conflated manufacturer/product brand/set (e.g. modern Upper Deck vs vintage O-Pee-Chee)
- Buyer cannot find published listing using normal product names or aliases
- Raw/graded condition, sealed/loose product or variants misrepresented
- Mobile dark/light contrast, hidden controls, giant scroll, broken Cancel or Back, false success, account leakage
- Missing real screenshot examination where visual quality was the subject of review; unverified actual Android behavior claimed as passed
- No distinct reviewer or no reproducible steps when customer-visible feature changes

## Ownership / routing
- **Jayden:** player-first TCG singles, decks, printings, OP/EB/ST/PRB products, Pokémon sets, other TCGs, video games and compatibility. Rotate into sports and collectibles.
- **Tanner:** sports by baseball/football/basketball/hockey/soccer/racing, vintage versus current product brands, slab/raw, listing quality, collectibles, sales. Rotate into TCGs and gaming.
- **Kyle:** seller form, draft/edit, specific category hierarchy, condition, quantity, image flows, offers/trades and mobile browser.
- **Charles:** anonymous/signed buyer discovery, real search terms and aliasing, filtering, privacy, identity, Inbox state, error/recovery and mobile navigation.
- **Integration lead:** independent reviewer check, bug triage, final customer-journey evidence and release hold; T1 hourly worker owns catalog implementation on its separate branch. Trunk 9 may advise on competing marketplace conventions, not assert verified DeckPlay behavior.

## Catalog audit scoreboard
Run `node scripts/collector-catalog-audit.cjs` (or `--json` for detailed output), then `node --test tests/security/collector-catalog-audit.test.cjs tests/security/ai-leads.test.mjs`. A zero exit is a successful *audit*, not zero catalog gaps. `PRESENT` means option appears in the extracted fixture; `MISSING_IN_SNAPSHOT` is a likely coverage gap; `NOT_TRACKED` means the existing extraction does not expose that field, **not** proof of absence. All cases remain `NOT_TESTED_BY_SNAPSHOT` for buyer/seller behavior until actual evidence is attached.

Review high-priority gaps before expanding dropdowns. Favor one shared taxonomy across selling and buying, narrow progressive choices and searchable product metadata rather than a giant dropdown. New data-model or UI changes require separate staged implementation and the owner's production approval as before.

## Review packet / signoff format
`Case ID | Author | Independent reviewer | Buyer goal | Seller goal | Sport/game/platform | Brand/manufacturer vs product line vs set | Expected vs actual | Mobile light screenshot | Mobile dark screenshot | Search/filter result | Error/recovery result | UX status | Functional status | Unverified areas | Exact source/ref and targeted tests`

**Allowed dispositions:** READY, UX BLOCKED, FUNCTIONAL BLOCKED, PRODUCTION-COMPATIBILITY BLOCKED. READY still requires normal deployment, backup and owner gates. Never report 100% based on test count.
