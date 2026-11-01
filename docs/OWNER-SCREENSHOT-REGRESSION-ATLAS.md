# DeckPlay HQ — owner screenshot lessons and real-customer regression atlas

**Owner instruction (Oct 31 2026):** Review **every DeckPlay HQ screenshot shared for a bug**, not only the most recent Sell screenshots. Act like a customer who cannot afford a frustrating platform. The business is bootstrapped; avoid paid services, giant repeated test suites and feature creep. Do not claim an issue is fixed merely because a unit test passed.

## What is actually available

- The owner supplied **11 JPG attachments in the current conversation**; **10 show DeckPlay mobile UI**, and **one is a GitHub Actions view, not a DeckPlay UI screen**. The screenshot images are attached in the owner chat, **not copied into the repository**. The workers must use the visible descriptions here and request/review the actual image bytes when a pixel-accurate check is required. Never pretend this markdown file contains images.
- Earlier DeckPlay owner screenshots were discussed across prior chats: unreadable Inbox message box; missing/odd profile and Settings Sign Out; password-reset error, missing password visibility and mismatched Cancel; staging login that could not authenticate; double-category listing input; mobile navigation and header search; live-vs-staging discrepancies. These are **historical user bug reports**, not proof that their old image bytes were retrieved or that each is still broken. Verify current version before reopening.
- Any additional owner screenshot: add one indexed record with exact reproduction, category/viewport/theme, customer harm, worker owner, fix commit, independent review and current deployment evidence. No silent skips; deduplicate truly identical problems.

## Current Android Sell screenshots — inspected visible issues

| Screenshot filename | Screen / visible evidence | What Jayden and Tanner must challenge |
|---|---|---|
| 33668.jpg | Sports-card variant Android native selection list | Options relevance, scrolling, correct fields and sport/brand/year/subject |
| 33666.jpg | Pokémon set choices incl. Mega Evolution/Phantasmal Flames | Exact set list, omissions, selection clarity, preserve skipped/unknown choice |
| 33664.jpg | One Piece card variant (regular, parallel, SP, Manga, Treasure, etc.) | Variant vocabulary correct for selected game, no unrelated choices, no forced selection |
| 33662.jpg | Complete deck white/very light subpanel on dark form | Poor contrast and disproportionate form height; decklist readable and quantity checks meaningful |
| 33660.jpg | Preview/photo/save-draft/footer controls | Inconsistent pill-shaped oversized Cancel, clear missing-photo requirements, mobile safe-area and status copy |
| 33658.jpg | Video-game contents quantity unit area | Quantity section clutter/help text too long, realistic item-by-item contents and no unnecessary repetitions |
| 33656.jpg | Video-game listing with Type then Category | **Duplicate choice** and irrelevant card/set/foil instructions for a video-game listing |
| 33654.jpg | One Piece set selection incl. EB-01 through EB-05 | Correctness of displayed releases, optional skipping, very long Android native menu |
| 33652.jpg | Sports brand chooser (Topps/Panini/etc.) | Native menu height, legibility, skipped/unknown choice and dependency on sports selection |
| 33648.jpg | Light mobile onboarding landing panel | White-on-pale heading readability, lengthy text layout, button hierarchy, mobile dock overlap and discoverability |
| 33646.jpg | GitHub interface screenshot, not public DeckPlay UI | Use for process/CI visibility, **not** as evidence of customer interface quality |

**Important**: These are observations, not automatically confirmed root causes or open defects. Native Android `<select>` menus may render as system sheets; a large list is not inherently broken. Test whether users can choose quickly, search or scroll naturally, recover and preserve the value. Do not replace native controls with expensive custom dropdowns without evidence.

## Historical DeckPlay screenshot-derived issues to regress

1. **Inbox**: unreadable text inside opened composer/message box in dark theme; account separation, history and new replies.
2. **Auth**: password-reset error after submit; eye toggle for both password fields; styled Cancel; no hidden/no-op Sign Out, including profile/Settings/header.
3. **Navigation**: signed-in pages reachable from header/dock; staging auth gate not confused with Supabase login; cross-page search routing to marketplace; no hidden content after signing in.
4. **Listings**: Type and Category were redundant across eight types; category-specific help and sets/variants; dark-mode readability; collection/sports/video-game/hardware paths; seller draft, photos, post, cancel; buyer sees published details.
5. **Production parity**: staging-only support/deal-progress/pause controls must not appear live without backend support; preserve rollback and real database guardrails.

## Mandatory Jayden + Tanner real-person task

For each *changed customer journey*, one worker plays Jayden (TCG player, video gamer, buyer, deckbuilder) and one plays Tanner (sports-card collector and seller). They should ask: **Would I understand what to do without a tutorial? Did the app make me answer the same thing twice? Did I lose data? Can I read it on my phone? Would I trust my item/money to this flow?**

- Use screenshots as **negative regression seeds**, not evidence that everything looks good. Change only actually affected flows.
- Mobile at Android-sized viewport, light and dark mode; check focus/keyboard, content below fold, controls not covered by dock, native selection sheet tradeoffs, color contrast and readable labels/help.
- Test complete seller→buyer task with realistic TCG/sports/games/figure samples; use synthetic accounts/fixtures only and clean them safely. Preserve data/security boundaries.
- Run cheap targeted code preflight **before** a focused Playwright journey. No repeated full 660+ suite just to prove an isolated CSS change.
- Record **SCREENSHOT REGRESSION REPORT**: screenshot filename/report, observation, exact reproduction, severity, assigned owner, commit, focused test, independently reviewed UX status (PASS/BLOCKED), deployment version and whether physical Android verified. Screenshots alone are not successful acceptance.

## Priorities for near-zero budget

**P0:** sign-in/signup/reset, wrong-account leaks, publish failures, broken messaging, unusable pages, misleading purchase/payment affordances.

**P1:** duplicate choices, unreadable colors, irrelevant content, confusing menus, clipped controls, inability to finish listing or find exact item.

**P2:** spacing, visual polish, wording and less-used optional selections.

Do not auto-spend, add paid visual-testing products, create another bot, or repeatedly test accepted areas. **A bot that finds a customer-visible problem owns a clear fix-or-handoff and independent acceptance, not just another report.**
