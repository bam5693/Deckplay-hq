# Staging roadmap development — 2026-10-28

Scope: `test/staging-reporting`, draft PR #2, Supabase `prrrzeelltmyugssqnzk`, Worker `deckplay-hq-staging` only. No production/main, real-user data, billing, payment or shipping changes.

## Baseline

Read the complete eight-trunk roadmap at `18e86e2`. Latest feature workflow `40675552913` passed for code `74c3a68`; older failure `40645072205` is superseded by four successful feature runs. PR #2 remains open, draft, unmerged; its body was an older October 27 checkpoint. All 23 public tables currently have RLS. Security advisor reports leaked-password protection disabled; no plan/auth changes made. Existing two public photo buckets are unsuitable for private message attachments. Basic-auth browser access denied an unauthenticated request as expected; trusted existing CI remains the deployed browser path.

## Batch 1 — Inbox / Android Back

POLISH → locally verified: directly opened conversations now have a separate Back entry, so Back returns to the inbox before leaving it. Switching contacts replaces the existing thread entry, eliminating phantom history steps. Returning to the inbox clears the selected-thread pointer and preserves the unsent draft.

Reproduction: two focused regressions failed on both desktop and mobile before the fix (four failures). After the fix, 88 local desktop/mobile checks passed across inbox recovery, request ordering and regressions. All 33 existing security checks passed. Five inline scripts parsed; diff whitespace check passed. These are local simulations, not real API certification.

Deployment: exact Worker content uploaded with content-only API; read-back contains the complete local Worker byte sequence. Deployment ID `55c2795f379f4bb79edb488d58821bac`. Three secret bindings, compatibility date and cron schedules preserved. Extended the existing deployed buyer/seller journey to verify Back and draft restoration against real synthetic conversations without adding duplicate standalone journeys.

VERIFY: matching deployed CI and real staging API results pending branch publication. NEW: private attachments, external collection links and secure admin foundation remain unfinished. Next: precise custom card identity and seller fallback UX, after confirming this batch.

## Batch 2 — Exact card identity and storefront detail parity

NEW → local VERIFIED: optional custom set/release, custom variant/finish, rarity, edition/printing and language. Custom text replaces the corresponding catalog selection; seller asking prices remain authoritative. Card identity fields now also work for sports cards and unsupported TCGs, with no fabricated catalog options. Description help explicitly covers unlisted cards, serial numbers, mixed lots and flaws. All metadata is saved through the existing description field; no schema change.

POLISH → local VERIFIED: seller-profile listings now use the shared marketplace row converter, retaining exact seller descriptions, category and price-offer eligibility. Previously storefront detail pages displayed no description and hid Make an offer.

Validation: 64 distinct local desktop/mobile checks in listing descriptions/publication, catalog sets, seller profiles and selling categories passed (62 initially; the two new repeated-publication cases passed after correcting the test fixture to use the real photo input after form reset). This fixture correction changed no application photo behavior. No inflated cumulative totals. Existing deployed deck journey extended to save custom printing details and compare the storefront description with the actual saved row.

Deployment and current deployed CI: pending, waiting for Batch 1's matching build checks to finish before replacing served assets. Next: fix newly reproduced stale blocked-collector and notification-preference responses across account switches (both reproduced on mobile and desktop).
