# DeckPlay HQ testing

Use [STAGING_SETUP.md](STAGING_SETUP.md) for isolation, deployment and credentials.
Read [reports/2026-10-26-progress.md](reports/2026-10-26-progress.md) for actual verified results and outstanding work.

Three distinct test layers exist:
- Local mobile/desktop UI simulations: forms, category controls, checkout preview, navigation, startup errors and dialog keyboard handling.
- Staging API integration: actual dedicated-account authentication, persisted data, offers/trades, ownership restrictions and reservation locks.
- Deployed staging browser: real sign-in and buyer/seller interaction via the password-gated separate Worker.

A configured test is not a verified result. Report failures, retries and unsupported features explicitly. Never target production or activate live payments/shipping.
