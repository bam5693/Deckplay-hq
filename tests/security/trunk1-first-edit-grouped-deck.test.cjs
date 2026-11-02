'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../listing-editor-classification.js'), 'utf8');
const restore = vm.runInNewContext(source + '\nlistingEditorLatestDeckList', { window: {} });

test('first edit restores every blank-separated group from a published One Piece deck', () => {
  const description = '[Complete Deck]\nDeck: Red Sabo\nCards: 8\n\nFull decklist:\n4x OP16-097 Yamato\n\n4x OP16-081 Otama\n\n[Card Condition]\nNear Mint\n\nSet: OP-16\n\nSeller notes';
  assert.equal(restore(description), '4x OP16-097 Yamato\n\n4x OP16-081 Otama');
});

test('graded disclosure boundary does not swallow grading or notes', () => {
  const description = '[Complete Deck]\nDeck: Zoro\nCards: 8\n\nFull decklist:\n4x OP16-093 Zoro\n\n4x OP16-089 Sanji\n\n[Graded Card]\nGrader: PSA\nGrade: 9\n\n[Card Condition]\nGraded';
  assert.equal(restore(description), '4x OP16-093 Zoro\n\n4x OP16-089 Sanji');
});

test('Windows line endings preserve groups and strip later disclosure', () => {
  const description = '[Complete Deck]\r\nDeck: Test\r\nCards: 8\r\n\r\nFull decklist:\r\n4x A\r\n\r\n4x B\r\n\r\n[Card Condition]\r\nNear Mint';
  assert.equal(restore(description), '4x A\n\n4x B');
});

test('latest edited classification still overrides original published cards', () => {
  const description = '[Complete Deck]\nDeck: Old\nCards: 4\n\nFull decklist:\n4x Old\n\n[Card Condition]\nNear Mint\n\n[Listing classification]\nDeck: New\nCards: 8\nFull decklist:\n4x Zoro\n\n4x Sanji\n[End classification]';
  assert.equal(restore(description), '4x Zoro\n\n4x Sanji');
});

test('unmarked historical notes use conservative fallback', () => {
  assert.equal(restore('Full decklist:\n4x Legacy\n\nSeller prose'), '4x Legacy');
});
