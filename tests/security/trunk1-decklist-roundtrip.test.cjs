'use strict';
// Trunk 1 focused seller deck edit/reopen regression. Source-level only;
// signed seller/buyer, mobile visual and physical Android remain unverified.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const editor = fs.readFileSync(path.join(__dirname, '../../listing-editor-classification.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const { listingEditorLatestDeckList } = vm.runInNewContext(
  editor + '\n({listingEditorLatestDeckList})', {window:{}}
);
const classify = body => '[Listing classification]\n' + body + '\n[End classification]';
const grouped = '4x OP16-097 Yamato\n\n4x OP16-081 Otama';

test('Jayden: older edited deck does not include trailing Set/Variant as cards', () => {
  const description = classify('Full decklist:\n' + grouped + '\nSet: OP-16\nVariant: Regular');
  assert.equal(listingEditorLatestDeckList(description), grouped);
});

test('Jayden: new edited deck keeps group separators and exact quantities', () => {
  const description = classify('Set: OP-16\nVariant: Regular\nFull decklist:\n' + grouped);
  assert.equal(listingEditorLatestDeckList(description), grouped);
  const quantityCode = html.match(/function deckQuantitySummary\(text\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(quantityCode, 'actual seller quantity validator must exist');
  const summarize = vm.runInNewContext('(' + quantityCode + ')');
  const result = summarize(listingEditorLatestDeckList(description));
  assert.equal(result.complete, true);
  assert.equal(result.total, 8);
});

test('Tanner: old published deck stops before generated card condition and notes', () => {
  const legacy = '[Complete Deck]\nDeck: Yamato\nCards: 8\n\nFull decklist:\n'
    + '4x OP16-097 Yamato\n4x OP16-081 Otama'
    + '\n\n[Card Condition]\nNear Mint\n\nSeller note';
  assert.equal(listingEditorLatestDeckList(legacy), grouped.replace('\n\n', '\n'));
});

test('Jayden: latest of two edits wins and Windows line endings work', () => {
  const description = classify('Full decklist:\n4x Old Card') + '\n\n'
    + classify('Set: OP-16\nFull decklist:\n' + grouped).replace(/\n/g, '\r\n');
  assert.equal(listingEditorLatestDeckList(description), grouped);
});

test('New classification writes set and variant BEFORE full decklist', () => {
  const values = editor.slice(editor.indexOf('function values(description){'));
  const setPosition = values.indexOf("if(cards){const setName=");
  const deckPosition = values.indexOf("if(type==='deck'&&get('deckList').trim())lines.push");
  assert.ok(setPosition >= 0 && deckPosition > setPosition, 'decklist must serialize last');
  assert.match(values, /lines\.push\('Full decklist:\\n'\+get\('deckList'\)\.trim\(\)\)/);
});
