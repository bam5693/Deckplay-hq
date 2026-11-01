# DeckPlay HQ — external $0 pre-release checks

Owner approved using outside tools **sparingly before publishing**. **Not approval for spending, signups, exposing private staging, or production writes.**

## Verified Nov 1, 2026
- Sybqa: https://sybqa.com/pricing — 10 **non-AI** browser runs per UTC calendar month on the free account, no card. Tests links/forms/layout/contrast; paid AI review starts at $19/month. Never mistake the free browser check for free AI vision. A run counts when started, even if it fails. Prefer one or two broad, read-only, release-candidate tests of **publicly accessible** pages, saving runs for retests. Hosted runs default read-only. Source: https://sybqa.com/pricing and https://sybqa.com/
- Rofix: https://www.rofix.app/pricing — free 1 website, 1 full audit, maximum 25 pages, no card. Useful for crawlability, broken links, structure, SEO and AI-search readiness. This is *not* a signed-in buyer/seller functional acceptance. Do it once when a suitable representative publicly reachable build exists; avoid burning the only free audit on a placeholder or inaccessible private staging URL.

## Integration and access gate
1. The owner must independently authorize creating provider accounts or connecting them. No account opened yet.
2. **Do not** share Cloudflare staging HTTP Basic Auth or Supabase user/test credentials with a third party by default. If the private staging gate blocks external browser runs, leave external inspection BLOCKED until there is an owner-approved safe, synthetic, publicly reachable *preview* with no customer data and no production effects. No weakening prod/staging authentication.
3. No external provider gets GitHub write rights, database service role, Cloudflare deployment token, payment credentials or production administrative privileges.
4. Review exact site URL, pages, test steps, privacy policy and any data collection before testing. Only synthetic data and read-only scenarios. An automated browser accessing a public site may still send analytics; do not use real customers.
5. Save findings/screenshots/URLs in release evidence; independently reproduce significant failures in our own Playwright suite. Developer fixes issues on isolated branch, validates staging and owner approves publication.
6. If full external AI inspection requires a paid plan, **do not enable it**. Use our existing Playwright screenshot and accessibility checks and only consider bounded free inference if provider-level zero-spend protections are independently verified.

## Recommended timing
- Everyday development: existing local/CI checks; zero outside service calls.
- After V1 feature integration: run broad Playwright checks of all major categories and feature journeys internally.
- On pinned final V1 release candidate: 1–2 Sybqa **free browser-only** runs covering high-risk public visitor paths; Rofix single free crawl of suitable public preview if practical; use own internal authenticated staging tests for Inbox/trades/login.
- After bug fixes: targeted rerun, only within remaining free quota.
- Always keep production release gate for signed-in staged buyer/seller acceptance, security/privacy, backup and independent restoration evidence, no known major issues and owner approval.

**Status:** release checklist prepared, no external services connected or executed. This is an advisory document; Rofix/Sybqa output cannot authorize a merge or release.
