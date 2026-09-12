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

  // 3. Central bright specular highlight to give it a 3D cylindrical wire look
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

  // Polished 3D metal stud sphere
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

// ─── Diamond / Gemstone Multi-Point Sparkle ──────────────────────────────────

export function drawSparkle(ctx, x, y, size = 8, color = "#FFFFFF") {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  // 4-point star
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.12, -size * 0.12, size, 0);
  ctx.quadraticCurveTo(size * 0.12, size * 0.12, 0, size);
  ctx.quadraticCurveTo(-size * 0.12, size * 0.12, -size, 0);
  ctx.quadraticCurveTo(-size * 0.12, -size * 0.12, 0, -size);
  ctx.fill();

  // Core brilliant center
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

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
