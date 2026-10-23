import { charmRotation, charmRestRotation, charmScale, stoneById } from '../data/braceletData.js';

// Keep the photographed top eyelet fixed as the image rotates, flips or scales.
export function charmGeometry(item, anchor, swing = 0) {
  const stone = stoneById(item.id);
  const scale = charmScale(item);
  const rotation = charmRestRotation(item) + swing - .35 * Math.cos(item.angle) + charmRotation(item);
  const width = (stone.width || stone.radius * 2) * scale;
  const height = (stone.height || stone.radius * 2.3) * scale;
  const dx = stone.kind === 'photo' ? (.5 - stone.pivot.x) * width * (item.mirrored ? -1 : 1) : 0;
  const dy = stone.kind === 'photo' ? (.5 - stone.pivot.y) * height : 26 * scale;
  const jointY = anchor.y + (stone.kind === 'photo' ? 8 : 0);
  return {
    x: anchor.x + Math.cos(rotation) * dx - Math.sin(rotation) * dy,
    y: jointY + Math.sin(rotation) * dx + Math.cos(rotation) * dy,
    rotation, width, height, anchor, length: Math.max(12, Math.hypot(dx, dy)),
  };
}

export function hitCharm(hit, point) {
  const dx = point.x - hit.x, dy = point.y - hit.y;
  const x = dx * Math.cos(hit.rotation) + dy * Math.sin(hit.rotation);
  const y = -dx * Math.sin(hit.rotation) + dy * Math.cos(hit.rotation);
  return (x / (hit.width / 2 + 8)) ** 2 + (y / (hit.height / 2 + 8)) ** 2 <= 1;
}
