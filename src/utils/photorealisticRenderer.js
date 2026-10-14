/**
 * Photorealistic Luxury Jewelry Rendering Engine
 *
 * Implements physically-based metallic shaders, equidistant interlocking link
 * geometry, multi-pass contact shadows, authentic jewelry bails & fasteners,
 * and specular facet reflections.
 */

import { METALS, CHAIN_STYLES, BACKDROPS } from "../data/jewelryData";

// ─── PBR Metal Palette Definitions ──────────────────────────────────────────
export const LUXURY_METALS = {
  gold: {
    name: "18k Yellow Gold",
    highlight: "#FFFDF2",
    specular: "#FFF4B8",
    primary: "#E6BE44",
    secondary: "#C99B24",
    shadow: "#734F0A",
    deepShadow: "#3B2603",
    ambient: "#A87D18",
    fresnel: "rgba(255, 235, 150, 0.6)",
    glow: "rgba(255, 215, 80, 0.35)",
  },
  roseGold: {
    name: "18k Rose Gold",
    highlight: "#FFF6F4",
    specular: "#FED6CD",
    primary: "#E89B8C",
    secondary: "#C97768",
    shadow: "#73382D",
    deepShadow: "#3D1912",
    ambient: "#A85B4E",
    fresnel: "rgba(255, 200, 190, 0.6)",
    glow: "rgba(255, 170, 155, 0.35)",
  },
  silver: {
    name: "Platinum White Gold",
    highlight: "#FFFFFF",
    specular: "#F4F7FC",
    primary: "#D8E0EA",
    secondary: "#A4B2C2",
    shadow: "#526070",
    deepShadow: "#252D36",
    ambient: "#788796",
    fresnel: "rgba(230, 242, 255, 0.65)",
    glow: "rgba(210, 230, 255, 0.35)",
  }
};

function getMetalPalette(metalKey = "gold") {
  return LUXURY_METALS[metalKey] || LUXURY_METALS.gold;
}

// ─── Equidistant Curve Samplers ──────────────────────────────────────────────

/**
 * Samples points along an ellipse arc at exact equal arc-length increments (linkPitch)
 */
export function sampleEquidistantEllipse(cx, cy, rx, ry, startAngle, endAngle, linkPitch = 7.5) {
  // 1. High-resolution raw sampling to measure cumulative arc length
  const SUBDIVS = 600;
  const rawPoints = [];
  let totalLength = 0;

  for (let i = 0; i <= SUBDIVS; i++) {
    const t = startAngle + (i / SUBDIVS) * (endAngle - startAngle);
    const x = cx + rx * Math.cos(t);
    const y = cy + ry * Math.sin(t);
    if (i > 0) {
      const prev = rawPoints[i - 1];
      totalLength += Math.hypot(x - prev.x, y - prev.y);
    }
    rawPoints.push({ x, y, t, arcDist: totalLength });
  }

  // 2. Sample at exact linkPitch intervals
  const linkCount = Math.max(2, Math.round(totalLength / linkPitch));
  const actualPitch = totalLength / linkCount;
  const result = [];

  let rawIdx = 0;
  for (let i = 0; i <= linkCount; i++) {
    const targetDist = i * actualPitch;
    while (rawIdx < rawPoints.length - 1 && rawPoints[rawIdx + 1].arcDist < targetDist) {
      rawIdx++;
    }

    const p0 = rawPoints[rawIdx];
    const p1 = rawPoints[Math.min(rawIdx + 1, rawPoints.length - 1)];
    const segmentLen = Math.max(0.0001, p1.arcDist - p0.arcDist);
    const frac = Math.max(0, Math.min(1, (targetDist - p0.arcDist) / segmentLen));

    const x = p0.x + (p1.x - p0.x) * frac;
    const y = p0.y + (p1.y - p0.y) * frac;
    const t = p0.t + (p1.t - p0.t) * frac;

    // Tangent angle along curve
    const dx = -rx * Math.sin(t);
    const dy = ry * Math.cos(t);
    const angle = Math.atan2(dy, dx);

    result.push({ x, y, angle, t, index: i, count: linkCount + 1 });
  }

  return result;
}

/**
 * Samples points along a cubic/quadratic bezier curve at exact equal arc-length increments
 */
export function sampleEquidistantBezier(p0, p1, p2, p3 = null, linkPitch = 7.5) {
  const SUBDIVS = 300;
  const rawPoints = [];
  let totalLength = 0;

  for (let i = 0; i <= SUBDIVS; i++) {
    const t = i / SUBDIVS;
    let x, y, dx, dy;

    if (p3) {
      // Cubic Bezier
      const mt = 1 - t;
      x = mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x;
      y = mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y;
      dx = 3*mt*mt*(p1.x - p0.x) + 6*mt*t*(p2.x - p1.x) + 3*t*t*(p3.x - p2.x);
      dy = 3*mt*mt*(p1.y - p0.y) + 6*mt*t*(p2.y - p1.y) + 3*t*t*(p3.y - p2.y);
    } else {
      // Quadratic Bezier
      const mt = 1 - t;
      x = mt*mt*p0.x + 2*mt*t*p1.x + t*t*p2.x;
      y = mt*mt*p0.y + 2*mt*t*p1.y + t*t*p2.y;
      dx = 2*mt*(p1.x - p0.x) + 2*t*(p2.x - p1.x);
      dy = 2*mt*(p1.y - p0.y) + 2*t*(p2.y - p1.y);
    }

    if (i > 0) {
      const prev = rawPoints[i - 1];
      totalLength += Math.hypot(x - prev.x, y - prev.y);
    }
    rawPoints.push({ x, y, dx, dy, arcDist: totalLength });
  }

  const linkCount = Math.max(2, Math.round(totalLength / linkPitch));
  const actualPitch = totalLength / linkCount;
  const result = [];

  let rawIdx = 0;
  for (let i = 0; i <= linkCount; i++) {
    const targetDist = i * actualPitch;
    while (rawIdx < rawPoints.length - 1 && rawPoints[rawIdx + 1].arcDist < targetDist) {
      rawIdx++;
    }

    const r0 = rawPoints[rawIdx];
    const r1 = rawPoints[Math.min(rawIdx + 1, rawPoints.length - 1)];
    const segmentLen = Math.max(0.0001, r1.arcDist - r0.arcDist);
    const frac = Math.max(0, Math.min(1, (targetDist - r0.arcDist) / segmentLen));

    const x = r0.x + (r1.x - r0.x) * frac;
    const y = r0.y + (r1.y - r0.y) * frac;
    const dx = r0.dx + (r1.dx - r0.dx) * frac;
    const dy = r0.dy + (r1.dy - r0.dy) * frac;
    const angle = Math.atan2(dy, dx);

    result.push({ x, y, angle, index: i, count: linkCount + 1 });
  }

  return result;
}

