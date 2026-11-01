# DeckPlay HQ — branch-isolated development (owner approved 2026-10-31)

**The old shared lease is retired.** Do not read, acquire, renew or write `deckplay-session-lease.json` on `ops/deckplay-session-lock`. That branch/file is historical only and not an active development gate. No session should stop just because it cannot acquire that former lock.

## Two independent development lanes

- **Manual G:** owns Trunks 1, 2, 3, 5, 6, 7 and 8 (NOT Trunk 4), and may develop on `test/staging-reporting`; validate current HEAD before write, always use the latest contents SHA, and never force-update a ref or overwrite divergent changes.
- **Hourly developer:** exclusively owns Trunk 4 (T4.1–T4.6 Discovery and Collections), starting with T4.1 favorites; works **only** on `dev/hourly-autonomous`. No direct edits to staging, `main`, production or the retired lock branch. It must not run shared staging deployments or stateful staging DB tests.
- Read-only daily watches do not change code. If one lane's work needs the other lane's changes, use a reviewed integration PR / ordinary non-force merge after resolving conflicts, rather than forcing or resetting either branch.
- At each manual G, read `docs/ACTIVE-DEVELOPMENT.md` on staging first; if its active task is T4, leave that to the hourly owner and select one unfinished item from Trunks 1/2/3/5/6/7/8. Resume the manual lane's next unfinished task; the hourly lane maintains its own brief handoff on its branch without overwriting the staging checkpoint. Preserve accepted V1 evidence and run only focused tests justified by actual changes.
- Independent code edits on different branches can happen concurrently. Shared test fixtures, database migrations, deployed staging and final integrations must remain serialized with existing GitHub Actions `concurrency` controls and explicit preflight; no parallel staging DB writers.

## Active Actions visibility (deployment/test coordination only)

The connected GitHub generic fetch supports repository-wide runs. Read:

- `https://api.github.com/repos/bam5693/Deckplay-hq/actions/runs?status=in_progress&per_page=100`
- `https://api.github.com/repos/bam5693/Deckplay-hq/actions/runs?status=queued&per_page=100`

If both have `total_count: 0`, Actions are clear. If nonzero, check branch/workflow and yield **only for a genuinely conflicting shared staging operation**, not unrelated local read-only tests. Check pagination if counts exceed one page. Do not treat lack of Actions data as permission for a conflicting deployment.

## Safety boundaries

This branch split is not production approval. No merges to `main`, public deployment, payment activation, billing changes, destructive SQL, secrets exposure, or real customer data modification without separate owner approval. Private staging must remain private. Never bypass tool-level safety rejections by repackaging blocked actions.


## Worker 2 — Trunk 1 ownership (2026-10-31)
- Hourly Developer 1 exclusively owns T4.1–T4.6 on `dev/hourly-autonomous` (top of hour).
- Hourly Developer 2 exclusively owns T1.1–T1.6 on `dev/hourly-trunk1` (half past the hour), reports via `docs/HOURLY-TRUNK1.md` on its branch, and proposes reviewable PRs.
- Interactive G developer owns T2,T3,T5,T6,T7,T8 and reviews/integrates T1/T4 PRs. Do not independently develop Trunk 1 except coordinated integration or urgent owner-approved fix.
- Trunk 9 is research/advisory only, independently scheduled daily.
- Neither hourly worker may commit to `test/staging-reporting`, deploy to shared staging, merge PRs, modify production, or use the retired session lease. Coordinate integration by checking active GitHub Actions and using focused acceptance evidence.

## Owner directive — customer usability is a release acceptance gate (2026-10-31)

**Why this exists:** Real Android owner review of published V1 found listing type/category were selected twice, irrelevant TCG help on a video-game form, dark-mode fields with unreadable contrast, an inconsistent Cancel button and excessively tall selection/form flows. Previous category/browser/security tests passed because they verified function, not practical usability. Treat this as a **real regression to prevent**, not a reason to rerun every historical test.

For any changed buyer/seller flow, developer and reviewer must use a **Jayden + Tanner adversarial walk-through**, even if test automation is green:
- **Jayden (player/buyer):** buy, find exact card/printing/variant, build/search a deck, compare/offer/trade, use Inbox, recover from empty/error/offline states. Ask "Why am I making this decision twice? Can I find the right item quickly?"
- **Tanner (collector/seller):** list representative sports cards, TCG singles/decks/lots, video games/hardware, collectible figures; edit/preview, quantity/condition/price, manage, save draft, cancel, reopen and post. Ask "Is anything irrelevant, redundant, hidden, unreadable or unexpectedly reset?"
- **Mandatory cross-category matrix:** For the affected form, cover all exposed top-level listing types with one direct assertion each (currently single/deck/lot/sealed/game/console/figure/other), plus representative category-specific details (TCG set/variant, sports, platform/hardware, collectible). Verify one category choice, relevant follow-ups, validation and buyer-facing display. Reuse existing matrix where valid; do not invent repetitive work.
- **Mobile usability:** Android-sized mobile viewport, light AND dark appearance, long menus/input focus/keyboard, contrast (labels, placeholders, help, fieldsets), scrolling, buttons at bottom, no clipped or giant controls. Responsive desktop as appropriate. Device emulation is **not** physical Android; mark physical owner acceptance as pending until observed.
- **Negative experience assertions:** no double category picker, irrelevant card help on video-game listings, unreadable fieldsets, broken Cancel/sign out, dead controls, stale account data, or fake success states. Record what actually failed, code fix and focused evidence.
- **Evidence artifact:** each release-affecting PR must contain a short `UX ACCEPTANCE` section naming persona, journeys, viewport/theme tested, defects found/resolved, exact commit/run, and any actual phone unverified caveat. A merely passing unit test or browser smoke is insufficient to call customer usability accepted.
- **Gate ownership:** Feature developer self-reviews; a **separate reviewer/worker** examines the changed journey for unnecessary steps and inconsistencies, not just assertions supplied by the developer. Interactive G integration lead owns final UX gate and has authority to hold a release. Hourly T1 developer reviews its seller/listing slice; hourly T4 developer reviews its discovery/collection slice. Trunk 9 may flag competitor UX gaps but does not approve app functionality.
- **Failure policy:** Report `UX BLOCKED` with precise screenshot/steps if usability is not demonstrated. Fix before shipping; no checkbox or 100% trunk claim based solely on code/test presence. Avoid large recurring audits or testing already-accepted unaffected flows.
- **Safety:** No bot may bypass the usual branch isolation, protected staging, production migration/backup approvals, or owner release permission in pursuit of usability fixes.
