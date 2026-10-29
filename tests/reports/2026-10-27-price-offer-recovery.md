# Price-offer recovery — October 27, 2026

## Scope and reproduction

Staging branch `test/staging-reporting`, draft PR #2 and private Worker `deckplay-hq-staging` only. Starting head: `47c50560ea50873e0ea688ebed2e692b622b5bfb`. Latest initial staging run `40585222478` succeeded; no transaction workflow was active before deployment. Production, main, real users/data, database schema, triggers, payments, shipping and billing were not changed.

Two regressions were reproduced before the fixes. Submitting the new-offer form twice synchronously produced two RPC requests instead of one. The price-offer response panel also allowed repeated synthetic clicks; exceptions escaped its handler and left the clicked button disabled.

## Changes

Verified code commit: `1f6b40e2a3863ddc9b857ecfb6ace6381b2d2698`.

- New price offers allow one pending submission, disable the Send button and restore it after success or failure.
- Service exceptions keep the entered amount and provide an error message so the collector can retry.
- The request captures its user, listing, dialog context and draft revision. Late responses cannot close a different offer dialog or expose the old account's error to a new account.
- If the collector edits an amount during a pending request, the completed offer reports its original amount and retains the newer draft.
- The client rejects amounts above $100,000 even when native form validation is bypassed. Existing server validation remains authoritative.
- Price-offer accept/decline/counter/withdraw actions guard pending offer IDs, restore controls in finally, catch connection failures, and suppress stale account responses and refreshes.

## Verification

- 228 local desktop/mobile browser checks passed with no failures, retries or skips. Twelve new checks cover duplicate submissions, exceptions/retry, draft retention, account changes, amount limits, and response-panel recovery.
- 29 authorization, reviewer and cleanup security checks passed.
- Inline scripts parsed and whitespace checks passed.
- [Current real staging run 40587483500](https://github.com/bam5693/Deckplay-hq/actions/runs/40587483500): completed successfully: 48 API checks and 44 deployed desktop/mobile journeys passed, without retries or failed/skipped test cases.

The new error/race tests simulate Supabase responses locally. Existing deployed buyer/seller journeys separately test normal real offer submission and negotiation; the new local cases do not imply server idempotency after an uncertain network outcome.

## Deployment evidence

The content-only API updated the existing private Worker. Downloaded deployed module SHA-256 exactly matched the local build: `c9531225749a234b1efd21dbf46805f537a230d70b2c36a01da5ee35ca97099a`.

Homepage SHA-256: `1789e7e59dcaf6577b53fa7fcc10656b0f653d2d5dd34bbcd22110e09145ba2c`.

Worker settings, all three secret binding names and three cron schedules were compared before/after and remained identical. An independent unauthenticated HTTP request returned 401. Deployed browser tests continue to compare the served homepage with their exact staging build.

## Remaining roadmap

Continue inbox/trade recovery and accessibility; evaluate consistent deck quantity and description handling, collection/missing-card workflows, moderation and fulfillment. Real email delivery, full reset/upload lifecycles and production CAPTCHA remain uncertified. Payments and shipping remain disabled/preview-only. No destructive migration or additional database permission was needed.
