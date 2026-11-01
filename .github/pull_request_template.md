## Feature / customer outcome
What can the customer actually do after this change?

## UX ACCEPTANCE — Jayden and Tanner (mandatory for customer-facing changes)
- [ ] **Jayden — player / buyer** challenged the flow for double decisions, irrelevant options, finding the exact item, empty/error/offline cases, Inbox/trades if affected.
- [ ] **Tanner — collector / seller** tried realistic cards, decks, lots, sports, games/hardware or collectible scenarios as applicable, including edits, Cancel, saved state, and selling.
- [ ] Affected category / listing-type paths tested; state specific coverage (all eight for shared Sell form changes).
- [ ] Mobile-width viewport tested in light **and** dark mode for legible fields/help, practical taps, menus and scrolling; desktop where applicable.
- [ ] Duplicate/confusing steps and irrelevant help were actively examined, not merely checked that controls exist.
- [ ] No runtime errors, sensitive account leakage, broken recovery or misleading success state.
- [ ] Reviewer **other than author** challenged at least one actual buyer/seller path, or explicitly mark **UX BLOCKED** below.

**What was confusing / removed / simplified?**

**Evidence (source commit, focused run, screenshots, exact tested journey):**

**Known gaps — physical Android/PWA unverified until owner confirms:**

## Functional / security acceptance
- [ ] Source compatibility and smallest focused regression set passed.
- [ ] Staging signed-in buyer/seller evidence where required; test mocks identified.
- [ ] No unsafe production DB, auth, storage, billing or payments change.

## Release decision
**UX status:** ACCEPTED / UX BLOCKED (why)

**Code status:** ACCEPTED / BLOCKED (why)

**Owner production approval:** REQUIRED — no PR template grants deployment authority.
