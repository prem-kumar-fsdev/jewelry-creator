export function calculatePositions(count, layout) {
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

export function getPointOnLayout(angle, layout, side = 'left') {
  if (layout.type === 'dual-earring') {
    const center = side === 'right' ? layout.rightCenter : layout.leftCenter;
    const rx = layout.radiusX;
    const ry = layout.radiusY;
    return {
      x: center.x + Math.cos(angle) * rx,
      y: center.y + Math.sin(angle) * ry,
      angle: angle,
      side: side
    };
  }

  const { centerX, centerY } = layout;
  const rx = layout.radiusX || layout.radius;
  const ry = layout.radiusY || layout.radius;

  return {
    x: centerX + Math.cos(angle) * rx,
    y: centerY + Math.sin(angle) * ry,
    angle: angle
  };
}

export function getPointOnEllipse(angle, layout) {
  return getPointOnLayout(angle, layout);
}

export function getAngleFromPoint(x, y, centerX, centerY) {
  return Math.atan2(y - centerY, x - centerX);
}

export function isClickNearEllipse(x, y, layout, threshold = 40) {
  if (layout.type === 'dual-earring') {
    // Check left earring
    const leftDist = checkDistanceToOval(x, y, layout.leftCenter, layout.radiusX, layout.radiusY);
    if (leftDist <= threshold) return { isNear: true, side: 'left', center: layout.leftCenter };

    // Check right earring
    const rightDist = checkDistanceToOval(x, y, layout.rightCenter, layout.radiusX, layout.radiusY);
    if (rightDist <= threshold) return { isNear: true, side: 'right', center: layout.rightCenter };

    return { isNear: false };
  }

  // Necklace or Bracelet
  const { centerX, centerY } = layout;
  const rx = layout.radiusX || layout.radius;
  const ry = layout.radiusY || layout.radius;
  
  const angle = Math.atan2(y - centerY, x - centerX);

  // If necklace curve, check if angle is within the necklace arc range
  if (layout.type === 'necklace-curve') {
    // Check if angle is in lower half (roughly between 0 and PI)
    if (angle < layout.startAngle - 0.2 || angle > layout.endAngle + 0.2) {
      return { isNear: false };
    }
  }

  const ellipseX = centerX + Math.cos(angle) * rx;
  const ellipseY = centerY + Math.sin(angle) * ry;
  
  const dist = Math.sqrt(Math.pow(x - ellipseX, 2) + Math.pow(y - ellipseY, 2));
  return { isNear: dist <= threshold, angle, center: { x: centerX, y: centerY } };
}

function checkDistanceToOval(x, y, center, rx, ry) {
  const angle = Math.atan2(y - center.y, x - center.x);
  const ovalX = center.x + Math.cos(angle) * rx;
  const ovalY = center.y + Math.sin(angle) * ry;
  return Math.sqrt(Math.pow(x - ovalX, 2) + Math.pow(y - ovalY, 2));
}
