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
5. Only if the owner explicitly approves an actual **staging** invitation, from a trusted private server environment with a legacy staging service-role JWT and no shared logs:
   ```bash
   export DECKPLAY_STAGING_SUPABASE_URL=https://prrrzeelltmyugssqnzk.supabase.co
   # Provide DECKPLAY_STAGING_SERVICE_ROLE_KEY securely, never in GitHub files/chat.
   export DECKPLAY_BETA_INVITE_APPROVED=1
   node scripts/beta-invite.mjs --email=approved@example.com --send --confirm=SEND-STAGING-INVITE
   ```
6. Verify invitation delivery, expiry, redirect URLs, password setup, anonymous signup denial, existing-user sign-in, removal/revocation procedure, and that an invited user can access intended isolated staging features. A successful API response does not prove an email was received. Staging's Basic Auth may prevent invitation-link access until a safe redirect and access path are approved.
7. Do not store applicant email lists in the repo, client app, test artifacts or logs. Keep any staging service-role token in a secret manager and revoke/rotate if exposed.

## Security / release notes
- The helper rejects production Supabase URLs and runs without secrets by default.
- Sending requires a confirmation flag plus explicit environmental approval.
- It never runs on a public webpage or requires a third-party email service.
- Public registration is **not restricted** merely because this script exists.
- The helper expects a **legacy service-role JWT** for the direct GoTrue REST endpoint; projects using only a modern `sb_secret_...` key should use the Dashboard or a separately reviewed server-side Supabase SDK implementation instead.
- Supabase Auth administrator invitations create an Auth user record and send an email; never use the helper with a real recipient without approval.
- Invitation redirect URLs must be allowed in Supabase Auth and expiry/email rate limits must be confirmed.
- No claim that these controls restrict existing app feature access or all RLS operations; that requires a separate access policy review.
