# T2.1 / T2.4 real signed messaging acceptance — 2026-10-31

## Verified
- Focused trusted GitHub Actions run: https://github.com/bam5693/Deckplay-hq/actions/runs/41232013150
- Exact source ref for successful run: `74b37fbd880e28b18e6f55638438d5deb8566a87` on `test/staging-reporting`.
- Staging Worker version: `59e4d096-abc5-450c-abcd-b471b39c4925`.
- Staging only: 27/27 served assets match the source; anonymous staging access is denied.
- Preflight: five inline scripts parsed; fixture/staging security Node tests passed.
- Real signed browser: one desktop Playwright test passed (10.7 seconds), using separate dedicated synthetic buyer/seller accounts. The test sends and receives an actual buyer message and seller reply in a participant-scoped Inbox thread.
- T2.4: simulated rejected send retained original draft, retry of same text saved once; simulated lost success after a real database commit recovered the original UUID without a second insert. Synthetic fixture cleanup completed without a reported error.
- No production deployment, `main` merge, real customer write, payment or shipping.
- This original acceptance run did **not** cover first-contact from listing CTA; the newer successful first-contact run is recorded below. Neither run certifies physical Android/PWA or all T2 subitems.

## Root cause and remediation
1. Independent `t2-messaging-focused.yml` failed at OIDC: `HTTP 401 Untrusted claim workflow_ref` (run 41231418963). It was removed; never broadened the staging trust allowlist.
2. Reused the already-trusted `private-staging.yml` and created a trigger-only T2 path with a `[t2-live]` commit prefix. Kept broad staging regression, stateful API suite and regular production release excluded.
3. Real focused test reached the app but initially failed because the committed send-error wording was not on the deployed private staging Worker (run 41231923771).
4. Extended trusted focused path to run cheap T2 preflight, exact isolated staging Worker build/deploy with existing secrets preserved, 27-asset/auth parity and then the single signed desktop browser test. Run 41232013150 PASSED.

## T2.1 first-contact listing journey — newly accepted
- **Signed private staging run PASSED:** https://github.com/bam5693/Deckplay-hq/actions/runs/41233555792 at source commit `b5fade27011a5ad15b9a2736aa7439a322676910`.
- **Deployed staging Worker version:** `dd7589cf-cfde-4460-9726-66d60e4f2ee0`; exact served-asset parity 27/27, anonymous HTTP Basic Auth denial, five inline scripts parsed, 14 fixture/security checks passed.
- **Real signed desktop browser:** 1/1 Playwright test passed (11.9s). Separate synthetic seller/buyer contexts; seller publishes video-game fixture, buyer opens actual listing, clicks **Message seller**, sends a first message with no pre-seeded thread, enters visible recipient Inbox, exchanges a reply, verifies persisted message uniqueness and the T2.4 error/retry cases; marker-scoped cleanup did not report failure.
- **Root cause:** The original listing compose flow called `closeModal` sequentially, which scheduled asynchronous `history.back()` through the Android/browser navigation manager. That stale popstate restored Home after Inbox opened. Existing `window.deckplayNavigateInboxFromModal(recipient)` performs the atomic modal closure, history replacement and recipient route. Reused it instead of changing OIDC or adding visibility hacks.
- **Regression runs:** 41232243001, 41232725521 and 41232848390 failed on hidden Inbox while diagnosing; temporary navigation trace run 41233428924 captured `inbox-focus → deckplay-market → deckplay-home`. Only run 41233555792 establishes acceptance of the corrected route.
- **Scope limitations:** Desktop synthetic staging acceptance does not establish physical Android/PWA, every T2 subitem, or production deployment. Do not rerun passed signed journey without a material change.

## Next
Continue other T2 subitems, especially unread/account-switch privacy, mobile responsiveness and physical Android/PWA; listing-to-first-contact UI routing is now accepted on desktop synthetic staging. Avoid rerunning the passed exact signed messaging test unless implementation materially changes.

Draft PR #2 remains open, unmerged.
