# Isolated staging

Worker: `https://deckplay-hq-staging.cstivers56.workers.dev`.
Database: `prrrzeelltmyugssqnzk` only. Production must never be used for simulations.

The Worker requires username `deckplay` and the secret `STAGING_ACCESS_PASSWORD` for every route. Secrets are never written to source. The Worker fails closed if this secret is absent. Its frontend uses official Turnstile test site keys; this does not certify production CAPTCHA enforcement.

## Reproducible deployment
1. Build with `DECKPLAY_STAGING_SUPABASE_URL` and `DECKPLAY_STAGING_SUPABASE_KEY` targeting the exact staging project: `node scripts/build-staging.cjs`.
2. Run `node scripts/build-staging-worker.cjs`.
3. Deploy only with `wrangler.staging.jsonc` and a staging-scoped Cloudflare token. Keep existing secrets. Never deploy through the production configuration.
4. Configure Worker secrets `STAGING_ACCESS_PASSWORD`, `TEST_SELLER_PASSWORD`, `TEST_BUYER_PASSWORD`. Test identities are `deckplay-seller@deckplay.test` and `deckplay-buyer@deckplay.test`, confined to staging.
5. SQL under `supabase/staging/` describes staging-only changes. It is not a production migration and is not automatically applied by either deployment workflow. The initial staging schema was provisioned before this branch and is not a complete reproducible schema dump.

## Tests
- `npm ci`, then `npx playwright install --with-deps chromium`.
- `npx playwright test --config=playwright.local.config.js`: local mobile/desktop UI simulations built against staging configuration. Does not certify real transactions.
- `node scripts/run-staging-api.cjs`: real staging APIs, dedicated account credentials from environment.
- `node scripts/run-staging-browser.cjs`: deployed staging browser checks; exact staging origin is enforced.
- Required environment: `DECKPLAY_TEST_SELLER_EMAIL`, `DECKPLAY_TEST_SELLER_PASSWORD`, `DECKPLAY_TEST_BUYER_EMAIL`, `DECKPLAY_TEST_BUYER_PASSWORD`, `DECKPLAY_STAGING_URL`, `DECKPLAY_STAGING_ACCESS_PASSWORD`.
- In this workspace only, ignored `.staging-credentials.json` supports secure test setup. Do not upload this file or include its contents in reports.

## Automation and evidence
The private GitHub workflow requires the above secrets/URL in environment `deckplay-staging`. A missing value is a failure, not a skipped pass. It uploads HTML, JUnit, screenshot/trace evidence and API TAP output. Reports/traces can include synthetic test sessions; keep artifact retention short and never use real accounts.

GitHub cron in a draft branch is inactive until on the default branch. Worker health probes and their durable `staging_test_runs` reports are separate from the full transaction/browser suite. A passing health probe proves logins/read endpoints, not all marketplace behavior.

Do not merge or deploy production without Coty's approval. Production deployment workflow changes in this PR make production deployment manual and place it in a `production` GitHub environment; environment approval rules still require repository configuration.
