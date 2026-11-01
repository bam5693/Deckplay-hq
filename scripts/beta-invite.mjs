#!/usr/bin/env node
/**
 * DeckPlay Trunk 8 — controlled staging beta invitation.
 * No browser secrets. No network request unless --send AND explicit approval.
 * Production invitation sending is intentionally unsupported.
 *
 * Usage:
 *   node scripts/beta-invite.mjs --email=collector@example.com
 *   DECKPLAY_STAGING_SERVICE_ROLE_KEY=... DECKPLAY_BETA_INVITE_APPROVED=1 \
 *     node scripts/beta-invite.mjs --email=collector@example.com --send --confirm=SEND-STAGING-INVITE
 */
import { pathToFileURL } from 'node:url';

export const STAGING_PROJECT_URL = 'https://prrrzeelltmyugssqnzk.supabase.co';
const emailPattern = /^[^\s@<>]{1,64}@[^\s@<>]{1,189}$/;
export function validateEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254 || email.includes('..')) {
    throw new Error('A single valid collector email is required.');
  }
  return email;
}

export function parseInviteArgs(args) {
  const result = { email: null, send: false, confirmation: null };
  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      if (result.email !== null) throw new Error('Provide exactly one email.');
      result.email = validateEmail(arg.slice(8));
    } else if (arg === '--send') result.send = true;
    else if (arg.startsWith('--confirm=')) result.confirmation = arg.slice(10);
    else throw new Error('Unknown option. Use --email=... and optionally --send --confirm=SEND-STAGING-INVITE.');
  }
  if (!result.email) throw new Error('Use --email=collector@example.com.');
  return result;
}

export function validateStagingRedirect(value) {
  let u;
  try { u = new URL(String(value || '')); } catch { throw new Error('A reviewed staging invite redirect URL is required.'); }
  if (u.protocol !== 'https:' || u.hostname !== 'deckplay-hq-staging.cstivers56.workers.dev' ||
      u.username || u.password || u.port || u.hash || u.search ||
      u.pathname !== '/') {
    throw new Error('Invitation redirect must be an approved HTTPS path on private staging.');
  }
  return u.toString();
}

// Checks the JWT role locally to prevent accidental use of an anon key.
// The remote Auth API still validates its cryptographic signature.
export function validateStagingServiceRoleJwt(value) {
  const secret = String(value || '');
  if (!/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    throw new Error('A legacy staging service-role JWT is required.');
  }
  try {
    const claims = JSON.parse(Buffer.from(secret.split('.')[1], 'base64url').toString('utf8'));
    if (claims.role !== 'service_role' ||
        (claims.ref && claims.ref !== 'prrrzeelltmyugssqnzk') ||
        (claims.exp && (!Number.isFinite(claims.exp) || claims.exp <= Date.now()/1000))) {
      throw new Error('Invalid service-role claims.');
    }
  } catch {
    throw new Error('Valid staging service-role JWT required; anon and publishable keys are forbidden.');
  }
  return secret;
}

export function validateSendGuard({ args, env }) {
  if (!args.send) return false;
  if (args.confirmation !== 'SEND-STAGING-INVITE' || env.DECKPLAY_BETA_INVITE_APPROVED !== '1') {
    throw new Error('Invitation not authorized. Require explicit owner approval and the staging confirmation flag.');
  }
  if (env.DECKPLAY_STAGING_SUPABASE_URL !== STAGING_PROJECT_URL) {
    throw new Error('Incorrect Supabase URL. Staging-only invitation required.');
  }
  validateStagingServiceRoleJwt(env.DECKPLAY_STAGING_SERVICE_ROLE_KEY);
  validateStagingRedirect(env.DECKPLAY_STAGING_INVITE_REDIRECT_URL);
  if (env.DECKPLAY_STAGING_INVITE_LINK_VERIFIED !== '1') {
    throw new Error('Staging invite link and private access gate must be verified before sending.');
  }
  if (env.DECKPLAY_STAGING_AUTH_POLICY_VERIFIED !== '1') {
    throw new Error('Staging signup policy must be reviewed before sending.');
  }
  return true;
}

export async function sendStagingInvite({ email, key, redirectTo, fetchImpl = fetch }) {
  validateStagingServiceRoleJwt(key);
  const destination = validateStagingRedirect(redirectTo);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(STAGING_PROJECT_URL + '/auth/v1/invite?redirect_to=' + encodeURIComponent(destination), {
      method: 'POST',
      redirect: 'error',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal
    });
    // Never echo API bodies, tokens, or email addresses to CI logs.
    if (!response.ok) throw new Error('Staging invite was rejected (HTTP ' + response.status + '). Check Auth settings/email limits in Supabase.');
    return { sent: true };
  } catch (error) {
    // Network/transport exceptions can include request headers or recipient addresses.
    // Keep the intentionally sanitized HTTP status, but never surface unknown details.
    if (error instanceof Error && /^Staging invite was rejected \(HTTP \d+\)\./.test(error.message)) throw error;
    throw new Error('Staging invitation connection failed. Check private staging connectivity.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseInviteArgs(argv);
  const allowed = validateSendGuard({ args, env });
  if (!allowed) {
    process.stdout.write('DRY RUN: one staging collector invite prepared. No email sent. No account created.\n');
    return;
  }
  await sendStagingInvite({ email: args.email, key: env.DECKPLAY_STAGING_SERVICE_ROLE_KEY, redirectTo: env.DECKPLAY_STAGING_INVITE_REDIRECT_URL });
  process.stdout.write('Staging invitation request accepted by Supabase. Check delivery privately; no production changes.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Avoid leaking credentials or email if the transport returns a verbose exception.
    process.stderr.write((error?.message || 'Invitation failed.') + '\n');
    process.exitCode = 1;
  });
}
