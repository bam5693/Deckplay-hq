const { test, expect } = require('@playwright/test');

// Safe anonymous contract test: no credentials, no mutations, staging only.
// Authenticated synthetic-account tests remain pending until fixtures are provisioned.
test('anonymous callers cannot send collection inquiries', async ({ request }) => {
  const base = process.env.DECKPLAY_STAGING_SUPABASE_URL || 'https://prrrzeelltmyugssqnzk.supabase.co';
  const anonKey = process.env.DECKPLAY_STAGING_SUPABASE_ANON_KEY || process.env.DECKPLAY_STAGING_SUPABASE_KEY || 'sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh';
  test.skip(!base || !anonKey, 'Staging Supabase URL and anon key required');
  const url = new URL(base);
  expect(url.hostname).toBe('prrrzeelltmyugssqnzk.supabase.co');
  const response = await request.post(`${base.replace(/\/$/, '')}/rest/v1/rpc/send_collection_inquiry`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    data: { p_recipient: '00000000-0000-4000-8000-000000000001', p_item: 'Synthetic test card', p_intent: 'trade', p_body: 'Test inquiry' },
  });
  expect([401, 403, 404]).toContain(response.status());
});
