# Trunk 8 — staging invitation administration (NOT activated)

## Current state
The protected staging-only helper is implemented in `scripts/beta-invite.mjs`.
**No invitation has been sent. No Supabase Auth setting has been changed. This is not a completed public beta signup gate.**
The CLI is dry-run-only unless an operator explicitly approves a send using all required flags and a server-side staging JWT.

## Safe operating sequence (owner approval required)
1. Decide the exact invite-only policy and number of participants; confirm production users must retain sign-in.
2. In **staging only**, review Auth configuration and consider disabling public signups under Authentication settings (**Allow new users to sign up**) after verifying trusted admin invitations still work. This Auth setting is the actual server-side signup gate; hiding Create Account in HTML alone is NOT sufficient. Do not change production configuration without separate owner approval. No configuration change is performed by this PR.
3. Use the Supabase Dashboard's Authentication → Users → Add user → Send invitation to invite individual preapproved emails; this is the recommended manual workflow if no private operator environment is available.
4. Alternatively, run `node scripts/beta-invite.mjs --email=person@example.com` for a no-credentials dry run; it sends nothing.
5. Do **not** mark invite-link verified based only on source code or the local unit tests. The private staging site has HTTP Basic Auth and the invitation email may open in a new browser without that login. Verify the **actual** link and account setup with a disposable address after an explicitly approved staging-only rehearsal; if this is blocked, keep invitation sending disabled. Independently review Supabase Auth's signup restriction and existing-user access before marking the policy verified.
6. Only if the owner explicitly approves an actual **staging** invitation, from a trusted private server environment with a legacy staging service-role JWT and no shared logs:
   ```bash
   export DECKPLAY_STAGING_SUPABASE_URL=https://prrrzeelltmyugssqnzk.supabase.co
   # Provide DECKPLAY_STAGING_SERVICE_ROLE_KEY securely, never in GitHub files/chat.
   # Only after confirming that the private staging invite callback is allowlisted in Supabase Auth URL settings
   # and that invitees can access it through staging's Basic Auth gate.
   export DECKPLAY_STAGING_INVITE_REDIRECT_URL=https://deckplay-hq-staging.cstivers56.workers.dev/
   # Only after personally verifying the invite link, Basic Auth access, and signup policy in staging:
   export DECKPLAY_STAGING_INVITE_LINK_VERIFIED=1
   export DECKPLAY_STAGING_AUTH_POLICY_VERIFIED=1
   export DECKPLAY_BETA_INVITE_APPROVED=1
   node scripts/beta-invite.mjs --email=approved@example.com --send --confirm=SEND-STAGING-INVITE
   ```
7. Verify invitation delivery, expiry, redirect URLs, password setup, anonymous signup denial, existing-user sign-in, removal/revocation procedure, and that an invited user can access intended isolated staging features. A successful API response does not prove an email was received. Staging's Basic Auth may prevent invitation-link access until a safe redirect and access path are approved.
8. Do not store applicant email lists in the repo, client app, test artifacts or logs. Keep any staging service-role token in a secret manager and revoke/rotate if exposed.

## Security / release notes
- The helper rejects production Supabase URLs and runs without secrets by default.
- Actual sends require a reviewed **HTTPS staging-only** redirect URL; only the existing private staging homepage is allowlisted, and non-staging or query-bearing URLs are rejected. The staging callback still needs real browser/email verification and Basic Auth coordination.
- The direct transport rechecks service-role JWT role and redirect; a public anon JWT, an expired JWT, or a JWT declaring another Supabase project cannot pass the client preflight. JWT claim inspection is not a replacement for Supabase's server-side cryptographic verification.
- Sending requires a confirmation flag plus explicit environmental approval.
- It never runs on a public webpage or requires a third-party email service.
- Public registration is **not restricted** merely because this script exists.
- The helper expects a **legacy service-role JWT** for the direct GoTrue REST endpoint; projects using only a modern `sb_secret_...` key should use the Dashboard or a separately reviewed server-side Supabase SDK implementation instead.
- Supabase Auth administrator invitations create an Auth user record and send an email; never use the helper with a real recipient without approval.
- Invitation redirect URLs must be allowed in Supabase Auth and expiry/email rate limits must be confirmed.
- No claim that these controls restrict existing app feature access or all RLS operations; that requires a separate access policy review.

## Owner-first staging rehearsal (no invitations sent automatically)
- Initial tester has volunteered and supplied a recipient address privately in chat. **Do not put that address into repository files, CI flags, test artifacts, or logs.**
- Cloudflare staging Worker has a `STAGING_ACCESS_PASSWORD` secret binding and its workers.dev subdomain is enabled. This confirms a configured gate, **not** that an emailed invitation successfully crosses the gate.
- First confirm the exact staging Supabase Auth **Site URL**, allowed redirect URLs, and whether signup is enabled through the staging-only Dashboard. Do not use the production Supabase project.
- Have the owner open staging in a fresh private browser and authenticate through its separate HTTP Basic Auth access gate before attempting a one-person invitation. Avoid putting Basic Auth credentials in an email URL or query string.
- After owner permission to send, use the staging Supabase Dashboard invitation flow, then have the owner open the actual delivered invite in a fresh browser, complete account setup and sign in. Record only pass/fail observations, not credentials, email contents, or invite tokens.
- A person volunteering as a tester **does not by itself** establish that the invite-link and Auth policy verification flags can be set; leave the protected CLI disabled until those prerequisites are independently checked.
- If the invite fails to reach staging through Basic Auth, stop and fix the redirect/access handoff in staging only. Do not disable the gate to make a test pass.

## Current activation blockers
- Public signup prohibition has **not** been confirmed or activated in staging; enabling it requires a separate approved Auth configuration action.
- Staging email invitations have **not** been sent or received. The protected site requires Basic Auth, so the link may not be usable by an invited person without an approved access path.
- The tool requires both `DECKPLAY_STAGING_INVITE_LINK_VERIFIED=1` and `DECKPLAY_STAGING_AUTH_POLICY_VERIFIED=1` in addition to the existing approval and credentials. These are **operator attestations**, not automated proof. Do not set them without real verification.
- Neither a successful dry run nor a simulated API call proves these checks or authorizes opening beta.