// Backward compatibility helpers
export function sampleEllipsePoints(cx, cy, rx, ry, startAngle, endAngle, stepCount) {
  const pitch = Math.max(4, ((rx + ry) * Math.abs(endAngle - startAngle)) / (stepCount || 100));
  return sampleEquidistantEllipse(cx, cy, rx, ry, startAngle, endAngle, pitch);
}

export function sampleBezierPoints(p0, p1, p2, stepCount) {
  const estLen = Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const pitch = Math.max(4, estLen / (stepCount || 30));
  return sampleEquidistantBezier(p0, p1, p2, null, pitch);
}

// ─── Complete Photorealistic Chain Curve ─────────────────────────────────────

export function drawPhotorealisticChain(ctx, sampledPoints, metalKey = "gold", styleKey = "cable") {
  if (!sampledPoints || sampledPoints.length < 2) return;

  const palette = getMetalPalette(metalKey);
  const style = CHAIN_STYLES[styleKey] || CHAIN_STYLES.cable;
  
  const width = (style.linkWidth || 4.2) * 0.8; // slightly slimmer for elegance

  // Create the main path
  ctx.beginPath();
  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }

  // 1. Drop shadow onto the studio background
  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = width + 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  ctx.stroke();
  ctx.restore();

  // 2. Base metallic thickness
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  // Calculate bounding box for gradient
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  sampledPoints.forEach(p => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  });
  
  // Diagonal gradient simulating global lighting across the whole chain
  const baseGrad = ctx.createLinearGradient(minX, minY, maxX, maxY);
  baseGrad.addColorStop(0, palette.highlight);
  baseGrad.addColorStop(0.3, palette.primary);
  baseGrad.addColorStop(0.7, palette.secondary);
  baseGrad.addColorStop(1, palette.shadow);
  
  ctx.strokeStyle = baseGrad;
  ctx.lineWidth = width;
  ctx.stroke();

  // 3. Central bright specular highlight to give it a cylindrical wire look
  ctx.beginPath();
  for (let i = 0; i < sampledPoints.length; i++) {
    const pt = sampledPoints[i];
    // Slightly offset the highlight towards the top-left
    if (i === 0) ctx.moveTo(pt.x - 0.5, pt.y - 0.5);
    else ctx.lineTo(pt.x - 0.5, pt.y - 0.5);
  }
  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = width * 0.35;
  ctx.stroke();
  
  // 4. If style is rope or cuban, add some rhythmic dashes or twists
  if (styleKey === 'rope' || styleKey === 'cuban' || styleKey === 'paperclip') {
    ctx.beginPath();
    for (let i = 0; i < sampledPoints.length; i++) {
      const pt = sampledPoints[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = palette.deepShadow;
    ctx.lineWidth = width * 0.8;
    
    if (styleKey === 'rope') ctx.setLineDash([1.5, 2]);
    else if (styleKey === 'cuban') ctx.setLineDash([2, 3]);
    else ctx.setLineDash([8, 2]);
    
    ctx.globalAlpha = 0.35;
    ctx.stroke();
  }
  
  ctx.restore();
}

// ─── Clasp & Fasteners ───────────────────────────────────────────────────────

export function drawLuxuryClaspAndEndCaps(ctx, startPt, endPt, metalKey = "gold") {
  const palette = getMetalPalette(metalKey);

  [startPt, endPt].forEach((pt, idx) => {
    ctx.save();
    ctx.translate(pt.x, pt.y);

    // End collar ring
    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    const ringGrad = ctx.createRadialGradient(-1.2, -1.2, 0.8, 0, 0, 4.8);
    ringGrad.addColorStop(0, palette.highlight);
    ringGrad.addColorStop(0.4, palette.primary);
    ringGrad.addColorStop(0.85, palette.secondary);
    ringGrad.addColorStop(1, palette.shadow);
    ctx.fillStyle = ringGrad;
    ctx.fill();
    ctx.strokeStyle = palette.deepShadow;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Eyelet hole
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fill();

    // Lobster claw clasp attached to start point
    if (idx === 0) {
      ctx.save();
      ctx.translate(-4.5, -5.5);
      ctx.rotate(-0.35);

      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 3.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = ringGrad;
      ctx.fill();
      ctx.strokeStyle = palette.deepShadow;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Lever detail
      ctx.beginPath();
      ctx.moveTo(-2, -3.5);
      ctx.lineTo(1.2, -5.2);
      ctx.strokeStyle = palette.highlight;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  });
}

// ─── Earring Studs ───────────────────────────────────────────────────────────

export function drawLuxuryEarringStud(ctx, cx, cy, metalKey = "gold") {
  const palette = getMetalPalette(metalKey);

  ctx.save();

  // Drop shadow
  ctx.beginPath();
  ctx.arc(cx + 2, cy - 88, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fill();

  // Polished metal stud sphere
  ctx.beginPath();
  ctx.arc(cx, cy - 90, 8, 0, Math.PI * 2);
  const studGrad = ctx.createRadialGradient(cx - 2.8, cy - 92.8, 1, cx, cy - 90, 8);
  studGrad.addColorStop(0, palette.highlight);
  studGrad.addColorStop(0.28, palette.specular);
  studGrad.addColorStop(0.68, palette.primary);
  studGrad.addColorStop(0.88, palette.secondary);
  studGrad.addColorStop(1, palette.deepShadow);
  ctx.fillStyle = studGrad;
  ctx.fill();

  // Specular hotspot
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 93, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fill();

  // Connector jump ring
  ctx.beginPath();
  ctx.arc(cx, cy - 78, 5, 0, Math.PI * 2);
  const ringGrad = ctx.createLinearGradient(cx - 5, cy - 83, cx + 5, cy - 73);
  ringGrad.addColorStop(0, palette.shadow);
  ringGrad.addColorStop(0.5, palette.highlight);
  ringGrad.addColorStop(1, palette.primary);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.restore();
}

// ─── Authentic Jewelry Bail / Charm Ring Connector ───────────────────────────

export function drawJumpRingAndBail(ctx, x, y, angle, metalKey = "gold", isBaseBead = false) {
  const palette = getMetalPalette(metalKey);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (isBaseBead) {
    // Subtle polished metallic ring collar threading through the bead center
    ctx.beginPath();
    ctx.ellipse(0, 0, 15.5, 3.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = palette.fresnel;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else {
    // Elegant polished gold bail loop connecting charm to necklace chain
    // Bail drop shadow
    ctx.beginPath();
    ctx.ellipse(0, -18, 4.5, 6.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Bail body
    ctx.beginPath();
    ctx.ellipse(0, -18, 4.0, 6.0, 0, 0, Math.PI * 2);
    const bailGrad = ctx.createLinearGradient(-4, -24, 4, -12);
    bailGrad.addColorStop(0.0, palette.shadow);
    bailGrad.addColorStop(0.28, palette.specular);
    bailGrad.addColorStop(0.55, palette.highlight);
    bailGrad.addColorStop(0.82, palette.primary);
    bailGrad.addColorStop(1.0, palette.deepShadow);
    ctx.strokeStyle = bailGrad;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Bail specular glint
    ctx.beginPath();
    ctx.arc(-2, -22, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = palette.highlight;
    ctx.fill();
  }

  ctx.restore();
}

// ─── Diamond / Gemstone Multi-Point Sparkle (Animated) ───────────────────────

// Global animation time — updated externally from render loop
let _globalAnimTime = 0;
export function setGlobalAnimTime(t) { _globalAnimTime = t; }
export function getGlobalAnimTime() { return _globalAnimTime; }

export function drawSparkle(ctx, x, y, size = 8, color = "#FFFFFF") {
  ctx.save();
  ctx.translate(x, y);

  // Animated pulse: size and opacity breathe with time
  const pulse = 0.7 + 0.3 * Math.sin(_globalAnimTime * 3.2 + x * 0.1 + y * 0.07);
  const alphaPulse = 0.6 + 0.4 * Math.sin(_globalAnimTime * 2.5 + x * 0.15);
  const animSize = size * pulse;

  ctx.globalAlpha = alphaPulse;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 + 4 * pulse;

  // Slowly rotating 4-point star
  const rot = _globalAnimTime * 0.4 + x * 0.02;
  ctx.rotate(rot);

  // 4-point star
  ctx.beginPath();
  ctx.moveTo(0, -animSize);
  ctx.quadraticCurveTo(animSize * 0.12, -animSize * 0.12, animSize, 0);
  ctx.quadraticCurveTo(animSize * 0.12, animSize * 0.12, 0, animSize);
  ctx.quadraticCurveTo(-animSize * 0.12, animSize * 0.12, -animSize, 0);
  ctx.quadraticCurveTo(-animSize * 0.12, -animSize * 0.12, 0, -animSize);
  ctx.fill();

  // Core brilliant center
  ctx.beginPath();
  ctx.arc(0, 0, animSize * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.globalAlpha = 1.0;
  ctx.fill();

  ctx.restore();
}

// ─── Thin Gold Chain Links Between Segments ──────────────────────────────────
/**
 * Draws 2–3 tiny articulated gold chain links between two points
 * (e.g. between the hook eyelet and the first stone collet)
 */
export function drawChainLinksBetween(ctx, x1, y1, x2, y2, metalKey = "gold") {
  const palette = getMetalPalette(metalKey);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);

  if (dist < 6) return; // too close, skip

  const linkCount = Math.max(2, Math.min(3, Math.round(dist / 8)));
  const angle = Math.atan2(dy, dx);

  ctx.save();

  for (let i = 1; i <= linkCount; i++) {
    const t = i / (linkCount + 1);
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    const linkSize = 2.8;

    // Alternate link orientation for interlocking effect
    const linkAngle = angle + (i % 2 === 0 ? 0.3 : -0.3);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(linkAngle);

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0.8, 1.0, linkSize * 0.8, linkSize * 0.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Link body
    ctx.beginPath();
    ctx.ellipse(0, 0, linkSize * 0.8, linkSize * 0.5, 0, 0, Math.PI * 2);
    const lg = ctx.createLinearGradient(-linkSize, -linkSize, linkSize, linkSize);
    lg.addColorStop(0, palette.highlight);
    lg.addColorStop(0.4, palette.primary);
    lg.addColorStop(0.8, palette.secondary);
    lg.addColorStop(1, palette.deepShadow);
    ctx.strokeStyle = lg;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Tiny specular glint
    ctx.beginPath();
    ctx.arc(-linkSize * 0.3, -linkSize * 0.2, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = palette.highlight;
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

// ─── Motion Blur Trail ───────────────────────────────────────────────────────
/**
 * Draw a subtle alpha trail behind a fast-moving pearl
 * velocity: pixel displacement per frame
 */
export function drawMotionBlur(ctx, x, y, angle, velocity, width, height) {
  if (velocity < 3) return; // only show at noticeable speeds

  const intensity = Math.min(0.35, velocity * 0.02);
  const trailLen = Math.min(20, velocity * 1.5);
  const hw = (width || 20) / 2;
  const hh = (height || 20) / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Trail gradient in the opposite direction of movement
  const grad = ctx.createLinearGradient(0, -trailLen, 0, trailLen * 0.5);
  grad.addColorStop(0, `rgba(255, 250, 240, ${intensity})`);
  grad.addColorStop(0.5, `rgba(255, 245, 220, ${intensity * 0.5})`);
  grad.addColorStop(1, `rgba(255, 240, 200, 0)`);

  ctx.beginPath();
  ctx.ellipse(0, -trailLen * 0.3, hw * 0.7, trailLen * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

// ─── Rim Light / Fresnel Edge Glow ───────────────────────────────────────────
/**
 * Soft colored rim glow (disabled per user preference to keep pearl silhouettes crisp)
 */
export function drawRimGlow(ctx, x, y, angle, radius, metalKey = "gold") {
  // Disabled: removed diffuse halo rings around pearls
}

// ─── Drag Aura (Radial Glow Around Active Pearl) ─────────────────────────────
export function drawDragAura(ctx, x, y, radius = 30) {
  const pulse = 0.6 + 0.4 * Math.sin(_globalAnimTime * 4);
  ctx.save();

  const auraGrad = ctx.createRadialGradient(x, y, radius * 0.4, x, y, radius * 1.8);
  auraGrad.addColorStop(0, `rgba(255, 215, 80, ${0.25 * pulse})`);
  auraGrad.addColorStop(0.4, `rgba(255, 200, 60, ${0.15 * pulse})`);
  auraGrad.addColorStop(0.7, `rgba(255, 180, 40, ${0.05 * pulse})`);
  auraGrad.addColorStop(1, "rgba(255, 180, 40, 0)");

  ctx.beginPath();
  ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = auraGrad;
  ctx.fill();

  ctx.restore();
}

// ─── Hover Glow Ring ─────────────────────────────────────────────────────────
export function drawHoverGlow(ctx, x, y, radius = 25) {
  ctx.save();

  const pulse = 0.5 + 0.5 * Math.sin(_globalAnimTime * 3);
  ctx.beginPath();
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 215, 80, ${0.3 * pulse})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(255, 215, 80, 0.4)";
  ctx.shadowBlur = 8;
  ctx.stroke();

  ctx.restore();
}

// ─── Particle Burst Renderer ─────────────────────────────────────────────────
export function drawParticleBursts(ctx, bursts = []) {
  if (!bursts || bursts.length === 0) return;

  ctx.save();
  for (const burst of bursts) {
    for (const p of burst.particles) {
      if (p.life <= 0) continue;

      const alpha = Math.max(0, p.life) * 0.9;
      const s = p.size * Math.max(0.3, p.life);

      // Sparkle star shape
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(_globalAnimTime * 5 + p.x);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 6;

      // Small 4-point star
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.15, -s * 0.15, s, 0);
      ctx.quadraticCurveTo(s * 0.15, s * 0.15, 0, s);
      ctx.quadraticCurveTo(-s * 0.15, s * 0.15, -s, 0);
      ctx.quadraticCurveTo(-s * 0.15, -s * 0.15, 0, -s);
      ctx.fill();

      // White core
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      ctx.restore();
    }
  }
  ctx.restore();
}

// ─── Legacy / Fallback Backdrop (Only used if WebGL is unavailable) ───────────

export function drawLuxuryBackdrop(ctx, width, height, backdropKey = "velvet-emerald", layoutType = "necklace-curve") {
  const backdrop = BACKDROPS[backdropKey] || BACKDROPS["velvet-emerald"];

  ctx.save();

  // 1. Base Gradient
  const cx = width / 2;
  const cy = height * 0.42;
  const radius = Math.max(width, height) * 0.75;

  const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, radius);

  if (backdropKey === "velvet-emerald") {
    bgGrad.addColorStop(0, "#194a3a");
    bgGrad.addColorStop(0.35, "#103529");
    bgGrad.addColorStop(0.7, "#09221a");
    bgGrad.addColorStop(1, "#04110d");
  } else if (backdropKey === "velvet-charcoal") {
    bgGrad.addColorStop(0, "#2c323b");
    bgGrad.addColorStop(0.4, "#1c2026");
    bgGrad.addColorStop(0.75, "#121519");
    bgGrad.addColorStop(1, "#090a0d");
  } else if (backdropKey === "atelier-champagne") {
    bgGrad.addColorStop(0, "#fffbf3");
    bgGrad.addColorStop(0.45, "#ede5d8");
    bgGrad.addColorStop(0.8, "#d8cbba");
    bgGrad.addColorStop(1, "#bfaa96");
  } else {
    // studio-white
    bgGrad.addColorStop(0, "#ffffff");
    bgGrad.addColorStop(0.6, "#f4f6f9");
    bgGrad.addColorStop(1, "#dde2e8");
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Elegant Atelier Stand / Bust Silhouette
  if (layoutType === "necklace-curve") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(170, 0);
    // Smooth elegant neck and chest drape
    ctx.bezierCurveTo(155, 60, 135, 120, 105, 180);
    ctx.bezierCurveTo(75, 240, 45, 310, 60, 390);
    ctx.bezierCurveTo(80, 440, 160, 475, cx, 475);
    ctx.bezierCurveTo(width - 160, 475, width - 80, 440, width - 60, 390);
    ctx.bezierCurveTo(width - 45, 310, width - 75, 240, width - 105, 180);
    ctx.bezierCurveTo(width - 135, 120, width - 155, 60, width - 170, 0);
    ctx.closePath();

    const isLightBg = backdropKey === "atelier-champagne" || backdropKey === "studio-white";
    const bustGrad = ctx.createLinearGradient(cx, 0, cx, 480);
    if (isLightBg) {
      bustGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
      bustGrad.addColorStop(0.4, "rgba(235, 225, 215, 0.12)");
      bustGrad.addColorStop(1, "rgba(190, 180, 170, 0.22)");
    } else {
      bustGrad.addColorStop(0, "rgba(255, 255, 255, 0.05)");
      bustGrad.addColorStop(0.35, "rgba(255, 255, 255, 0.02)");
      bustGrad.addColorStop(0.8, "rgba(0, 0, 0, 0.1)");
      bustGrad.addColorStop(1, "rgba(0, 0, 0, 0.25)");
    }
    ctx.fillStyle = bustGrad;
    ctx.fill();

    ctx.strokeStyle = isLightBg ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, 35, 70, 20, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = isLightBg ? "rgba(180, 150, 90, 0.1)" : "rgba(212, 175, 55, 0.07)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 3. Subtle Luxury Studio Vignette Overlay
  const vignette = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

// ─── Photorealistic Articulated Drop Earring Renderers ────────────────────────

/**
 * 1. Authentic 18k Solid Gold French Ear Wire (Shepherd's Hook)
 * Beautiful continuous flowing curved ear wire dropping seamlessly into the suspension eyelet.
 */
export function drawFrenchEarHook(ctx, x, y, angle = 0, metalKey = "gold") {
  const palette = getMetalPalette(metalKey);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // A. Drop shadow onto backdrop
  ctx.save();
  ctx.beginPath();
  // Back post curve
  ctx.moveTo(-11, 4);
  ctx.bezierCurveTo(-15, -4, -16, -20, -14, -28);
  // Top crest over earlobe
  ctx.bezierCurveTo(-12, -38, -4, -40, 0, -32);
  // Front wire dropping directly into the eyelet top
  ctx.bezierCurveTo(2, -26, 0.5, -12, 0, -4);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.38)";
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.stroke();
  ctx.restore();

  // B. Main Solid Gold Shepherd's Ear Wire (Continuous flowing curve)
  ctx.beginPath();
  // Back tip with subtle outward flare
  ctx.moveTo(-11, 4);
  ctx.bezierCurveTo(-14, -2, -15, -18, -14, -28);
  // Top curve over earlobe
  ctx.bezierCurveTo(-12, -38, -4, -40, 0, -32);
  // Front wire dropping vertically directly into the eyelet collar
  ctx.bezierCurveTo(2, -26, 0.5, -12, 0, -4);

  const wireGrad = ctx.createLinearGradient(-15, -40, 4, 0);
  wireGrad.addColorStop(0, palette.secondary);
  wireGrad.addColorStop(0.2, palette.primary);
  wireGrad.addColorStop(0.5, palette.highlight);
  wireGrad.addColorStop(0.8, palette.primary);
  wireGrad.addColorStop(1, palette.shadow);

  ctx.strokeStyle = wireGrad;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.stroke();

  // C. Specular bright glint on the top ear wire bend
  ctx.beginPath();
  ctx.arc(-2, -35, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // D. Decorative Gold Collar Bead just above the loop
  ctx.beginPath();
  ctx.arc(0, -3.8, 2.2, 0, Math.PI * 2);
  const beadGrad = ctx.createRadialGradient(-0.6, -4.4, 0.3, 0, -3.8, 2.2);
  beadGrad.addColorStop(0, palette.highlight);
  beadGrad.addColorStop(0.5, palette.primary);
  beadGrad.addColorStop(1, palette.deepShadow);
  ctx.fillStyle = beadGrad;
  ctx.fill();

  // E. Closed Bottom Connection Eyelet Loop at (0, 0)
  ctx.beginPath();
  ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
  const eyeletGrad = ctx.createLinearGradient(-3.8, -3.8, 3.8, 3.8);
  eyeletGrad.addColorStop(0, palette.highlight);
  eyeletGrad.addColorStop(0.4, palette.primary);
  eyeletGrad.addColorStop(0.8, palette.secondary);
  eyeletGrad.addColorStop(1, palette.deepShadow);
  ctx.strokeStyle = eyeletGrad;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Clean inner hole shadow
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.fill();

  ctx.restore();
}

/**
 * 1B. Authentic 18k Solid Gold Ear Post / Stud with Butterfly Clutch & Suspension Loop
 * Renders a polished domed ball stud sitting flush against the earlobe, with post shadow
 * and an integrated cast suspension eyelet at (0, 0).
 */
export function drawEarPost(ctx, x, y, angle = 0, metalKey = "gold") {
  const palette = getMetalPalette(metalKey);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // A. Soft contact shadow under the stud and post on the lobe
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(3, -4, 7.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.restore();

  // B. Butterfly Clutch Hint (depth indicator behind lobe, subtly visible to the upper-left)
  ctx.beginPath();
  ctx.ellipse(-5.5, -9, 3.5, 5, -0.4, 0, Math.PI * 2);
  const clutchGrad = ctx.createLinearGradient(-8, -13, -3, -5);
  clutchGrad.addColorStop(0, palette.secondary);
  clutchGrad.addColorStop(0.5, palette.shadow);
  clutchGrad.addColorStop(1, palette.deepShadow);
  ctx.fillStyle = clutchGrad;
  ctx.fill();

  // Post pin notch
  ctx.beginPath();
  ctx.rect(-3.5, -7.5, 3.5, 1.6);
  ctx.fillStyle = palette.shadow;
  ctx.fill();

  // C. Closed Bottom Connection Eyelet Loop at (0, 0)
  ctx.beginPath();
  ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
  const eyeletGrad = ctx.createLinearGradient(-3.8, -3.8, 3.8, 3.8);
  eyeletGrad.addColorStop(0, palette.highlight);
  eyeletGrad.addColorStop(0.4, palette.primary);
  eyeletGrad.addColorStop(0.8, palette.secondary);
  eyeletGrad.addColorStop(1, palette.deepShadow);
  ctx.strokeStyle = eyeletGrad;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Clean inner hole shadow
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.fill();

  // D. Main Polished Gold Dome Stud (Centered at y = -6.5, sitting on the lobe)
  const studRadius = 6.2;
  const studY = -6.5;

  // Bevel collar ring under the dome stud
  ctx.beginPath();
  ctx.arc(0, studY, studRadius + 1.0, 0, Math.PI * 2);
  const baseGrad = ctx.createLinearGradient(-studRadius, studY - studRadius, studRadius, studY + studRadius);
  baseGrad.addColorStop(0, palette.highlight);
  baseGrad.addColorStop(0.3, palette.primary);
  baseGrad.addColorStop(0.7, palette.secondary);
  baseGrad.addColorStop(1, palette.deepShadow);
  ctx.fillStyle = baseGrad;
  ctx.fill();

  // Polished Domed Sphere
  ctx.beginPath();
  ctx.arc(0, studY, studRadius, 0, Math.PI * 2);
  const domeGrad = ctx.createRadialGradient(-studRadius * 0.35, studY - studRadius * 0.35, 0.5, 0, studY, studRadius);
  domeGrad.addColorStop(0, "#FFFFFF");
  domeGrad.addColorStop(0.2, palette.highlight);
  domeGrad.addColorStop(0.55, palette.primary);
  domeGrad.addColorStop(0.85, palette.secondary);
  domeGrad.addColorStop(1, palette.deepShadow);
  ctx.fillStyle = domeGrad;
  ctx.fill();

  // Specular Diamond Glint / Light Flash on Stud
  ctx.beginPath();
  ctx.arc(-studRadius * 0.32, studY - studRadius * 0.32, 1.3, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Subtle star sparkle
  drawSparkle(ctx, -studRadius * 0.32, studY - studRadius * 0.32, 4.5, "#FFFFFF");

  ctx.restore();
}

/**
 * 1C. Authentic 18k Solid Gold Kidney / Leverback Ear Wire
 * Renders an arched safety ear wire looping up through the earlobe piercing and curving down
 * into a rear safety latch, dropping into an integrated connection eyelet at (0, 0).
 */
export function drawEarWire(ctx, x, y, angle = 0, metalKey = "gold") {
  const palette = getMetalPalette(metalKey);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // A. Drop shadow onto backdrop
  ctx.save();
  ctx.beginPath();
  // Rear safety wire latch contour
  ctx.moveTo(-6, 4);
  ctx.bezierCurveTo(-14, 2, -18, -12, -16, -24);
  ctx.bezierCurveTo(-15, -36, -8, -44, 0, -36);
  ctx.bezierCurveTo(2, -30, 0.5, -14, 0, -4);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.38)";
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.stroke();
  ctx.restore();

  // B. Rear Safety Contour (The kidney loop extending down behind the lobe)
  ctx.beginPath();
  // Bottom safety latch hook catch
  ctx.moveTo(-4, 3);
  ctx.bezierCurveTo(-10, 4.5, -16, 0, -17, -12);
  ctx.bezierCurveTo(-18, -26, -14, -38, -5, -42);
  // Apex curve over earlobe
  ctx.bezierCurveTo(-1, -44, 1, -40, 1, -34);
  // Front vertical wire dropping into eyelet
  ctx.bezierCurveTo(1.5, -26, 0.5, -12, 0, -4);

  const wireGrad = ctx.createLinearGradient(-18, -44, 2, 0);
  wireGrad.addColorStop(0, palette.secondary);
  wireGrad.addColorStop(0.2, palette.primary);
  wireGrad.addColorStop(0.5, palette.highlight);
  wireGrad.addColorStop(0.75, palette.primary);
  wireGrad.addColorStop(1, palette.shadow);

  ctx.strokeStyle = wireGrad;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.stroke();

  // C. Front Safety Catch Latch Notch
  ctx.beginPath();
  ctx.arc(-4, 3, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = palette.primary;
  ctx.fill();

  // D. Specular apex highlight on top arch
  ctx.beginPath();
  ctx.arc(-2, -40, 1.3, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // E. Front Decorative Collar Bead just above the loop
  ctx.beginPath();
  ctx.arc(0, -3.8, 2.2, 0, Math.PI * 2);
  const beadGrad = ctx.createRadialGradient(-0.6, -4.4, 0.3, 0, -3.8, 2.2);
  beadGrad.addColorStop(0, palette.highlight);
  beadGrad.addColorStop(0.5, palette.primary);
  beadGrad.addColorStop(1, palette.deepShadow);
  ctx.fillStyle = beadGrad;
  ctx.fill();

  // F. Closed Bottom Connection Eyelet Loop at (0, 0)
  ctx.beginPath();
  ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
  const eyeletGrad = ctx.createLinearGradient(-3.8, -3.8, 3.8, 3.8);
  eyeletGrad.addColorStop(0, palette.highlight);
  eyeletGrad.addColorStop(0.4, palette.primary);
  eyeletGrad.addColorStop(0.8, palette.secondary);
  eyeletGrad.addColorStop(1, palette.deepShadow);
  ctx.strokeStyle = eyeletGrad;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Clean inner hole shadow
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.fill();

  ctx.restore();
}

/**
 * 2. Interlocking Circular Gold Jump Ring
 * Connects two segment eyelets cleanly at (x1, y1) and (x2, y2)
 */
export function drawArticulatedJumpRing(ctx, x1, y1, x2OrAngle = 0, y2OrMetal = "gold", fallbackMetal = "gold") {
  let midX, midY, angle, metalKey;
  if (typeof y2OrMetal === "number") {
    // Legacy 5-arg signature: (ctx, x1, y1, x2, y2, metalKey)
    midX = (x1 + x2OrAngle) / 2;
    midY = (y1 + y2OrMetal) / 2;
    angle = Math.atan2(y2OrMetal - y1, x2OrAngle - x1);
    metalKey = fallbackMetal;
  } else {
    // Exact center signature: (ctx, centerX, centerY, angle, metalKey)
    midX = x1;
    midY = y1;
    angle = x2OrAngle || 0;
    metalKey = y2OrMetal || fallbackMetal || "gold";
  }

  const palette = getMetalPalette(metalKey);
  const ringRadius = 3.6;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  // Cast shadow
  ctx.beginPath();
  ctx.arc(1.5, 2.0, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.38)";
  ctx.lineWidth = 2.0;
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1.5;
  ctx.shadowOffsetY = 2.0;
  ctx.stroke();

  // Jump ring circular body
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  const ringGrad = ctx.createLinearGradient(-ringRadius, -ringRadius, ringRadius, ringRadius);
  ringGrad.addColorStop(0, palette.deepShadow);
  ringGrad.addColorStop(0.25, palette.secondary);
  ringGrad.addColorStop(0.5, palette.highlight);
  ringGrad.addColorStop(0.75, palette.primary);
  ringGrad.addColorStop(1, palette.shadow);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 1.9;
  ctx.stroke();

  // Inner hole shadow
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fill();

  // Specular hotspot on ring
  ctx.beginPath();
  ctx.arc(-ringRadius * 0.45, -ringRadius * 0.45, 0.8, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  ctx.restore();
}

/**
 * 3. 4-Prong Set Larimar Cabochon Collet
 * Top eyelet always drawn. Bottom eyelet ONLY drawn if !isLast.
 */
export function drawProngLarimarCabochon(ctx, x, y, angle = 0, size = 26, metalKey = "gold", isLast = false) {
  const palette = getMetalPalette(metalKey);
  const r = size / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // A. Contact drop shadow
  ctx.beginPath();
  ctx.arc(3, 4, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fill();

  // B. Single Cast Gold Hinge Ring at bottom (ONLY present if another segment is attached below it!)
  if (!isLast) {
    const ey = r + 2.2;
    ctx.beginPath();
    ctx.arc(0, ey, 3.6, 0, Math.PI * 2);
    const eg = ctx.createLinearGradient(-3.6, ey - 3.6, 3.6, ey + 3.6);
    eg.addColorStop(0, palette.highlight);
    eg.addColorStop(0.35, palette.primary);
    eg.addColorStop(0.7, palette.secondary);
    eg.addColorStop(1, palette.deepShadow);
    ctx.strokeStyle = eg;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Clean inner hole shadow
    ctx.beginPath();
    ctx.arc(0, ey, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.fill();
  }

  // C. Gold Basket / Collet Bezel Base
  ctx.beginPath();
  ctx.arc(0, 0, r + 1.2, 0, Math.PI * 2);
  const bezelGrad = ctx.createLinearGradient(-r, -r, r, r);
  bezelGrad.addColorStop(0, palette.highlight);
  bezelGrad.addColorStop(0.3, palette.primary);
  bezelGrad.addColorStop(0.7, palette.secondary);
  bezelGrad.addColorStop(1, palette.deepShadow);
  ctx.fillStyle = bezelGrad;
  ctx.fill();

  // D. Larimar Stone Cabochon Body
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Base oceanic turquoise gradient
  const stoneGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r * 1.1);
  stoneGrad.addColorStop(0, "#C4F4F9");
  stoneGrad.addColorStop(0.28, "#83DDEC");
  stoneGrad.addColorStop(0.65, "#4CA8BA");
  stoneGrad.addColorStop(0.9, "#2C6D7E");
  stoneGrad.addColorStop(1, "#184552");
  ctx.fillStyle = stoneGrad;
  ctx.fill();

  // Authentic cloudy white nacre marbling veins
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.1);
  ctx.bezierCurveTo(-r * 0.2, -r * 0.4, r * 0.1, -r * 0.05, r * 0.6, -r * 0.35);
  ctx.bezierCurveTo(r * 0.4, r * 0.2, -r * 0.1, r * 0.1, -r * 0.5, r * 0.4);
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
  ctx.shadowBlur = 4;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(r * 0.25, r * 0.2, r * 0.4, r * 0.25, 0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fill();

  // Cabochon domed specular highlight (angle-reactive: shifts with pearl swing)
  const highlightShift = Math.sin(angle) * r * 0.4; // highlight slides opposite to swing
  const hlX = -r * 0.35 + highlightShift;
  const hlY = -r * 0.4;
  const domeHighlight = ctx.createRadialGradient(hlX, hlY, 0.5, hlX, hlY, r * 0.6);
  domeHighlight.addColorStop(0, "rgba(255, 255, 255, 0.85)");
  domeHighlight.addColorStop(0.45, "rgba(255, 255, 255, 0.25)");
  domeHighlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = domeHighlight;
  ctx.fill();

  ctx.restore();

  // E. 4 Rounded Gold Prongs clamping the stone (at 45°, 135°, 225°, 315°)
  const prongAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  prongAngles.forEach((pAngle) => {
    const px = Math.cos(pAngle) * (r - 0.5);
    const py = Math.sin(pAngle) * (r - 0.5);

    // Prong shadow
    ctx.beginPath();
    ctx.arc(px + 0.8, py + 1.0, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();

    // Prong bead
    ctx.beginPath();
    ctx.arc(px, py, 2.0, 0, Math.PI * 2);
    const pg = ctx.createRadialGradient(px - 0.6, py - 0.6, 0.3, px, py, 2.2);
    pg.addColorStop(0, palette.highlight);
    pg.addColorStop(0.5, palette.primary);
    pg.addColorStop(1, palette.deepShadow);
    ctx.fillStyle = pg;
    ctx.fill();
  });

  // F. Micro-glint
  drawSparkle(ctx, -r * 0.35, -r * 0.4, 5, "#FFFFFF");

  ctx.restore();
}

/**
 * 4. Prong-Set Elongated Organic Keshi Pearl
 * Top eyelet always drawn. Bottom eyelet ONLY drawn if !isLast.
 */
export function drawProngKeshiPearl(ctx, x, y, angle = 0, width = 22, height = 38, metalKey = "gold", isLast = false) {
  const palette = getMetalPalette(metalKey);
  const hw = width / 2;
  const hh = height / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // A. Contact drop shadow
  ctx.beginPath();
  ctx.ellipse(3, 4, hw + 2, hh + 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fill();

  // B. Single Cast Gold Hinge Ring at bottom (ONLY if another tier is attached below!)
  if (!isLast) {
    const ey = hh + 2.2;
    ctx.beginPath();
    ctx.arc(0, ey, 3.6, 0, Math.PI * 2);
    const eg = ctx.createLinearGradient(-3.6, ey - 3.6, 3.6, ey + 3.6);
    eg.addColorStop(0, palette.highlight);
    eg.addColorStop(0.35, palette.primary);
    eg.addColorStop(0.7, palette.secondary);
    eg.addColorStop(1, palette.deepShadow);
    ctx.strokeStyle = eg;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, ey, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.fill();
  }

  // C. Gold back-chassis bar
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo(0, hh);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 3.0;
  ctx.stroke();

  // D. Organic Pearl Body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.bezierCurveTo(hw * 1.15, -hh * 0.6, hw * 1.25, -hh * 0.1, hw * 0.85, hh * 0.4);
  ctx.bezierCurveTo(hw * 0.6, hh * 0.85, hw * 0.2, hh, 0, hh);
  ctx.bezierCurveTo(-hw * 0.3, hh, -hw * 0.95, hh * 0.7, -hw * 1.1, hh * 0.2);
  ctx.bezierCurveTo(-hw * 1.25, -hh * 0.3, -hw * 0.9, -hh * 0.75, 0, -hh);
  ctx.closePath();
  ctx.clip();

  // Luminous pearl nacre gradient
  const pearlGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  pearlGrad.addColorStop(0, "#FFFFFF");
  pearlGrad.addColorStop(0.2, "#FDFCF7");
  pearlGrad.addColorStop(0.45, "#F7F2E7");
  pearlGrad.addColorStop(0.7, "#EAE2D2");
  pearlGrad.addColorStop(0.9, "#D8CDBC");
  pearlGrad.addColorStop(1, "#BFB09D");
  ctx.fillStyle = pearlGrad;
  ctx.fill();

  // Subtle iridescent blush / peacock overtone (angle-reactive)
  const keshiShift = Math.sin(angle) * hw * 0.3;
  const nacreOvertone = ctx.createRadialGradient(-hw * 0.2 + keshiShift, -hh * 0.3, 2, 0, 0, hh);
  nacreOvertone.addColorStop(0, "rgba(255, 255, 255, 0.8)");
  nacreOvertone.addColorStop(0.35, "rgba(255, 235, 240, 0.4)");
  nacreOvertone.addColorStop(0.65, "rgba(230, 245, 250, 0.3)");
  nacreOvertone.addColorStop(1, "rgba(215, 200, 185, 0)");
  ctx.fillStyle = nacreOvertone;
  ctx.fill();

  // Satiny pearl highlight sheen line (angle-reactive shift)
  ctx.beginPath();
  ctx.moveTo(-hw * 0.15 + keshiShift, -hh * 0.7);
  ctx.bezierCurveTo(-hw * 0.3 + keshiShift, -hh * 0.2, -hw * 0.2 + keshiShift, hh * 0.2, -hw * 0.05 + keshiShift, hh * 0.6);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.restore();

  // E. Gold Side-Prongs grasping the pearl (3 along left, 3 along right)
  const prongPositions = [
    { x: -hw * 0.95, y: -hh * 0.5 },
    { x: -hw * 1.1, y: 0 },
    { x: -hw * 0.85, y: hh * 0.5 },
    { x: hw * 1.0, y: -hh * 0.5 },
    { x: hw * 1.05, y: 0 },
    { x: hw * 0.75, y: hh * 0.5 },
  ];

  prongPositions.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x + 0.8, p.y + 0.8, 2.0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
    const pg = ctx.createRadialGradient(p.x - 0.5, p.y - 0.5, 0.2, p.x, p.y, 2.0);
    pg.addColorStop(0, palette.highlight);
    pg.addColorStop(0.5, palette.primary);
    pg.addColorStop(1, palette.deepShadow);
    ctx.fillStyle = pg;
    ctx.fill();
  });

  drawSparkle(ctx, -hw * 0.2, -hh * 0.45, 5, "#FFFFFF");

  ctx.restore();
}

/**
 * 5. Giant Centerpiece Baroque Coin Pearl in Multi-Prong Gold Frame
 * Top eyelet always drawn. Bottom eyelet ONLY drawn if !isLast.
 */
export function drawProngBaroqueCoinPearl(ctx, x, y, angle = 0, width = 48, height = 52, metalKey = "gold", isLast = false) {
  const palette = getMetalPalette(metalKey);
  const hw = width / 2;
  const hh = height / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // A. Heavy contact drop shadow (dense center mass)
  ctx.beginPath();
  ctx.ellipse(4, 6, hw + 3, hh + 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;
  ctx.fill();

  // B. Single Heavy Cast Hinge Ring at bottom (ONLY if another tier is chained below it!)
  if (!isLast) {
    const ey = hh + 2.5;
    ctx.beginPath();
    ctx.arc(0, ey, 3.8, 0, Math.PI * 2);
    const eg = ctx.createLinearGradient(-3.8, ey - 3.8, 3.8, ey + 3.8);
    eg.addColorStop(0, palette.highlight);
    eg.addColorStop(0.35, palette.primary);
    eg.addColorStop(0.7, palette.secondary);
    eg.addColorStop(1, palette.deepShadow);
    ctx.strokeStyle = eg;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, ey, 1.9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();
  }

  // C. Gold Bezel Frame Rim around the Coin Pearl
  ctx.beginPath();
  ctx.moveTo(0, -hh - 1);
  ctx.bezierCurveTo(hw * 0.7, -hh * 1.05, hw * 1.15, -hh * 0.5, hw * 1.1, 0);
  ctx.bezierCurveTo(hw * 1.05, hh * 0.5, hw * 0.75, hh * 1.05, 0, hh + 1);
  ctx.bezierCurveTo(-hw * 0.75, hh * 1.08, -hw * 1.15, hh * 0.5, -hw * 1.1, 0);
  ctx.bezierCurveTo(-hw * 1.05, -hh * 0.5, -hw * 0.65, -hh * 1.02, 0, -hh - 1);
  ctx.closePath();

  const bezelGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  bezelGrad.addColorStop(0, palette.highlight);
  bezelGrad.addColorStop(0.25, palette.primary);
  bezelGrad.addColorStop(0.7, palette.secondary);
  bezelGrad.addColorStop(1, palette.deepShadow);
  ctx.strokeStyle = bezelGrad;
  ctx.lineWidth = 3.0;
  ctx.stroke();

  // D. Baroque Coin Pearl Body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.bezierCurveTo(hw * 0.65, -hh * 0.95, hw * 1.05, -hh * 0.45, hw * 1.0, 0);
  ctx.bezierCurveTo(hw * 0.95, hh * 0.45, hw * 0.7, hh * 0.95, 0, hh);
  ctx.bezierCurveTo(-hw * 0.7, hh * 0.98, -hw * 1.05, hh * 0.45, -hw * 1.0, 0);
  ctx.bezierCurveTo(-hw * 0.95, -hh * 0.45, -hw * 0.6, -hh * 0.92, 0, -hh);
  ctx.closePath();
  ctx.clip();

  // Multilayer nacre luster
  const baseNacre = ctx.createRadialGradient(-hw * 0.25, -hh * 0.3, 4, 0, 0, hh * 1.1);
  baseNacre.addColorStop(0, "#FFFFFF");
  baseNacre.addColorStop(0.25, "#FAF8F2");
  baseNacre.addColorStop(0.55, "#F0ECE0");
  baseNacre.addColorStop(0.8, "#DFD8C7");
  baseNacre.addColorStop(0.95, "#C8BEAB");
  baseNacre.addColorStop(1, "#A69984");
  ctx.fillStyle = baseNacre;
  ctx.fill();

  // Natural organic surface folds
  ctx.beginPath();
  ctx.moveTo(-hw * 0.5, -hh * 0.3);
  ctx.bezierCurveTo(-hw * 0.1, -hh * 0.5, hw * 0.3, -hh * 0.2, hw * 0.6, -hh * 0.4);
  ctx.bezierCurveTo(hw * 0.4, hh * 0.1, -hw * 0.2, hh * 0.2, -hw * 0.45, hh * 0.4);
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
  ctx.shadowBlur = 6;
  ctx.fill();

  // Soft iridescent pink/champagne shimmer halo (angle-reactive)
  const baroqueShift = Math.sin(angle) * hw * 0.35;
  const sheenHalo = ctx.createRadialGradient(-hw * 0.2 + baroqueShift, -hh * 0.25, 0, 0, 0, hw);
  sheenHalo.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  sheenHalo.addColorStop(0.35, "rgba(255, 240, 245, 0.5)");
  sheenHalo.addColorStop(0.7, "rgba(240, 248, 255, 0.25)");
  sheenHalo.addColorStop(1, "rgba(200, 190, 175, 0)");
  ctx.fillStyle = sheenHalo;
  ctx.fill();

  // Specular gleam across the organic dome (angle-reactive shift)
  ctx.beginPath();
  ctx.ellipse(-hw * 0.25 + baroqueShift, -hh * 0.32, hw * 0.38, hh * 0.24, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fill();

  ctx.restore();

  // E. 8 Gold Prongs grasping the Coin Pearl perimeter (exact reference style)
  const prongPositions = [
    { x: -hw * 0.45, y: -hh * 0.9 },
    { x: hw * 0.45, y: -hh * 0.9 },
    { x: hw * 0.98, y: -hh * 0.4 },
    { x: hw * 0.95, y: hh * 0.4 },
    { x: hw * 0.45, y: hh * 0.9 },
    { x: -hw * 0.45, y: hh * 0.9 },
    { x: -hw * 0.98, y: hh * 0.4 },
    { x: -hw * 0.98, y: -hh * 0.4 }
  ];

  prongPositions.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x + 1.0, p.y + 1.2, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    const pg = ctx.createRadialGradient(p.x - 0.7, p.y - 0.7, 0.3, p.x, p.y, 2.4);
    pg.addColorStop(0, palette.highlight);
    pg.addColorStop(0.4, palette.primary);
    pg.addColorStop(0.8, palette.secondary);
    pg.addColorStop(1, palette.deepShadow);
    ctx.fillStyle = pg;
    ctx.fill();
  });

  drawSparkle(ctx, -hw * 0.25, -hh * 0.32, 7, "#FFFFFF");
  drawSparkle(ctx, hw * 0.3, hh * 0.15, 4, "#FFF8E0");

  ctx.restore();
}

/**
 * 6. Customizable Cascade Tier Element
 * Sets any attached component in a luxury gold collet cup.
 * Top eyelet always drawn. Bottom eyelet ONLY drawn if !isLast.
 */
export function drawCustomTierElement(ctx, x, y, angle = 0, compData, metalKey = "gold", loadedImg = null, isLast = false) {
  const palette = getMetalPalette(metalKey);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Check if this is an authentic photographic earring stone (image_1, 2, 3, 4)
  const isEarringStone = compData?.id?.startsWith('image_') || compData?.earringLength || compData?.rawImage;

  if (isEarringStone && loadedImg) {
    const w = compData.earringWidth || compData.width || 26;
    const h = compData.earringLength || compData.height || 42;
    const hw = w / 2;
    const hh = h / 2;

    // Contact drop shadow onto backdrop
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(3, 4, hw * 0.92, hh * 0.88, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.restore();

    // Check if image is raw horizontal (width > height), auto-rotate if so
    if (loadedImg.width > loadedImg.height) {
      ctx.save();
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(loadedImg, -hh, -hw, h, w);
      ctx.restore();
    } else {
      ctx.drawImage(loadedImg, -hw, -hh, w, h);
    }

    // Dynamic angle-reactive specular gleam on bezel
    const gleamShift = Math.sin(angle) * hw * 0.3;
    drawSparkle(ctx, -hw * 0.25 + gleamShift, -hh * 0.28, 4.5, "#FFFFFF");

    ctx.restore();
    return;
  }

  // Fallback: Generic Bead / Gemstone in Collet Cup
  const size = 28;
  const r = size / 2;

  // Cast shadow
  ctx.beginPath();
  ctx.arc(3, 4, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fill();

  // Single Cast Gold Hinge Ring at bottom (ONLY if another tier is attached below!)
  if (!isLast) {
    const ey = r + 2.2;
    ctx.beginPath();
    ctx.arc(0, ey, 3.4, 0, Math.PI * 2);
    const eg = ctx.createLinearGradient(-3.4, ey - 3.4, 3.4, ey + 3.4);
    eg.addColorStop(0, palette.highlight);
    eg.addColorStop(0.35, palette.primary);
    eg.addColorStop(0.7, palette.secondary);
    eg.addColorStop(1, palette.deepShadow);
    ctx.strokeStyle = eg;
    ctx.lineWidth = 1.9;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, ey, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.fill();
  }

  // Gold cup bezel base
  ctx.beginPath();
  ctx.arc(0, 0, r + 1.2, 0, Math.PI * 2);
  const bg = ctx.createLinearGradient(-r, -r, r, r);
  bg.addColorStop(0, palette.highlight);
  bg.addColorStop(0.3, palette.primary);
  bg.addColorStop(0.8, palette.secondary);
  bg.addColorStop(1, palette.deepShadow);
  ctx.fillStyle = bg;
  ctx.fill();

  // Element image / fallback render
  if (loadedImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(loadedImg, -r, -r, size, size);
    ctx.restore();
  } else {
    // Fallback luxury pearl
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const fallbackGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    fallbackGrad.addColorStop(0, "#FFFFFF");
    fallbackGrad.addColorStop(0.4, "#F8F6F0");
    fallbackGrad.addColorStop(0.85, "#E2DACB");
    fallbackGrad.addColorStop(1, "#B8AC99");
    ctx.fillStyle = fallbackGrad;
    ctx.fill();
  }

  // 4 Corner Gold Retention Prongs
  [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].forEach(pa => {
    const px = Math.cos(pa) * r;
    const py = Math.sin(pa) * r;
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = palette.highlight;
    ctx.fill();
  });

  drawSparkle(ctx, -r * 0.3, -r * 0.3, 5, "#FFFFFF");

  ctx.restore();
}
