# Authenticator setup and admin access verification — 2026-10-28

Scope: staging branch `test/staging-reporting`, draft PR #2, Supabase `prrrzeelltmyugssqnzk`, Worker `deckplay-hq-staging`. No production/main, lasting role grants, billing, live purchases or shipping changes.

## Implemented

- Dedicated mobile-friendly `moderator-access.html` linked from the private Command Center. Signed-in users can deliberately enroll a TOTP authenticator or verify an existing factor. Setup explains that completing enrollment signs out other sessions. The QR issuer is DeckPlay HQ.
- Uses the pinned Supabase client enrollment/challenge/verify/list/unenroll APIs. Both the client's SVG data-URL output and raw SVG are normalized to image content, never injected as HTML. Optional manual key is hidden in a collapsed disclosure by default.
- Setup keys/QRs, one-time codes, account identity and factor choices are erased on auth changes, sign-out, page hiding and browser back-forward-cache events. Returning from an authenticator app reloads factor metadata; an already-added unfinished factor can be verified without restoring its old setup key. The app does not place setup keys in browser storage or application logs; Supabase Auth manages the MFA factor itself.
- Account/generation checks discard stale responses and revalidate identity before mutations. Duplicate requests are guarded, including a same-account return while enrollment is still in flight. Service failures restore retry controls with safe messages. Existing factors are preserved; unfinished removal rechecks ownership/current unverified status and targets only the selected factor. This flow does not remove verified factors.
- A verified MFA session still needs an explicit server moderator grant. Ordinary collectors keep no Command Center link; the server denies their queue requests. A stale AAL2 claim without a verified factor does not display verified access. The page creates no role, exposes no reports and changes no backend permission policies.

## Validation and evidence boundaries

- Full local marketplace/MFA suite: **360 passed**, no failures. After the final issuer-label/argument addition, **44 targeted MFA/moderation checks passed**; these overlap the full suite. These are local browser simulations, not proof of live Auth acceptance.
- Existing security plus the test-only RFC 6238 TOTP vectors/invalid-input checks: **35 passed**. The prior 33 security checks remain included, not additive.
- Reviewed the setup screen using synthetic data at 412px: no horizontal overflow; action controls approximately 47px high. Physical Android, installed-PWA and real authenticator-app handoff remain device checks.
- Preflight: zero enabled moderators and zero existing factors on the dedicated buyer/seller test accounts. No real account is enrolled or promoted by these preflight checks.
- Added a deployed desktop/mobile journey using only `deckplay-buyer@deckplay.test`. It refuses a pre-existing factor, enrolls one temporary authenticator, verifies a real signed AAL2 session through the actual UI, confirms separate role/queue denial, then removes only its exact factor after revalidating the dedicated owner. Test QR/key/code/token material is not logged, traced, screenshotted or saved; the page is scrubbed in `finally` before failure artifacts. The test-only TOTP helper uses RFC vectors and does not store live keys. Actual matching run result remains pending publication.
- Existing private staging gate, role/session enforcement, report/audit permissions and payment/shipping restrictions remain. No MFA policy is made mandatory for ordinary collectors, no paid SMS/auth plan is enabled, and no lasting moderator grant is created.

## Remaining priority

This provides authenticator setup and session verification, not owner-selected privileged onboarding. A real operator identity must be explicitly selected before a lasting moderator grant; actual signed privileged queue/review acceptance remains open. Existing database transaction tests cover privileged authorization logic, while this batch's live test covers signed MFA with continued ordinary-collector denial.

Next: protected queue pagination/filtering, restricted audit visibility and deliberate operator onboarding; then evidence/enforcement, appeals and support intake. Backup/rollback drill, recovery-email verification, deletion/export, physical Android/PWA checks and other beta gates remain. The existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains; no auth-plan or subscription change was made.

## Publication checkpoint

Exact private Worker deployment `c708a2a19efd424c8462267da13da86f`; full 622,878-character source read-back matched. Existing three secret bindings and compatibility settings remained. Matching real staging/browser CI is pending branch publication at this checkpoint.
