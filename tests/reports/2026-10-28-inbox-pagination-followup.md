# Inbox pagination follow-up

Staging-only development note. The deployed pagination fixes select the earliest loaded message and only exhaust history on a short page.

Next regression checks:
- Loading a full page of already-seen messages must not prematurely hide older history.
- A short final page must stop further pagination.
- Failed fetches must allow a retry without losing the active conversation.
- Loading older messages must preserve the reader's scroll position.
- Switching collectors or accounts during a fetch must not display another account's history.

No production changes or real user data are required.
