import { charmClearance } from '../data/braceletData.js';

// Fixed-step spring dynamics, a closed chain with distance constraints, and
// independently damped charms. Coordinates are in a resolution-independent stage.
export const TAU = Math.PI * 2;
export const normalizeAngle = angle => ((angle % TAU) + TAU) % TAU;
export const angleDistance = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function freeAngle(items, desired, exclude, candidateItem = {}) {
  const moving = items.find(item => item.uuid === exclude) || candidateItem;
  for (let i = 0; i < 180; i++) {
    const offset = Math.ceil(i / 2) * 0.055 * (i % 2 ? 1 : -1);
    const candidate = normalizeAngle(desired + offset);
    if (items.every(item => item.uuid === exclude || Math.abs(angleDistance(candidate, item.angle)) >= charmClearance(item) + charmClearance(moving))) return candidate;
  }
  return null;
}

export function createBraceletPhysics(size = 18, draped = false) {
  const count = 96;
  const rx = 205 * (size / 18) ** 0.45;
  const ry = draped ? 150 : 172;
  const nodes = Array.from({ length: count }, (_, i) => {
    const a = i / count * TAU;
    const x = 400 + rx * Math.cos(a) + 12 * Math.sin(2 * a);
    const y = 302 + ry * Math.sin(a) + (draped ? 20 * Math.sin(a) ** 2 : 0);
    return { x, y, homeX: x, homeY: y, vx: 0, vy: 0 };
  });
  const lengths = nodes.map((n, i) => Math.hypot(n.x - nodes[(i + 1) % count].x, n.y - nodes[(i + 1) % count].y));
  return { nodes, lengths, charms: new Map(), accumulator: 0 };
}

export function pointOnBracelet(model, angle) {
  const index = normalizeAngle(angle) / TAU * model.nodes.length;
  const a = model.nodes[Math.floor(index) % model.nodes.length];
  const b = model.nodes[(Math.floor(index) + 1) % model.nodes.length];
  const t = index % 1;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tangent: Math.atan2(b.y - a.y, b.x - a.x) };
}

export function nearestAngle(model, x, y) {
  let best = Infinity;
  let angle = 0;
  for (let i = 0; i < model.nodes.length; i++) {
    const a = model.nodes[i];
    const b = model.nodes[(i + 1) % model.nodes.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const distance = Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
    if (distance < best) { best = distance; angle = (i + t) / model.nodes.length * TAU; }
  }
  return { angle, distance: best };
}

export function stepBracelet(model, elapsed, drag, reducedMotion = false) {
  const dt = 1 / 120;
  model.accumulator += Math.min(Math.max(elapsed, 0), 1 / 15);
  while (model.accumulator >= dt) {
    model.accumulator -= dt;
    model.nodes.forEach((node, index) => {
      const pinned = drag?.type === 'chain' && drag.index === index;
      if (pinned) {
        node.x = node.homeX + Math.max(-75, Math.min(75, drag.x - node.homeX));
        node.y = node.homeY + Math.max(-75, Math.min(75, drag.y - node.homeY));
        node.vx = 0; node.vy = 0;
      } else {
        const stiffness = reducedMotion ? 150 : 42;
        node.vx = (node.vx + (node.homeX - node.x) * stiffness * dt) * Math.exp(-9 * dt);
        node.vy = (node.vy + (node.homeY - node.y) * stiffness * dt) * Math.exp(-9 * dt);
        node.x += node.vx * dt; node.y += node.vy * dt;
      }
    });
    for (let pass = 0; pass < 5; pass++) {
      model.nodes.forEach((a, index) => {
        const next = (index + 1) % model.nodes.length;
        const b = model.nodes[next];
        const dx = b.x - a.x, dy = b.y - a.y;
        const length = Math.hypot(dx, dy) || 1;
        const correction = (length - model.lengths[index]) / length * 0.45;
        if (!(drag?.type === 'chain' && drag.index === index)) { a.x += dx * correction; a.y += dy * correction; }
        if (!(drag?.type === 'chain' && drag.index === next)) { b.x -= dx * correction; b.y -= dy * correction; }
      });
    }
    model.charms.forEach(charm => {
      if (reducedMotion) { charm.swing = 0; charm.velocity = 0; return; }
      charm.velocity += -(65 * 26 / (charm.length || 26)) * Math.sin(charm.swing) * dt;
      charm.velocity *= Math.exp(-(5.2 / Math.sqrt(charm.mass || 1)) * dt);
      charm.swing += charm.velocity * dt;
    });
  }
}
