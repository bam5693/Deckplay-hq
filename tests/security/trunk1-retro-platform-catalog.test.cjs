'use strict';
// Focused source regression for T1.3. Not deployed or signed buyer/seller acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/category-catalog.json'), 'utf8'));
const editor = fs.readFileSync(path.join(root, 'listing-editor-classification.js'), 'utf8');
const exact = ['Sega Genesis / Mega Drive', 'Sega Saturn', 'Sega Dreamcast', 'Atari 2600', 'Atari 7800'];
const platformOptions = [...html.match(/<select id="gamePlatform">([\s\S]*?)<\/select>/)?.[1].matchAll(/<option(?:\s+[^>]*)?>([^<]*)<\/option>/g) || []].map(match => match[1]).slice(1);

test('Tanner: five real retro game platforms are explicit choices, with original Sega/Atari/Other preserved', () => {
  assert.deepEqual(platformOptions, fixture.controls.gamePlatform.map(choice => choice.value),
    'The actual seller form and category fixture must use the same ordered platform taxonomy');
  for (const name of exact) {
    assert.ok(platformOptions.includes(name), name + ' must not require generic Other');
    assert.ok(fixture.rows.some(row => row.fields.gamePlatform === name && row.fields.category === 'video_games'));
  }
  for (const name of ['Sega', 'Atari', 'Other', 'Nintendo Switch 2', 'PlayStation 5']) {
    assert.ok(platformOptions.includes(name), 'Existing choice ' + name + ' must survive');
  }
});

test('Jayden: buyer platform filter copies the seller taxonomy, not a separate stale dropdown', () => {
  assert.match(html, /target=document.getElementById\("marketPlatform"\);for\(const o of document.getElementById\("gamePlatform"\).options\)if\(o.value\)target.add\(new Option\(o.textContent,o.value\)\)/);
  assert.match(html, /if\(cat==="Video Games"&&platform!=="All"\)list=list.filter\(item=>\(item.platform\?\?marketplaceCurrentPlatform\(item.description\)\)===platform\)/);
  assert.ok(!platformOptions.includes('Sega Genesis'), 'Do not silently split one known platform into inconsistent labels');
});

test('Jayden and Tanner: corrected Dreamcast/7800 edits remain exact in buyer search and filter; legacy generic stays generic', () => {
  const platformSource = html.match(/function marketplaceCurrentPlatform\(description\)\{[\s\S]*?\n\}/)?.[0];
  const searchSource = html.match(/function marketplaceCurrentSearchDescription\(value\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(platformSource && searchSource, 'Buyer metadata helpers must exist');
  const platform = vm.runInNewContext('(' + platformSource + ')');
  const search = vm.runInNewContext('(' + searchSource + ')');
  for (const current of ['Sega Dreamcast', 'Atari 7800']) {
    const desc = 'Platform: PlayStation 5\n[Listing classification]\nPlatform: ' + current + '\n[End classification]';
    assert.equal(platform(desc), current, 'Latest seller edit must drive buyer filter');
    assert.ok(search(desc).includes(current), 'Buyer search must see exact corrected platform');
    assert.ok(!search(desc).includes('PlayStation 5'), 'Buyer search must not revive superseded platform');
  }
  assert.equal(platform('Platform: Sega'), 'Sega', 'Never invent Genesis for an old generic Sega listing');
  assert.equal(platform('Platform: Atari'), 'Atari', 'Never invent 2600 for an old generic Atari listing');
  assert.match(editor, /set\('gamePlatform',line\('Platform'\)\)/,
    'Seller editor must restore the saved platform rather than resetting to generic');
});
