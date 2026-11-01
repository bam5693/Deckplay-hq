# V1 vision review — free-first, manual only

**Scope:** ONLY six synthetic V1 Sell-form screenshots from the existing focused Pixel-size browser test, not all tests, not hourly workers, not production. Two personas: Jayden (deck + video game, light/dark) and Tanner (vintage hockey, light/dark). Cloudflare Workers AI `@cf/meta/llama-3.2-11b-vision-instruct`, currently subject to a separate Meta model-license acceptance step.

## What is implemented
- `scripts/vision-review.mjs` and `workers/staging-ai-reviewer.mjs` accept an authenticated, tightly limited `v1_vision` request with approved case ID, goal, and PNG/JPEG data. No arbitrary URL fetching, arbitrary screenshot batches, real account info, or deployment from this code.
- `scripts/v1-vision-from-artifact.mjs` checks expected image names, PNG magic bytes, size limits and model responses. The job refuses to claim visual approval when a screenshot is absent or model unavailable.
- `.github/workflows/v1-vision-acceptance.yml` requires **manual** dispatch with a verified successful run from `integration/v1-mobile-sell-ux-20261031`, and must be explicitly triggered on the vision branch. It reports advisory results for independent review, not an automatic release pass.
- Logs report only case and response length; screenshots go only to the private authenticated Worker. Report artifacts expire in 3 days.

## Setup gates before first actual inference (NOT DONE)
1. Review and accept the Meta model license/acceptable use policy through Cloudflare's documented initial `prompt: agree` request. Owner/account approval is required; do not imply we accepted legal terms.
2. Deploy the **new** isolated reviewer worker from a reviewed integration branch using existing protected staging credentials; do not touch production. Verify the deployment source and that the new `v1_vision` route works with a synthetic image and a real AI inference.
3. Configure repository environment variable `DECKPLAY_V1_VISION_URL` pointing at the new private reviewer endpoint; existing protected secret `DECKPLAY_AI_REVIEWER_TOKEN` must remain private. Never log credentials, add them to source, or copy screenshots from real accounts.
4. Manually run focused synthetic V1 browser screenshot workflow, then manually dispatch V1 AI screenshot acceptance using that successful run ID. If it fails due to quota, licensing, credentials or visual mismatch, keep V1 visual acceptance **BLOCKED**, never silently fall back to fake AI reports.

## Cost control
No automatic AI calls on PR, push, every test, or every worker tick. Six images per intentional V1 review only; no repeated attempts on quota errors. Cloudflare documents 10,000 free Workers AI neurons/day, shared across all Workers AI uses; remaining allocation is not checked automatically. No assumption of zero cost if account is on Paid plan — verify usage and billing before enabling. Source: https://developers.cloudflare.com/workers-ai/platform/pricing/

## Acceptance
Vision identifies possible visible flaws, but it cannot prove correct seller-to-buyer database behavior, real Android/keyboard behavior, accessibility semantics, hidden fields or that a collector likes the workflow. Independent reviewer must inspect actual images and reports, reproduce major issues and record fixes before V1 release. V1 can never be promised flawless; seek high confidence in critical functions and no known blocker/major customer defects.
