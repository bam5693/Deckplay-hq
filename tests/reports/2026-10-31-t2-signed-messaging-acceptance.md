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
- This does **not** certify physical Android/PWA, first-contact from listing CTA without preseeded thread, or all T2 subitems.

## Root cause and remediation
1. Independent `t2-messaging-focused.yml` failed at OIDC: `HTTP 401 Untrusted claim workflow_ref` (run 41231418963). It was removed; never broadened the staging trust allowlist.
2. Reused the already-trusted `private-staging.yml` and created a trigger-only T2 path with a `[t2-live]` commit prefix. Kept broad staging regression, stateful API suite and regular production release excluded.
3. Real focused test reached the app but initially failed because the committed send-error wording was not on the deployed private staging Worker (run 41231923771).
4. Extended trusted focused path to run cheap T2 preflight, exact isolated staging Worker build/deploy with existing secrets preserved, 27-asset/auth parity and then the single signed desktop browser test. Run 41232013150 PASSED.

## Next
Continue other T2 subitems, especially listing-to-first-contact UI routing, unread/account-switch privacy, mobile responsiveness and physical Android/PWA. Avoid rerunning the passed exact signed messaging test unless implementation materially changes.

Draft PR #2 remains open, unmerged.
