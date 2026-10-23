import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import handler from '../api/create-checkout.js';
import { fromPreset } from '../src/data/braceletData.js';

function responseStub() {
  return { code: 200, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('bracelet checkout validates input before calling the order service', async () => {
  const response = responseStub();
  await handler({ method: 'POST', body: { jewelryType: 'bracelet', configuration: [] } }, response);
  assert.equal(response.code, 400);
  assert.equal(response.body.error, 'Invalid bracelet design');
});

test('bracelet order preserves metal, chain, size and arrangement with server pricing', async () => {
  const originalFetch = globalThis.fetch;
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  let sent;
  try {
    process.env.SHOPIFY_STORE_DOMAIN = 'test.invalid';
    process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN = 'test-only';
    globalThis.fetch = async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ draft_order: { invoice_url: 'https://test.invalid/invoice' } }) };
    };
    for (const [preset, price] of [[0, '25000'], [3, '20250']]) {
      const design = fromPreset(preset);
      if (preset === 3) Object.assign(design.items[0], { rotation: .8, scale: 1.15, mirrored: true });
      const response = responseStub();
      await handler({ method: 'POST', body: { jewelryType: 'bracelet', baseProductId: 'base-bracelet', designName: design.name, metal: design.metal, chainStyle: design.chain, braceletSize: design.size, configuration: design.items } }, response);
      assert.equal(response.code, 200);
      const line = sent.draft_order.line_items[0];
      assert.equal(line.price, price);
      const props = Object.fromEntries(line.properties.map(p => [p.name, p.value]));
      assert.equal(props['Bracelet length'], '18 cm');
      assert.equal(props['Chain style'], 'paperclip');
      assert.deepEqual(JSON.parse(props['Charm arrangement']), design.items.map(item => Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'uuid'))));
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (domain === undefined) delete process.env.SHOPIFY_STORE_DOMAIN; else process.env.SHOPIFY_STORE_DOMAIN = domain;
    if (token === undefined) delete process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN; else process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN = token;
  }
});
