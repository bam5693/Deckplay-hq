# DeckPlay HQ — Work mode clock-in handoff (2026-10-29)

## Latest verified checkpoint — authentication repaired
Read the final section of `2026-10-29-clock-in-development.md` for current evidence. Automated private staging authentication succeeds through the existing trusted OIDC credential exchange; direct uncredentialed browser navigation still receives the intended HTTP challenge. Missing Playwright credentials now fail before launch. Do not rotate secrets or disable protection.

Deployed app `1a8166b`, Worker `a6b99083-db9e-42c8-a674-59cfbc1ca991`: older conversation discovery, date dividers, stable recovered-message read state, full-catalog profile interests, live whole-lot quantity/price feedback and active-only discovery alert prices. Exact source readback verified. The one auth smoke and synthetic buyer/seller desktop/mobile checks passed; one subsequent transport-reset lane passed when retried alone. Continue durable message recovery, older offer-only history and remaining collection/mobile work. `auth_smoke_only` is available for actual auth regressions; `account_readonly_only` avoids full-suite/deployment work for small deployed checks. Do not rerun passing suites simply to clock in.

## Immediate instructions: BUILD, not status-only
Start implementing marketplace features and verified bug fixes on the isolated staging branch. This is an operational handoff, not an instruction to generate another handoff. Continue multiple useful batches until session limits or a genuine blocker. If one feature is blocked, work on another. Do not ask the owner to manually visit GitHub or configure routine tooling when connected tools can do the work. Be a skeptical technical lead: challenge poor ideas, optimize for customer value and zero unnecessary CI minutes. Report real commits, tests, deployment versions and limitations. No fabricated successes.

## Project and hard boundaries
- GitHub: bam5693/Deckplay-hq; branch: test/staging-reporting; draft PR #2. Never merge.
- Staging Supabase: prrrzeelltmyugssqnzk.
- Private staging Cloudflare Worker: deckplay-hq-staging; URL https://deckplay-hq-staging.cstivers56.workers.dev.
- Production deckplayhq.com, production workers/database, main branch, real user/customer data, billing, live payments and shipping are OUT OF SCOPE. Never modify them.
- Safe non-destructive staging-only edits are authorized. No DROP/TRUNCATE/unrestricted DELETE or security bypass; synthetic cleanup only with verified scoped IDs and existing safe fixtures.
- Check for concurrent commits immediately before each write and rebase/reconcile rather than overwrite.

## Verified starting snapshot — refresh before editing
- Branch HEAD as of handoff creation: 995adb27bb672b011847a9417a98a3b6e23d9f1e. This is a snapshot, not a lock.
- Draft PR #2 open, draft, mergeable=false / dirty: has conflicts with main. Do not assume the older roadmap's 'mergeable' note is current. Conflicts do NOT block staging development.
- Latest successful focused staging Actions: run 40901799639, source e9038fde; trusted identity, six private-photo security tests, 2 deployed smoke, 8 local desktop/mobile photo regressions and 2 live desktop/mobile photo tests passed. This does NOT certify later commits or the entire full suite.
- 30-photo/rolling-24h limit is enforced via deckplay_chat.upload_events (not public.message_photo_attachments). Synthetic BUYER reached 30/30; SELLER was 0/30 at previous inspection. Quotas change with time; check before live uploads. Do not disable the limit or repeat the same live photo test unnecessarily.
- Tests/e2e/private-message-photos-live.spec.js now chooses SELLER by default, or BUYER with DECKPLAY_PHOTO_TEST_SENDER=BUYER.
- Workflow .github/workflows/private-staging.yml has photo_only mode, trusted OIDC, focused photo preflight and excludes duplicate photo test from its full deployed browser suite. Focused launcher is .github/workflows/photo-staging-focused.yml. Do not launch a full suite unless cheap preflight is green and relevant app assets are deployed.
- Recent marketplace fix 84f32f06a58405aed672a986fdf1bc2b96dfd5ac ignores non-finite price bounds. Test revisions 1f807f2ab707ed993897014fb20537d6b053e531 and 995adb27bb672b011847a9417a98a3b6e23d9f1e exercise that branch. These are NOT yet executed or deployed.
- Recent profile fix e9adf6b7ddcc24c8cb54abd98857f969cd16807e prevents listing publication from overwriting a collector's chosen profile identity; verify staging parity.
- No active Actions run at handoff inspection. Avoid dispatching an expensive workflow solely to verify docs.

## Clock-in sequence (do these without asking the owner)
1. Read this file, tests/reports/2026-10-27-next-roadmap-handoff.md, latest tests/reports development ledger and current branch/PR/Actions. Check current staging deployment source parity before browser assertions.
2. Check available connected GitHub, Supabase and Cloudflare access and current repo files. Run local/cheap syntax + focused tests first where execution is available; if not available, clearly state that limitation and continue valuable code changes rather than reporting repeated blockers.
3. Confirm the newest price-filter fix and regression are valid. Specifically ensure the browser test's temporary value getter actually executes render() while the getter is installed; a test that restores the getter before render() is not sufficient. Repair if necessary. Include desktop/mobile category coverage, not just Pokémon.
4. Select the highest-value verified customer-facing issue in P0/P1. Implement it, add targeted regression, run available cheap checks, deploy exact staging branch only with correct isolated credentials and source verification, and run targeted browser/API checks. Don't claim deployed without verification.
5. Continue into the next useful batch. Recheck HEAD before every write. Do not spend the whole session generating reports or test-only changes.
6. Update development ledger with exact commit SHA, test pass/fail counts, deploy version, remaining blockers and next work; keep status factual.

