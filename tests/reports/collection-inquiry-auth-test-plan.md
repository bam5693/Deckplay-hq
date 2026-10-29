# Collection inquiry authenticated behavior test plan

Scope: isolated staging only. No production writes or customer fixtures.

## Confirmed baseline
- Staging public wrapper is SECURITY INVOKER.
- Authenticated role has EXECUTE; anonymous role does not.
- Private function enforces signed-in sender, opt-in, blocks, duplicate item and rate limits.
- A direct SQL attempt to impersonate a signed-in user was blocked by tooling; it is not evidence of functional success.

## Test through normal staging authentication
Use two isolated synthetic users with consent to testing and clean inquiry history. Never use real production identities.

1. Receiver collection links empty or mode off: inquiry denied, no message or inquiry record.
2. Receiver trades-only: buy denied; trade permitted with valid linked collection.
3. Block sender or receiver: inquiry denied.
4. Same sender, receiver and normalized item twice: second denied, only one inbox message.
5. Same sender, receiver, different item within 24 hours: second denied.
6. Five inquiries to distinct opted-in recipients within 24 hours: sixth denied.
7. Anonymous caller: denied.
8. Signed-in sender addressing self: denied.
9. Valid trade inquiry: exactly one collector message and one private history record; receiver sees inbox message.
10. Concurrent first-contact attempts: ensure at most one inquiry succeeds.

For every rejection, verify no message, inquiry row, or other side effect. Keep fixture IDs and cleanup scoped to synthetic staging records. Do not assert these tests passed until executed and evidenced.
