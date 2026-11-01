'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const html = readFileSync(join(__dirname, '../../index.html'), 'utf8');
const offerHandler = html.split('\n').find(line =>
  line.includes('document.getElementById("detailContent").addEventListener("click",e=>{const b=e.target.closest("[data-price-offer-id]")')
);

function openOffer(currentUser, disclosedQuantity) {
  assert.ok(offerHandler, 'the real listing-detail offer handler must be present');
  let onClick;
  const opened = [];
  const nodes = {
    detailContent: { addEventListener: (_name, handler) => { onClick = handler; } },
    priceOfferContext: { textContent: '' },
    priceOfferAmount: { value: '' },
    priceOfferStatus: { textContent: '' },
  };
  const document = { getElementById: id => nodes[id] };
  const items = [{
    databaseId: 'fixture-lot', sellerId: 'seller-id',
    n: '1983-84 O-Pee-Chee hockey lot', p: 45.5,
    description: '[Listing contents]\\nQuantity: 4\\nUnit: cards\\n[End listing contents]',
  }];
  const setup = new Function(
    'document', 'currentUser', 'items', 'listingDisclosedQuantity', 'openModal',
    'let priceOfferListingId=null,priceOfferContextVersion=0;' + offerHandler
  );
  setup(document, currentUser, items, () => disclosedQuantity, id => opened.push(id));
  onClick({ target: { closest: () => ({ dataset: { priceOfferId: 'fixture-lot' } }) } });
  return { opened, context: nodes.priceOfferContext.textContent, amount: nodes.priceOfferAmount.value };
}

test('seller sees a full-listing price, not a misleading per-item price', () => {
  assert.match(html, /<label for="price">Asking price for everything included \\(USD\\)<\\/label><input id="price"[^>]*aria-describedby="listingPriceScopeHelp"/);
  assert.match(html, /id="listingPriceScopeHelp"[^>]*>One price for the full listing, not per item\\. Shipping, taxes and fees are not calculated\\./);
});

test('buyer offer explicitly separates full-listing amount from unknown charges and payment', () => {
  assert.match(html, /<label for="priceOfferAmount">Your offer for the full listing \\(USD\\)<\\/label><input id="priceOfferAmount"[^>]*aria-describedby="priceOfferScopeHelp"/);
  assert.match(html, /id="priceOfferScopeHelp"[^>]*>Offers cover everything included, not each item\\.[^<]*does not collect payment\\./);
});

test('real offer click handler displays lot quantity but never invents legacy quantity', () => {
  const lot = openOffer({ id: 'buyer-id' }, { amount: 4, unit: 'cards' });
  assert.equal(lot.opened[0], 'priceOfferModal');
  assert.match(lot.context, /Asking \\$45\\.50 · 4 cards included/);
  assert.equal(lot.amount, '45.50');

  const legacy = openOffer({ id: 'buyer-id' }, null);
  assert.match(legacy.context, /Asking \\$45\\.50/);
  assert.doesNotMatch(legacy.context, /included/);
});

test('offer entry keeps seller and anonymous-account safeguards', () => {
  assert.equal(openOffer({ id: 'seller-id' }, { amount: 4, unit: 'cards' }).opened.length, 0);
  assert.equal(openOffer(null, { amount: 4, unit: 'cards' }).opened[0], 'authModal');
});
