// Validate all inline JavaScript before a production deployment.
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
let checked = 0;
for (const [, attrs, source] of scripts) {
  if (/\bsrc\s*=/.test(attrs) || !source.trim()) continue;
  const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1];
  if (type && !['text/javascript', 'application/javascript'].includes(type)) continue;
  try { new vm.Script(source, { filename: 'index.html:inline-' + (++checked) }); }
  catch (error) { console.error('Inline JavaScript validation failed:', error.message); process.exit(1); }
}
if (!checked) { console.error('No inline JavaScript found to validate'); process.exit(1); }
console.log('Validated ' + checked + ' inline scripts.');
