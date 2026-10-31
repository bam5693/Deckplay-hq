# DeckPlay HQ — V1 focused recovery and T7 private staging acceptance
Date: 2026-10-31 (America/Chicago)
Branch: `test/staging-reporting`
Environment: isolated private Cloudflare Worker `deckplay-hq-staging`; no production deploy.

## Verified results
- Earlier full V1 audit `41248746289`: 978 browser passed, 6 failed; 102 security passed. It remains historically failed and should **not** be relabeled green.
- Former eight failing browser cases were retested: focused run `41249502237` PASS (8/8).
- Final six failing V1 browser cases: focused run `41251642745` PASS (6/6) after test fixture fixes (account-change, offline refresh banner, profile-share fixture).
- Private-staging deploy `41251768773` successfully completed cheap local preflight, Cloudflare deploy, trusted runner credentials and exact served asset/anonymous-denial verification. Its overall conclusion was FAIL because **one** mobile buyer category acceptance case observed `listingSource="loading"` during a refresh; the other five acceptance cases passed. This failure was not a deployment failure.
- Test stabilization at `08afeae` waits for each category's live catalog state before checking rendered listings and selected category; it does not skip verification or weaken app rules.
- A standalone test workflow correctly received HTTP 401 `Untrusted claim workflow_ref` and did not run. This was not bypassed; unused workflow file removed at `fc9cdee`.
- Reused the approved `private-staging.yml` workflow with a narrowly scoped, read-only mobile buyer diagnostic. It preserved authorized OIDC exchange and skipped broad acceptance/deployment jobs. Run `41252134695` PASS, verifying signed mobile buyer category browsing, listing consistency and empty-search recovery on the already deployed private staging site.
- T7 seller share/preview buttons exist in staging source and local browser coverage exists; real owner-device T7 sharing and signed-in physical Android/PWA review remain separate acceptance work.

## Release limits
- No `main` merge, production deploy, checkout/payment activation, live customer data modification, or billing change.
- This is **not** a fresh comprehensive all-green V1 audit at latest source; avoid repeating it until a release candidate is frozen.
- No need to rerun previously green targeted tests unless source behavior materially changes.
- Keep private Basic Auth gate and trusted identity allowlist intact.
