import { BRACELET_SCENES, charmScale, stoneById } from '../data/braceletData.js';
import { pointOnBracelet, TAU } from './braceletPhysics.js';
import { charmGeometry } from './braceletCharms.js';
import { photoTexture } from './braceletPhotoAssets.js';

const METAL = {
  gold: ['#6f5329', '#b99451', '#f8e6af', '#d6b470', '#fff4d4'],
  silver: ['#657078', '#a6b0b5', '#f7fcff', '#c6d0d4', '#ffffff'],
  roseGold: ['#815047', '#c18d78', '#ffe2d1', '#dda993', '#fff0e4'],
};

function metalGradient(ctx, metal, radius = 12) {
  const g = ctx.createLinearGradient(-radius, -radius, radius, radius);
  METAL[metal].forEach((color, i) => g.addColorStop(i / 4, color));
  return g;
}

export function drawStone(ctx, id, x, y, metal, rotation = 0, scale = 1, mirrored = false) {
  const stone = stoneById(id);
  const r = stone.radius;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale);
  if (mirrored) ctx.scale(-1, 1);
  if (stone.kind === 'photo') {
    const texture = photoTexture(id, metal);
    if (texture) {
      ctx.shadowColor = 'rgba(28,33,22,.24)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
      ctx.drawImage(texture, -stone.width / 2, -stone.height / 2, stone.width, stone.height);
      if (stone.mount === 'pin') {
        // A small attachment preview for bare pearls/beads, without painting over their surface.
        ctx.shadowColor = 'transparent';
        const px = (stone.pivot.x - .5) * stone.width, py = (stone.pivot.y - .5) * stone.height;
        ctx.beginPath(); ctx.ellipse(px, py, 2.1, 3.2, Math.atan2(-px, -py), 0, TAU);
        ctx.strokeStyle = metalGradient(ctx, metal); ctx.lineWidth = 1.3; ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#89917b'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.strokeRect(-stone.width / 2, -stone.height / 2, stone.width, stone.height);
    }
    ctx.restore();
    return;
  }
  ctx.shadowColor = 'rgba(28,33,22,.28)'; ctx.shadowBlur = 7; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5;
  ctx.beginPath(); ctx.ellipse(0, 0, r + 2, r * 1.15 + 2, 0, 0, TAU);
  ctx.fillStyle = metalGradient(ctx, metal, r); ctx.fill();
  ctx.shadowColor = 'transparent';
  const g = ctx.createRadialGradient(-r * .35, -r * .4, 0, 0, 0, r * 1.2);
  const colors = id === 'pearl' ? ['#ffffff', '#f4eee5', '#cec8bf', '#e8dcd3', '#93968e'] :
    id === 'jade' ? ['#bfd7ab', '#669b77', '#34654f', '#204d3b', '#123529'] :
    id === 'amethyst' ? ['#e7ccf0', '#b697cc', '#725085', '#593569', '#382445'] : ['#ffffff', '#e7eeeb', '#a2b7bc', '#d6e3e2', '#677e86'];
  colors.forEach((color, i) => g.addColorStop(i / 4, color));
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.15, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
  if (stone.kind === 'gem' && id !== 'jade') {
    ctx.save(); ctx.clip();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .45, Math.sin(a) * r * .5);
      ctx.lineTo(Math.cos(a - .32) * r, Math.sin(a - .32) * r * 1.15);
      ctx.lineTo(Math.cos(a + .32) * r, Math.sin(a + .32) * r * 1.15); ctx.closePath();
      ctx.fillStyle = i % 3 ? 'rgba(255,255,255,.22)' : 'rgba(28,17,40,.24)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = .5; ctx.stroke();
    }
    ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(-r * .3, -r * .43, r * .31, r * .16, -.55, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,.66)'; ctx.fill();
  if (stone.kind !== 'pearl') {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 1.12, 2, 0, TAU);
      ctx.fillStyle = metalGradient(ctx, metal, r); ctx.fill();
    }
  }
  ctx.restore();
}

function drawLink(ctx, x, y, rotation, metal, length, width, wire = 2) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.beginPath(); ctx.ellipse(0, 0, length, width, 0, 0, TAU);
  ctx.strokeStyle = METAL[metal][0]; ctx.lineWidth = wire + 1; ctx.stroke();
  ctx.strokeStyle = metalGradient(ctx, metal, length); ctx.lineWidth = wire; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-.3, -.6, length - .4, width - .4, 0, Math.PI, TAU);
  ctx.strokeStyle = METAL[metal][4]; ctx.lineWidth = .7; ctx.stroke();
  ctx.restore();
}

export function charmPosition(model, item) {
  const anchor = pointOnBracelet(model, item.angle);
  const swing = model.charms.get(item.uuid)?.swing || 0;
  return charmGeometry(item, anchor, swing);
}

