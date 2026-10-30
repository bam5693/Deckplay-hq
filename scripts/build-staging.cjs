const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const target = path.resolve('dist-staging');
const url = process.env.DECKPLAY_STAGING_SUPABASE_URL;
const key = process.env.DECKPLAY_STAGING_SUPABASE_KEY;
if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key.startsWith('sb_publishable_')) {
  throw new Error('Valid staging Supabase URL and publishable key required');
}
if (url !== 'https://prrrzeelltmyugssqnzk.supabase.co') throw new Error('Unexpected staging Supabase project');
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
let count = 0;
for (const name of files) {
  if (!/\.(?:html|css|js|svg|png|jpg|jpeg|webp|ico|webmanifest|json)$/.test(name)) continue;
  if (name.endsWith('.js') && (name.startsWith('playwright.') || name.endsWith('.config.js'))) continue;
  if (name === 'package.json' || name === 'package-lock.json') continue;
  if (name.startsWith('supabase/') || name.startsWith('tests/') || name.startsWith('scripts/') || name.startsWith('.github/') || name.startsWith('node_modules/') || name.startsWith('dist-')) continue;
  const original = fs.readFileSync(name);
  let output = original;
  if (/\.(html|js|json|webmanifest|css)$/.test(name)) {
    const text = original.toString('utf8');
    let replaced = text.replaceAll('https://yffruutknztvdyioovmp.supabase.co', url).replaceAll('sb_publishable_cHzM8sQmrqfcCH8lhESytg_FMJrQtCX', key);
    if (name.endsWith('.html')) {
      replaced = replaced.replace(/<body([^>]*)>/i, '<body$1><div role="status" style="padding:10px;text-align:center;background:#e5bd67;color:#172033;font-weight:700">Private staging · Synthetic test data only · Payments and shipping disabled</div>');
      replaced = replaced.replace(/<head>/i, '<head>\n<meta name="robots" content="noindex,nofollow">');
      replaced = replaced.replaceAll('0x4AAAAAAFlCX5HPx9tk7uO6','1x00000000000000000000AA');
      replaced = replaced.replaceAll('redirectTo:"https://deckplayhq.com"', 'redirectTo:window.location.origin');
      replaced = replaced.replaceAll('emailRedirectTo:"https://deckplayhq.com"', 'emailRedirectTo:window.location.origin');
    }
    output = Buffer.from(replaced);
    if (output.toString('utf8').includes('yffruutknztvdyioovmp') || output.toString('utf8').includes('sb_publishable_cHzM8sQmrqfcCH8lhESytg_FMJrQtCX')) {
      throw new Error('Production configuration remains in ' + name);
    }
  }
  const dest = path.join(target, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, output);
  count++;
}
if (!count) throw new Error('No assets copied');
const entry = path.join(target, 'index.html');
if (!fs.existsSync(entry)) throw new Error('Staging index.html missing');
const entryHtml = fs.readFileSync(entry, 'utf8');
if (!entryHtml.includes(url) || !entryHtml.includes(key)) throw new Error('Staging Supabase config missing from entry HTML');
if (!entryHtml.includes('noindex,nofollow')) throw new Error('Staging noindex missing');
if (entryHtml.includes('yffruutknztvdyioovmp')) throw new Error('Production project leaked into staging entry');

const { Script } = require('node:vm');
// Fail the fast staging build if any inline classic JavaScript fails to parse.
// A syntax error here otherwise disables authentication, inbox and navigation at once.
for (const [index, match] of [...entryHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].entries()) {
  const attributes = match[1];
  if (/\bsrc\s*=/.test(attributes)) continue;
  const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1];
  if (type && !/^(text\/javascript|application\/javascript)$/i.test(type)) continue;
  try { new Script(match[2], { filename: 'staging inline script ' + (index + 1) }); }
  catch (error) { throw new Error('Invalid staging inline JavaScript #' + (index + 1) + ': ' + error.message); }
}

console.log('Prepared isolated staging assets: ' + count + ' files. Production project references checked.');

fs.writeFileSync(path.join(target,"robots.txt"),"User-agent: *\nDisallow: /\n");
