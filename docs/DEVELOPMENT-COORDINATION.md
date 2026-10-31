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
