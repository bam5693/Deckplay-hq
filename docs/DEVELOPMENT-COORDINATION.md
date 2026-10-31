# DeckPlay HQ — one-writer development coordination

This rule applies to BOTH interactive `G` development sessions and the scheduled hourly developer. The daily staging watch is read-only and does not acquire the development lease.

**Single coordination record:** `deckplay-session-lease.json` on GitHub branch `ops/deckplay-session-lock` (NOT on `main` or the staging PR). It is public coordination metadata only; never put secrets, passwords, customer information or conversational content in it. This separate branch prevents hourly lease bookkeeping from adding noise to draft PR #2.

## Mandatory one-writer protocol

1. **BEFORE development** (including test dispatches, staging deploy requests and repo edits), fetch this exact lease file with `ref=ops/deckplay-session-lock`. Also check ongoing queued/in-progress GitHub Actions and recent `test/staging-reporting` HEAD activity. If the lease read fails or the lock is malformed, **fail closed**: no development writes, tests or deployments.
2. If `holder` is non-null and `expires_at` is still in the future, it belongs to another session: **do not start** the same work, push, deploy or launch CI. Scheduled runs should silently skip; manual `G` sessions should explain that another developer currently owns the work and can offer a read-only review.
3. If idle or expired, check for an existing in-progress or queued staging write/deploy/test workflow attributable to another session. Treat unknown ownership conservatively; skip instead of taking over. Also skip a scheduled run if staging was edited by another actor within the last 20 minutes, even when no lease exists (backup collision signal; it is not a perfect chat-activity detector).
4. To acquire, replace the **same lease file** through GitHub's contents API using the blob `sha` from the fetched file, `branch=ops/deckplay-session-lock`, with fields: `version:1`, `project`, `scope`, `holder:\"manual-g\"|\"hourly\" `, unique opaque `token`, short generic `focus`, `acquired_at`, `expires_at` in UTC (45 minutes ahead), and `updated_at`. If GitHub reports a mismatch/conflict, **re-fetch and yield**, never force overwrite. Re-read to verify the stored token is yours before proceeding.
5. **Heartbeat:** while actively developing, renew `expires_at` at least every 15 minutes with the same token and the latest blob SHA. Before every commit/test/deploy, check the token is still yours and that the lease has not expired; also recheck staging HEAD before editing to avoid erasing unrelated changes. If ownership is lost, stop and do not write.
6. **Release:** at the end of this session, change `holder`, `token`, `focus`, `acquired_at`, `expires_at` to null, only after rereading and confirming the token matches. Always try to release on error. Never clear a different owner's active lock. Expired locks can be replaced by a new session after step 3.
7. Give an interactive owner-triggered `G` session priority at the next opportunity, but **do not preempt an already-writing hourly run**; wait for it to release. This rule coordinates cooperative sessions, not external humans or chat tabs that fail to follow the protocol.

**Important limitation:** GitHub does not expose reliable live ChatGPT chat activity. A manual session that has not claimed the shared lease is invisible until it writes or launches CI. All `G` conversations must follow this protocol; a recent-commit/CI check is a conservative fallback, not an exact session detector.

**No other boundaries change:** private staging only; no `main` or production changes, merges, payments, shipping, customer data, secrets, destructive SQL or spending without their own explicit approval. Release-candidate preparation also honors this one-writer lease.

## Authoritative active Actions check — mandatory for every G and hourly run

Use the connected GitHub **general fetch** action (not the limited fetch_commit_workflow_runs action) for these exact repository-wide REST URLs:

- `https://api.github.com/repos/bam5693/Deckplay-hq/actions/runs?status=in_progress&per_page=100`
- `https://api.github.com/repos/bam5693/Deckplay-hq/actions/runs?status=queued&per_page=100`

Parse `total_count` and `workflow_runs`. If both are zero, the Actions check is CLEAR; do not invent uncertainty or block the manual G. If nonzero, inspect the run's workflow, head_branch and purpose: only staging writes/deployments/migrations or conflicting tests require yielding. Ignore unrelated read-only or production/manual-only checks when they cannot overlap staging (but do not modify production). If a page is full (100) or total_count exceeds returned items, paginate before claiming clear. If fetch errors, malformed responses or permission errors occur, fail closed on conflicting staging writes and state the exact error; do not repeatedly claim the API is unavailable. Also verify the shared lease separately and acquire/confirm ownership using SHA compare-and-swap before writing. Continue the latest unfinished customer feature after clearing these two gates; do not rerun accepted V1 items without a demonstrated impact.
