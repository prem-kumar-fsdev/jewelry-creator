export function calculatePositions(count, layout) {
  // Legacy support for fixed count if needed, or we can remove/refactor
  // But for the new requirement, we likely need specific point calculation.
  const { centerX, centerY, startAngle, endAngle } = layout;
  const rx = layout.radiusX || layout.radius;
  const ry = layout.radiusY || layout.radius;
  
  const step = (endAngle - startAngle) / count;
  const positions = [];
  
  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * step;
    positions.push({
      x: centerX + Math.cos(angle) * rx,
      y: centerY + Math.sin(angle) * ry,
      angle: angle,
      rotation: 0,
    });
  }
  return positions;
}

export function getPointOnEllipse(angle, layout) {
  const { centerX, centerY } = layout;
  const rx = layout.radiusX || layout.radius;
  const ry = layout.radiusY || layout.radius;

  return {
    x: centerX + Math.cos(angle) * rx,
    y: centerY + Math.sin(angle) * ry,
    angle: angle
  };
}

export function getAngleFromPoint(x, y, centerX, centerY) {
  return Math.atan2(y - centerY, x - centerX);
}

export function isClickNearEllipse(x, y, layout, threshold = 40) {
  const { centerX, centerY } = layout;
  const rx = layout.radiusX || layout.radius;
  const ry = layout.radiusY || layout.radius;
  
  // Approximate check: calculate distance from center, compare to radius at that angle
  const angle = Math.atan2(y - centerY, x - centerX);
  const ellipseX = centerX + Math.cos(angle) * rx;
  const ellipseY = centerY + Math.sin(angle) * ry;
  
  const dist = Math.sqrt(Math.pow(x - ellipseX, 2) + Math.pow(y - ellipseY, 2));
  return dist <= threshold;
}
