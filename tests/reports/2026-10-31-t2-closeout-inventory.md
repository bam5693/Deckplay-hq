# Trunk 2 final acceptance inventory — 2026-10-31

**Status:** Trunk 2 code and most automated acceptance evidence are complete; independent physical Android/PWA sign-off belongs to T5. Do not claim production release or all end-user conditions verified.

## Text messaging and privacy
- Real first-contact listing -> buyer/seller Inbox messaging, send retry and duplicate prevention: [41233555792](https://github.com/bam5693/Deckplay-hq/actions/runs/41233555792), signed staging desktop, passed.
- Real persisted buyer and seller read receipts, with selected sender/recipient guard: [41235556512](https://github.com/bam5693/Deckplay-hq/actions/runs/41235556512), signed staging desktop, passed.
- Pixel 7 Chromium emulation of first-contact, read receipts, send retry: [41235641456](https://github.com/bam5693/Deckplay-hq/actions/runs/41235641456), passed; **not a physical Android device**.
- Account-switch privacy, signed-out unread and stale Inbox responses: cheap Node checks [41234607201](https://github.com/bam5693/Deckplay-hq/actions/runs/41234607201) and [41235477120](https://github.com/bam5693/Deckplay-hq/actions/runs/41235477120), signed stale-response [41235840079](https://github.com/bam5693/Deckplay-hq/actions/runs/41235840079), real same-browser buyer->seller->buyer auth and unsent draft isolation [41236036421](https://github.com/bam5693/Deckplay-hq/actions/runs/41236036421); passed.

## Private conversation photos (the other major T2 requirement)
- Scope: private non-public bucket, server-validated JPEG/PNG/WebP, EXIF-stripped re-encoding, participant-only access, 3-photo and new-upload quotas, immutable retries, photo-only caption, draft preservation and mobile/desktop viewer.
- Historical documented release verification: [40770394971](https://github.com/bam5693/Deckplay-hq/actions/runs/40770394971) passed **54 real API / 53 deployed browser / 290 selected local / 6 photo-specific security / 11 cleanup checks**, including desktop/mobile signed photo exchange, recipient signed retrieval, public URL denial and immutable retry. Reference: `tests/reports/2026-10-28-roadmap-development.md`.
- These historical results are **not** evidence of a fresh current-HEAD end-to-end private-photo regression after later Inbox/navigation changes; review whether any relevant code changed before deciding on a narrow rerun.

## Closeout gate
1. Review current private photo implementation against latest Inbox and account-switch changes; check whether existing green acceptance remains applicable or new focused coverage is necessary.
2. Validate full T2 acceptance criteria from `tests/reports/2026-10-27-next-roadmap-handoff.md`, not just recent text-message tests.
3. Update the authoritative T2 scoreboard only with verified exact-source evidence. Physical Android/PWA belongs to Trunk 5.
4. Trunk 2 remains **not fully signed off** until photo evidence currency and acceptance criteria are reconciled; do not rerun accepted text flows or broad suites without a material change.

All work on private staging, PR #2 draft, no production deploy or main merge.

## Final T2 evidence reconciliation — 2026-10-31
- New account-switch private photo URL regression [41236949855](https://github.com/bam5693/Deckplay-hq/actions/runs/41236949855) **PASS**: 6/6 cheap Node tests and five inline scripts. Uses actual `private-message-photos.js` loader with a delayed signed-URL result, resets on account change and proves no old-account photo is appended. No new storage writes or deployment.
- Current photo loader is generation/account/node guarded; account change invokes `window.privateMessagePhotos.reset()` from `syncInboxDraftUser()`. The direct photo sharing and cross-user authorization tests have earlier signed staging evidence [40770394971](https://github.com/bam5693/Deckplay-hq/actions/runs/40770394971). These are **separate complementary tests**, not a fresh full combined photo exchange on the latest staging source.
- Latest text, read receipt, real sign-out/sign-in, and synthetic mobile browser evidence is listed above; no material new photo-loader code change was identified in this review.
- **T2 scoped automated acceptance: complete with caveats.** Do not re-run broad suites or duplicate historical private-photo uploads absent a relevant regression. Real-device Android/PWA ergonomics belong to T5, overall production integration and shipping belong to release management. No production deployment or main merge is implied.
