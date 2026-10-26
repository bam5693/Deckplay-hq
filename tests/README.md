# DeckPlay HQ testing

## What passing checks mean

- **Production deploy / local browser workflow:** JavaScript validation and isolated local Playwright UI simulations. These do not prove real account login, offers, trades, or payment/shipping.
- **Private staging account verification:** A separately triggered workflow, configured for an isolated staging host and two test users. A passing run proves only that both users could sign in.
- **Full buyer/seller transactions:** Not yet implemented or verified. Do not report them as passing.

## Security and isolation

The production site must not be used as the staging test target. Never use production Supabase tables, production Turnstile challenge bypasses, real payment processing, or live shipping labels for automated tests. Staging needs its own data and approved test Turnstile configuration.

See [STAGING_SETUP.md](STAGING_SETUP.md) for setup instructions. The account tests fail rather than silently skip when staging is explicitly configured but its credentials or CAPTCHA validation are unavailable.

## Status

The staging workflow has been added on a draft pull request. It is not a claim that staging is deployed or verified. End-to-end offer/trade/notification tests remain to be built.
