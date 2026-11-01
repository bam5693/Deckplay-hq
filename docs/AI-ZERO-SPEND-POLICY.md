# DeckPlay HQ — AI ZERO-SPEND POLICY (owner directive, 2026-10-31)

**Hard requirement: $0 additional recurring or usage charges.** Do not activate paid AI accounts, paid credits, billing plans, automatic top-up, paid APIs, credit-card verification, or overage billing without explicit owner approval. This policy applies to Gemini, OpenRouter, Cloudflare Workers AI, Hugging Face, and future providers. A marketing claim of a free tier is not proof the configured account or model cannot bill.

## Safe now
- Continue local free-first static, Playwright, accessibility, security and buyer/seller tests on existing developer tooling.
- Prepare dry-run scripts, documentation, strict model allowlists and synthetic images without making any external AI inference calls.
- Keep V1 AI vision manual/disabled by default until an explicit zero-spend account-specific check is documented.
- Run V1 integrated acceptance once before fixes and once after fixes; focused regressions in between.

## Future activation gate
1. Owner explicitly connects/authorizes the chosen account and accepts any terms. Do not accept third-party model licenses on owner's behalf.
2. Verify the provider's current plan, quota, model availability, privacy conditions, and exact overage behavior using documentation and account settings. If the platform can charge after quota exhaustion, leave inference disabled until a provider-enforced spending cap of $0 (not merely an app budget alert) is verified.
3. Use synthetic test accounts/screenshots only. No real customer messages, account credentials, financial or private addresses.
4. Enable **manual, single-run** V1 acceptance only, never all-PR/per-test/hourly automatic requests. Explicit finite list of meaningful cross-feature screenshots, not just six pilot screens.
5. Refuse unapproved models and fail closed when API quota, credentials, inference, license or real visual evidence is missing. Never silently route to a paid model or retry into overage.
6. Record exact run, source commit, reviewed screens, real vs emulated device, defects and unverified release gates.

**Caveat:** Code-side rate limits alone cannot absolutely prevent billing if a provider charges for any request. Provider-level no-billing controls and owner verification are required first.

## Worker boundaries
Trunk 1 builds Listings; Trunk 4 builds Discovery; Trunk 9 researches catalog/competitors. Interactive G manages staging integration, customer acceptance and release evidence. No auto worker is authorized to activate an outside AI service or spend money.
