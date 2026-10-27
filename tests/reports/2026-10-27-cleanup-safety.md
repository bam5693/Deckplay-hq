# Staging cleanup safety — October 27, 2026

Scope: staging branch `test/staging-reporting`, draft PR #2, and existing isolated test fixtures only. No production changes, schema migrations, trigger replacements, broad deletion, new services or billing changes.

## Continuing development safely

Prefer non-destructive staging-only changes. For cleanup, use exact synthetic markers, verified IDs and safe WHERE conditions. Avoid DROP, TRUNCATE, unrestricted DELETE, and trigger replacement. Explain any necessary destructive migration before requesting approval. If approval or a database tool blocks a task, continue independent safe GitHub development and testing. Never change real user data.

## Changes in 47d4e300211e835f38c2a412330dfb51bec88d09

- Both staging HTTP transports reject every origin except `https://prrrzeelltmyugssqnzk.supabase.co`, including credential-bearing URLs and deceptive lookalike hosts, before starting curl. Existing 30-second request deadlines remain.
- Browser cleanup requires an exact generated UUID fixture marker, the private staging page, the staging Supabase URL, and one of the two dedicated bot identities.
- Before removing uploaded photos, cleanup selects exact-marker, exact-owner listings and verifies returned UUIDs, marker and ownership. Only exact UUID photo filenames referenced by those rows and under that bot's storage directory qualify. Shared test images, foreign paths and external photos are retained.
- Account/session changes stop cleanup. Listing lookup, storage deletion and the existing marker-scoped cleanup RPC share a 20-second network abort deadline. Storage failures retain fixture rows for diagnosis.
- The existing database cleanup function is reused without changing its definition. New safety checks run before API mutations in the private staging workflow; the browser workflow now runs all security unit checks.

## Verification

- 216 local mobile/desktop browser checks passed with no failures or retries.
- 29 security checks passed, including seven new cleanup/transport boundary checks. These use synthetic in-process clients and do not certify real database cleanup by themselves.
- All five inline scripts validated; git whitespace checks passed.
- Previous deployed run [40581925756](https://github.com/bam5693/Deckplay-hq/actions/runs/40581925756) was inspected directly: 48 API and 44 deployed browser checks passed with no test retries, failures or skips. Its pending PR summary was stale.
- Current [staging run 40585222478](https://github.com/bam5693/Deckplay-hq/actions/runs/40585222478) completed successfully: 48 API checks and 44 deployed desktop/mobile browser journeys passed. The new fixture cleanup safety gate also passed on the GitHub runner. No test failures, retries or skipped test cases occurred. The conditional failure-reporting job was skipped because no failure occurred.

That is 308 marketplace checks plus 29 security checks across these distinct layers.

The marketplace UI and Worker source are unchanged by this batch, so no deployment is needed. The deployed browser suite still compares the served homepage with this branch build. No new database migration was submitted.
