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
  if (name.startsWith('tests/') || name.startsWith('scripts/') || name.startsWith('.github/') || name.startsWith('node_modules/') || name.startsWith('dist-')) continue;
  const original = fs.readFileSync(name);
  let output = original;
  if (/\.(html|js|json|webmanifest|css)$/.test(name)) {
    const text = original.toString('utf8');
    let replaced = text.replaceAll('https://yffruutknztvdyioovmp.supabase.co', url).replaceAll('sb_publishable_cHzM8sQmrqfcCH8lhESytg_FMJrQtCX', key);
    if (name.endsWith('.html')) replaced = replaced.replace(/<head>/i, '<head>\\n<meta name="robots" content="noindex,nofollow">');
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
console.log('Prepared isolated staging assets: ' + count + ' files. Production project references checked.');