## Eight-trunk priority, with real customer behavior first
- P0 inbox: responsive single-thread view, clear back navigation, message drafts, unread badge/account-switch privacy, buyer/seller routing.
- P1 offers/counteroffers/trades: both-party workflows, stale/repeated taps, inventory reservation, transaction locking, recovery after network errors; no live checkout.
- P2 notifications: messages/offers/trades in the relevant thread; Alerts for meaningful favorite/follow activity, no duplicate notifications.
- P3 marketplace search, saved listings, category taxonomy, sports cards, video games, decks, consoles, collectibles, collections, seller profiles and blocked sellers.
- P4 mobile UX and accessibility: Android Back, navigation, modals, focus, touch targets, empty/error states.
- P5 seller listing/editor, photos, profile identity and collection links with permission/privacy controls.
- P6 payment/shipping FEE DISPLAY AND PREVIEW only; no live provider charges, shipping purchases or billing.
- P7 launch readiness: security, staging parity, observability, documentation, performance, no fabricated inventory.
- P8 competitive differentiation: fair transparent fees, offers/trades, buyer/seller trust and category-wide discovery.

## Test personas and coverage
Charles = API/auth/security; Kyle = browser/mobile UX; Tanner = sports collector who also buys/sells/trades; Jayden = TCG/deck-building, video games and collecting, who also buys/sells/trades. These are synthetic role simulations unless an AI runtime is explicitly verified; never claim independent live AI agents from names alone. Cover all canonical category/type paths, not just One Piece, Pokémon or sports cards. Existing 124 category/type fixtures and 496 rollback database journeys are historical evidence; new customer-facing live browser journeys must be verified separately.

## Owner's operating preference
'G' means go: work, make staging-only progress, then report. No repeated approval for routine safe changes. Work mode should clock in and execute; no setup questions, no copying instructions into other sites, no manual user chores unless a genuine permission blocker. Challenge the owner when a request would waste money/time or compromise security. Never touch production.

## Exit report
Give: feature actually changed, commit SHA, checks actually executed and results, deployment/version if any, Actions minutes/run ID if used, genuine blockers, next prioritized batch. Separate code-written, tested, deployed and user-verified statuses.


## Permanent eight-step operating loop — quality AND throughput (owner-approved)
This supersedes any interpretation of the clock-in sequence that rewards activity, test counts, commits, or paperwork over customer value. **Optimize verified, usable customer-facing improvements per session**, subject to safety and maintainability. Never skip a necessary security or correctness gate for speed.

1. **Inspect once, then build.** At clock-in check branch HEAD, current staging version, PR/CI, unresolved failures and roadmap. Recheck only facts that may have changed (especially HEAD before writes, deployment parity before verification). Avoid repeatedly auditing resolved issues.
2. **Select the highest-impact customer problem.** Prioritize working buyer/seller messaging, offers, trades, listings, search, collections and mobile navigation. Confirm a defect or missing behavior before implementing; do not chase whichever test failed most recently.
3. **Complete a small vertical slice.** Implement one coherent customer-visible feature/fix end to end with minimal necessary regression coverage. Avoid scattering unfinished work across multiple trunks.
4. **Cheap preflight first.** Use syntax/static checks, isolated logic checks and targeted local browser tests when execution is available. Don't consume GitHub Actions minutes for issues detectable locally.
5. **Diagnose failures, don't rerun blindly.** Inspect the exact failing assertion/log and root cause; fix it or move to another safe task if blocked. Do not repeatedly rerun unchanged failing workflows or bypass security/quota limits.
6. **Deploy exact isolated staging source and verify.** Confirm source/version parity and preserve secrets/asset bindings; test affected desktop/mobile and relevant category paths with synthetic accounts. Only run broader regression at meaningful integration milestones. Code written != tests passed != staging deployed != user-verified.
7. **Record concise evidence and advance.** Report feature behavior, exact commit(s), actual checks/results, deployed version, remaining risks and next priority. Avoid documentation-only cycles unless required for a real blocker.
8. **Repeat without waiting.** Move directly to the next highest-value safe slice until session/tool limits or a genuine blocker; use another independent task when one is blocked. Ask for approval only for genuinely sensitive/destructive actions.

### Throughput and quality guardrails
- A good session ships at least one verified customer-facing improvement when the tools and staging environment permit. A useful feature is worth more than twenty test-only commits. If none ships, explain the precise technical reason rather than implying progress.
- Tests must prove the changed behavior: a passing test that does not exercise the branch is a defect in the test.
- Preserve working behavior across all marketplace categories and personas; don't narrow to Pokémon, One Piece, or sports cards alone.
- Don't repeatedly burn CI minutes on a flaky/full suite; targeted tests during development, full regression only for release/integration milestones.
- Don't force staging deployment when credentials, parity, or safety checks fail; continue safe source development and report the blocker.
- This process is the default for every Work mode clock-in and every 'G' development cycle. No need for the owner to paste it again.
