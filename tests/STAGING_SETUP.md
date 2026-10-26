# DeckPlay HQ isolated staging setup

## Current verified state
- Staging Supabase project: `prrrzeelltmyugssqnzk` (separate from production).
- Staging Worker: **not yet deployed or verified**.
- Staging tables: 20 at last inspection, with RLS enabled.
- Staging browser tests: written, **not yet run successfully**.
- No real payments, prepaid labels, or production member data should be used.

## Deployment (manual and gated)
1. Review the draft pull request and merge only after checks/review. GitHub scheduled workflows execute from the default branch; adding a schedule on a development branch does not start it.
2. Create the GitHub environment `deckplay-staging`.
3. Set environment secret `CLOUDFLARE_API_TOKEN` (scoped to deploy Workers) and variable `CLOUDFLARE_ACCOUNT_ID`. Do **not** put either in source code.
4. Manually run **Deploy isolated staging website**. It uses `wrangler.staging.jsonc`, deploys only Worker `deckplay-hq-staging`, and builds assets with the separate staging Supabase publishable key.
5. Confirm the actual HTTPS `workers.dev` staging URL and set environment variable `DECKPLAY_STAGING_URL`. Verify it is not the production domain.
6. Configure Supabase Auth redirect allowlist for the staging URL and approved Turnstile test configuration for staging. Do not disable production protections.
7. Create two staging-only users and set GitHub environment secrets `DECKPLAY_TEST_SELLER_EMAIL`, `DECKPLAY_TEST_SELLER_PASSWORD`, `DECKPLAY_TEST_BUYER_EMAIL`, `DECKPLAY_TEST_BUYER_PASSWORD`.
8. Run **Private staging account verification** manually; only after successful runs should its daily schedule be treated as operational.

## What reports prove
- Smoke tests verify basic rendering, mobile overflow, and separation from production URLs.
- Account tests verify login UI and authenticated sign-in when configured.
- Full listing, offer, trade, notification, locking, dispute, shipping and payment flows **are not yet tested or certified**.
- Failing configuration is a failing test, not a pass. Save Playwright screenshots, traces, and JUnit reports for review.
- Keep live payments and shipping labels disabled in staging. Never copy customer credentials.

## Cost and safety
GitHub Actions, Cloudflare Workers and Supabase each have quotas and potential charges. Check plan usage before enabling frequent schedules. No AI coding service is required for these browser checks.
