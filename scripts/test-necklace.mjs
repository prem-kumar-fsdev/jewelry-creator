import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { createNecklacePhysics, pointOnBracelet, nearestAngle, stepBracelet, freeAngle } from '../src/utils/braceletPhysics.js';
import { NECKLACE_MIN_ANGLE, NECKLACE_MAX_ANGLE, NECKLACE_SIZES, NECKLACE_PRESETS, necklaceFromPreset, necklacePrice, isValidNecklace } from '../src/data/necklaceData.js';
import handler from '../api/create-checkout.js';
import { charmClearance } from '../src/data/braceletData.js';

test('necklace projection follows an open chain without a closing segment', () => {
  for (const size of NECKLACE_SIZES) for (const draped of [true, false]) {
    const model = createNecklacePhysics(size, draped);
    assert.equal(model.lengths.length, model.nodes.length - 1);
    for (let i = 0; i <= 80; i++) {
      const angle = i / 80 * Math.PI;
      const p = pointOnBracelet(model, angle);
      assert.ok(Math.abs(nearestAngle(model, p.x, p.y).angle - angle) < .001);
    }
    assert.ok(nearestAngle(model, 400, 100).distance > 100);
  }
});

test('necklace endpoints stay pinned and the chain settles after an extreme tug', () => {
  const model = createNecklacePhysics();
  for (let frame = 0; frame < 120; frame++) stepBracelet(model, 1 / 60, { type: 'chain', index: 48, x: -5000, y: 5000 });
  assert.ok(model.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
  for (const end of [model.nodes[0], model.nodes.at(-1)]) assert.deepEqual([end.x, end.y], [end.homeX, end.homeY]);
  for (let frame = 0; frame < 600; frame++) stepBracelet(model, 1 / 60, null);
  assert.ok(Math.max(...model.nodes.map(n => Math.hypot(n.x - n.homeX, n.y - n.homeY))) < .1);
});

test('necklace placements stay between the endpoints, including at capacity', () => {
  const bounds = [NECKLACE_MIN_ANGLE, NECKLACE_MAX_ANGLE];
  const items = [];
  for (let i = 0; i < 15; i++) {
    const angle = freeAngle(items, i % 2 ? 0 : Math.PI * 2, undefined, { id: '1st_stone' }, bounds);
    if (angle === null) break;
    assert.ok(angle >= bounds[0] && angle <= bounds[1]);
    items.push({ uuid: `${i}`, id: '1st_stone', angle });
  }
  assert.ok(items.length > 3 && items.length < 12);
  assert.equal(freeAngle(items, Math.PI / 2, undefined, { id: '1st_stone' }, bounds), null);
});

test('necklace drafts accept necklace lengths and reject bracelet lengths and earring pieces', () => {
  NECKLACE_PRESETS.forEach((_, index) => {
    const preset = necklaceFromPreset(index);
    assert.ok(isValidNecklace(preset));
    preset.items.forEach((item, i) => {
      if (i) assert.ok(item.angle - preset.items[i - 1].angle >= charmClearance(item) + charmClearance(preset.items[i - 1]));
    });
  });
  const design = necklaceFromPreset();
  assert.equal(necklacePrice(design), 16500);
  for (const size of [18, 0, 500]) assert.equal(isValidNecklace({ ...design, size }), false);
  for (const item of [{ ...design.items[0], angle: 4 }, { ...design.items[0], id: 'image_1' }]) assert.equal(isValidNecklace({ ...design, items: [item] }), false);
});

test('necklace checkout preserves transforms and charges the necklace base price', async () => {
  const originalFetch = globalThis.fetch;
  const domain = process.env.SHOPIFY_STORE_DOMAIN, token = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  let sent;
  const response = () => ({ code: 200, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  try {
    process.env.SHOPIFY_STORE_DOMAIN = 'test.invalid'; process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN = 'test-only';
    globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ draft_order: { invoice_url: 'https://test.invalid/invoice' } }) }; };
    const design = necklaceFromPreset();
    Object.assign(design.items[0], { rotation: .6, scale: 1.1, mirrored: true });
    const body = { jewelryType: 'necklace', designVersion: 1, baseProductId: 'base-necklace', designName: design.name, metal: design.metal, chainStyle: design.chain, necklaceSize: design.size, configuration: design.items };
    const res = response(); await handler({ method: 'POST', body }, res);
    assert.equal(res.code, 200);
    const line = sent.draft_order.line_items[0];
    assert.equal(line.price, '16500');
    const props = Object.fromEntries(line.properties.map(p => [p.name, p.value]));
    assert.equal(props['Necklace length'], '45 cm');
    assert.deepEqual(JSON.parse(props['Charm arrangement'])[0], { id: design.items[0].id, angle: design.items[0].angle, rotation: .6, scale: 1.1, mirrored: true });
    sent = null;
    const invalid = response(); await handler({ method: 'POST', body: { ...body, necklaceSize: 18 } }, invalid);
    assert.equal(invalid.code, 400); assert.equal(sent, null);
    const noVersion = response(); await handler({ method: 'POST', body: { ...body, designVersion: undefined } }, noVersion);
    assert.equal(noVersion.code, 200); assert.equal(sent.draft_order.line_items[0].price, '16500');
  } finally {
    globalThis.fetch = originalFetch;
    if (domain === undefined) delete process.env.SHOPIFY_STORE_DOMAIN; else process.env.SHOPIFY_STORE_DOMAIN = domain;
    if (token === undefined) delete process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN; else process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN = token;
  }
});
