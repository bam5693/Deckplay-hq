// Validate a Supabase production PostgreSQL URI without ever echoing credentials.
// This is intentionally strict: only the known DeckPlay production project may be read.
export const PRODUCTION_REF='yffruutknztvdyioovmp';
export function validateProductionUri(value) {
  let url;
  try { url=new URL(value); }
  catch { throw Error('Backup connection secret must be a full PostgreSQL URI from Supabase Connect > Session pooler.'); }
  if (url.protocol!=='postgresql:' && url.protocol!=='postgres:') throw Error('Backup connection must use PostgreSQL URI.');
  if (!url.username || !url.password || !url.pathname || url.pathname==='/') throw Error('Backup connection URI is missing a username, password or database name.');
  const host=url.hostname.toLowerCase();
  if (!/(?:^|\.)supabase\.(?:co|com)$/.test(host)) throw Error('Backup connection host must belong to Supabase.');
  if (!url.username.includes(PRODUCTION_REF) && !host.includes(PRODUCTION_REF)) throw Error('Backup connection does not identify DeckPlay production.');
  if (url.password.includes('YOUR-PASSWORD') || url.password.includes('[') || url.password.includes(']')) throw Error('Backup connection password is still a placeholder.');
  if (!url.port && host.includes('pooler.supabase.com')) throw Error('Backup pooler port missing.');
  return true;
}
if (process.argv[1]?.endsWith('validate-database-uri.mjs')) {
  try { validateProductionUri(process.env.DECKPLAY_PROD_DATABASE_URL); }
  catch (e) { console.error(e.message+' No credentials have been printed.'); process.exitCode=1; }
}