export function drawBracelet(ctx, width, height, model, design, options = {}) {
  const scene = BRACELET_SCENES.find(s => s.id === options.scene) || BRACELET_SCENES[0];
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, scene.light); bg.addColorStop(.55, scene.color); bg.addColorStop(1, scene.dark);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  const fit = Math.min(width / (width < 520 ? 600 : 800), height / 640);
  const scale = fit * (options.zoom || 1);
  ctx.save(); ctx.translate(width / 2 - 400 * scale, height / 2 - 320 * scale); ctx.scale(scale, scale);
  // Quiet architectural arcs and fine paper grain, baked into exports as well.
  ctx.save(); ctx.strokeStyle = scene.id === 'midnight' ? '#ffffff08' : '#ffffff40'; ctx.lineWidth = 1;
  [430, 450, 470].forEach(r => { ctx.beginPath(); ctx.arc(30, 650, r, 0, TAU); ctx.stroke(); });
  ctx.globalAlpha = .065; ctx.fillStyle = scene.ink;
  for (let i = 0; i < 1100; i++) ctx.fillRect((i * 137.509) % 800, (i * 79.713) % 640, .7, .7);
  ctx.restore();
  // Broad, soft contact shadow underneath the jewelry.
  ctx.save(); ctx.translate(3, 8); ctx.beginPath();
  model.nodes.forEach((n, i) => i ? ctx.lineTo(n.x, n.y) : ctx.moveTo(n.x, n.y)); ctx.closePath();
  ctx.strokeStyle = 'rgba(26,35,22,.12)'; ctx.lineWidth = 11; ctx.filter = 'blur(7px)'; ctx.stroke(); ctx.restore();
  const count = design.chain === 'paperclip' ? 64 : design.chain === 'rope' ? 200 : 108;
  for (let i = 0; i < count; i++) {
    // Leave a real opening for the clasp at the top of the bracelet.
    const angle = -Math.PI / 2 + .08 + i / (count - 1) * (TAU - .16);
    const p = pointOnBracelet(model, angle);
    const length = design.chain === 'paperclip' ? 10.5 : design.chain === 'rope' ? 4.2 : 6.4;
    const w = design.chain === 'paperclip' ? (i % 2 ? 2.3 : 4.4) : design.chain === 'rope' ? 3.1 : (i % 2 ? 1.8 : 3.5);
    drawLink(ctx, p.x, p.y, p.tangent + (design.chain === 'rope' ? .65 : 0), design.metal, length, w, design.chain === 'rope' ? 1.8 : 2);
  }
  const clasp = pointOnBracelet(model, -Math.PI / 2);
  drawLink(ctx, clasp.x, clasp.y, 0, design.metal, 12, 6, 3.5);
  drawLink(ctx, clasp.x + 7, clasp.y + 5, -.5, design.metal, 4, 2, 1.6);
  // Hallmark tag alongside the closure.
  ctx.save(); ctx.translate(clasp.x - 19, clasp.y + 10); ctx.rotate(.4);
  ctx.fillStyle = metalGradient(ctx, design.metal); ctx.beginPath(); ctx.roundRect(-4, -5, 8, 13, 3); ctx.fill();
  ctx.fillStyle = METAL[design.metal][0]; ctx.font = '4px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('A', 0, 3); ctx.restore();
  const hits = [];
  [...design.items].sort((a, b) => Math.sin(a.angle) - Math.sin(b.angle)).forEach(item => {
    const p = charmPosition(model, item);
    drawLink(ctx, p.anchor.x, p.anchor.y + (stoneById(item.id).kind === 'photo' ? 4 : 7), 0, design.metal, 3.4, 6, 1.4);
    drawStone(ctx, item.id, p.x, p.y, design.metal, p.rotation, charmScale(item), item.mirrored);
    if (options.selected === item.uuid) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.beginPath(); ctx.ellipse(0, 0, p.width / 2 + 7, p.height / 2 + 7, 0, 0, TAU);
      ctx.strokeStyle = scene.ink; ctx.globalAlpha = .65; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.restore();
    }
    hits.push({ uuid: item.uuid, ...p });
  });
  if (options.guide) {
    ctx.save(); ctx.strokeStyle = scene.ink; ctx.globalAlpha = .3; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(240, 565); ctx.lineTo(560, 565); ctx.stroke();
    [240, 560].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 560); ctx.lineTo(x, 570); ctx.stroke(); });
    ctx.globalAlpha = .8; ctx.fillStyle = scene.ink; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${design.size} CM  /  ILLUSTRATIVE SCALE`, 400, 586); ctx.restore();
  }
  ctx.restore();
  return { hits, scale, offsetX: width / 2 - 400 * scale, offsetY: height / 2 - 320 * scale };
}
