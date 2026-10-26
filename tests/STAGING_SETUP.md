# Private staging verification (not production)

## Current status
Local UI simulations do **not** prove buyer/seller transactions. The separate staging workflow currently checks sign-in for two accounts only. Offers, trades, notifications, checkout, and transaction locking are **not yet certified**.

## Prerequisites
1. Provision a separate HTTPS staging/preview/test hostname with an isolated Supabase test project and non-production data. Do not point it at production tables, payments, shipping, or email delivery.
2. Configure the staging site to use approved Cloudflare Turnstile test keys. Do not disable production verification or spoof challenge tokens.
3. Create two dedicated staging-only users and store their credentials in GitHub environment `deckplay-staging` secrets:
   - `DECKPLAY_TEST_SELLER_EMAIL`
   - `DECKPLAY_TEST_SELLER_PASSWORD`
   - `DECKPLAY_TEST_BUYER_EMAIL`
   - `DECKPLAY_TEST_BUYER_PASSWORD`
4. Set environment variable `DECKPLAY_STAGING_URL` to the HTTPS staging hostname.
5. Manually dispatch `Private staging account verification` from the staging branch.

## Interpretation
- Green local UI CI: interface simulations passed, **not** authenticated buyer/seller flows.
- Green private staging workflow: both staging sign-in tests passed, **not** full transactions.
- Red staging workflow: staging is unconfigured, challenge blocked, or an actual login failed; inspect the job logs.
- No staging workflow run: staging is **not verified**.

## Next steps
Implement isolated two-browser-context tests for offers, counteroffers, acceptance, inbox, listing lock, trades and cleanup; report these as separate stages. Keep payments and shipping disabled.
