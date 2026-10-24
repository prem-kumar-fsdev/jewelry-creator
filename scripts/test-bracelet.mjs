import test from 'node:test';
import assert from 'node:assert/strict';
import { createBraceletPhysics, freeAngle, angleDistance, nearestAngle, pointOnBracelet, stepBracelet, TAU } from '../src/utils/braceletPhysics.js';
import { PHOTO_STONES, charmClearance, fromPreset, isValidDesign, migrateBraceletDraft, priceOf } from '../src/data/braceletData.js';
import { COMPONENTS } from '../src/data/jewelryData.js';
import { charmGeometry, hitCharm } from '../src/utils/braceletCharms.js';
import { previewMetalPixel, previewStonePixel } from '../src/utils/braceletPhotoAssets.js';

test('chain remains finite during extreme pulls and settles back after release', () => {
  const model = createBraceletPhysics();
  for (let frame = 0; frame < 120; frame++) stepBracelet(model, 1 / 60, { type: 'chain', index: 24, x: 5000, y: -5000 });
  assert.ok(model.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
  assert.ok(Math.max(...model.nodes.map(n => Math.hypot(n.x - n.homeX, n.y - n.homeY))) < 110);
  for (let frame = 0; frame < 600; frame++) stepBracelet(model, 1 / 60, null);
  assert.ok(Math.max(...model.nodes.map(n => Math.hypot(n.x - n.homeX, n.y - n.homeY))) < .1);
});

test('fixed timestep gives the same charm settling at 30, 60 and 120 fps', () => {
  const outcomes = [30, 60, 120].map(fps => {
    const model = createBraceletPhysics();
    model.charms.set('test', { swing: .8, velocity: 3 });
    for (let frame = 0; frame < fps * 2; frame++) stepBracelet(model, 1 / fps, null);
    return model.charms.get('test').swing;
  });
  assert.ok(Math.max(...outcomes) - Math.min(...outcomes) < .001);
  assert.ok(Math.abs(outcomes[0]) < .02);
});

test('background-tab elapsed time is bounded and reduced motion stops charm swing', () => {
  const model = createBraceletPhysics();
  model.charms.set('test', { swing: 2, velocity: 20 });
  stepBracelet(model, 180, null, true);
  assert.equal(model.charms.get('test').swing, 0);
  assert.ok(model.accumulator < 1 / 120);
});

test('placement maintains spacing across the angle seam and with twelve charms', () => {
  const items = [{ uuid: 'first', angle: TAU - .01 }];
  const nearSeam = freeAngle(items, .01);
  assert.ok(Math.abs(angleDistance(nearSeam, items[0].angle)) >= .24);
  while (items.length < 12) {
    const angle = freeAngle(items, Math.PI / 2);
    assert.notEqual(angle, null);
    assert.ok(items.every(item => Math.abs(angleDistance(item.angle, angle)) >= .24));
    items.push({ uuid: `${items.length}`, angle });
  }
});

test('nearest-point projection round trips around both arrangements at every size', () => {
  for (const size of [16, 18, 21]) for (const draped of [false, true]) {
    const model = createBraceletPhysics(size, draped);
    for (let i = 0; i < 80; i++) {
      const angle = i / 80 * TAU;
      const point = pointOnBracelet(model, angle);
      const projected = nearestAngle(model, point.x, point.y);
      assert.ok(Math.abs(angleDistance(projected.angle, angle)) < .001);
      assert.ok(projected.distance < .001);
    }
  }
});

test('draft validation rejects corrupted data and prices match the existing catalog', () => {
  const design = fromPreset();
  assert.ok(isValidDesign(design));
  assert.equal(priceOf(design), 25000);
  for (const invalid of [null, {}, { ...design, items: [null] }, { ...design, size: 500 }, { ...design, metal: 'invalid' }, { ...design, items: [...design.items, design.items[0]] }, { ...design, items: [{ uuid: 'x', id: 'unknown', angle: 0 }] }]) assert.equal(isValidDesign(invalid), false);
});

test('all photo eyelets stay attached through rotations, flips and scaling', () => {
  const anchor = { x: 400, y: 470 };
  for (const stone of PHOTO_STONES) for (const rotation of [-Math.PI, -.8, 0, 1.2]) for (const mirrored of [true, false]) for (const scale of [.75, 1, 1.25]) {
    const item = { id: stone.id, angle: 1.2, rotation, mirrored, scale };
    const geometry = charmGeometry(item, anchor, .2);
    const x = (stone.pivot.x - .5) * geometry.width * (mirrored ? -1 : 1);
    const y = (stone.pivot.y - .5) * geometry.height;
    const eyeletX = geometry.x + Math.cos(geometry.rotation) * x - Math.sin(geometry.rotation) * y;
    const eyeletY = geometry.y + Math.sin(geometry.rotation) * x + Math.cos(geometry.rotation) * y;
    assert.ok(Math.abs(eyeletX - anchor.x) < .00001);
    assert.ok(Math.abs(eyeletY - anchor.y - 8) < .00001);
    assert.ok(hitCharm(geometry, { x: geometry.x, y: geometry.y }));
    assert.equal(hitCharm(geometry, { x: geometry.x + 100, y: geometry.y }), false);
  }
});

test('photo finish previews retain pearl whites and blue stones', () => {
  for (const metal of ['gold', 'silver', 'roseGold']) {
    for (const color of [[240, 238, 231], [170, 215, 221], [65, 125, 140], [255, 255, 255]]) assert.deepEqual(previewMetalPixel(...color, metal), color);
  }
  const gold = [210, 160, 70];
  assert.deepEqual(previewMetalPixel(...gold, 'gold'), gold);
  const silver = previewMetalPixel(...gold, 'silver');
  assert.ok(Math.abs(silver[0] - silver[2]) < 20);
  assert.notDeepEqual(previewMetalPixel(...gold, 'roseGold'), gold);
});

test('large rotated photo charms reserve enough room and validate customizations', () => {
  const design = fromPreset(3);
  assert.equal(priceOf(design), 20250);
  assert.ok(isValidDesign(design));
  const item = { ...design.items[0], scale: 1.25, rotation: Math.PI / 2, mirrored: true };
  assert.ok(charmClearance(item) > charmClearance(design.items[0]));
  const angle = freeAngle(design.items, design.items[0].angle, undefined, item);
  assert.ok(design.items.every(other => Math.abs(angleDistance(other.angle, angle)) >= charmClearance(other) + charmClearance(item)));
  for (const patch of [{ scale: 5 }, { rotation: Infinity }, { mirrored: 'yes' }]) assert.equal(isValidDesign({ ...design, items: [{ ...item, ...patch }] }), false);
  assert.ok(isValidDesign({ ...design, items: [item] }));
});

test('bracelet photo catalog covers all nine numbered originals and excludes earring-only pieces', () => {
  const originals = COMPONENTS.filter(stone => /^\d+(st|nd|rd|th)_stone$/.test(stone.id));
  assert.equal(PHOTO_STONES.length, 9);
  assert.deepEqual(PHOTO_STONES.map(stone => stone.id), originals.map(stone => stone.id));
  for (const stone of PHOTO_STONES) {
    const source = originals.find(original => original.id === stone.id);
    assert.equal(stone.image, source.image);
    assert.equal(stone.price, source.price);
    assert.ok(!source.forEarrings);
  }
  for (const stone of COMPONENTS.filter(stone => stone.forEarrings)) {
    assert.equal(isValidDesign({ ...fromPreset(), items: [{ uuid: 'earring', id: stone.id, angle: 1 }] }), false);
  }
});

test('retired earring pieces are removed without substituting or losing other draft details', () => {
  const valid = fromPreset(3);
  assert.equal(migrateBraceletDraft(valid), valid);
  const saved = { ...valid, name: 'My bracelet', metal: 'roseGold', items: [...valid.items, { uuid: 'earring', id: 'image_1', angle: 3 }] };
  assert.deepEqual(migrateBraceletDraft(saved), { ...saved, items: valid.items });
  assert.equal(saved.items.length, valid.items.length + 1);
  assert.equal(migrateBraceletDraft({ ...saved, items: [{ uuid: 'unknown', id: 'unknown', angle: 3 }] }), null);
});

test('warm natural pearl and bead colors stay unchanged across all metal finishes', () => {
  for (const stone of PHOTO_STONES.filter(stone => !stone.finish)) {
    for (const metal of ['gold', 'silver', 'roseGold']) {
      assert.deepEqual(previewStonePixel(stone, 210, 160, 70, metal), [210, 160, 70]);
    }
  }
  const shell = PHOTO_STONES.find(stone => stone.id === '6th_stone');
  assert.deepEqual(previewStonePixel(shell, 160, 180, 170, 'silver'), [160, 180, 170]);
  assert.notDeepEqual(previewStonePixel(shell, 160, 180, 170, 'gold'), [160, 180, 170]);
});
