# DeckPlay HQ browser testing

The browser smoke tests run from GitHub Actions. Two dedicated accounts are proposed:

- deckplay-seller@deckplay.test
- deckplay-buyer@deckplay.test

**Status:** Accounts are not yet created. The connected Supabase tools cannot administer Auth users.

## Secure one-time setup

Use the Supabase dashboard for the DeckPlay HQ project:

1. Authentication → Users → Add user.
2. Create each account with its address above, a different strong generated password, and email confirmed.
3. In GitHub repository Settings → Secrets and variables → Actions, add the following repository secrets:
   - DECKPLAY_TEST_SELLER_EMAIL
   - DECKPLAY_TEST_SELLER_PASSWORD
   - DECKPLAY_TEST_BUYER_EMAIL
   - DECKPLAY_TEST_BUYER_PASSWORD
4. Never put passwords or a Supabase service-role key in repository files or chat.
5. Keep all test listings explicitly labeled TEST ONLY — NOT FOR SALE. Do not exercise payments or real shipping.

The existing tests currently cover UI smoke checks, not authenticated offer/trade workflows. The next step is to add isolated two-account interaction tests with test data cleanup and verify the workflow results.
