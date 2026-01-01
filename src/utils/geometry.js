export function calculatePositions(count, layout) {
  // For fixed slots, we ignore 'count' for spacing and use layout.slotCount if available
  // But to keep it generic, we'll assume the caller passes the total slot count if they want fixed spacing.
  
  const { centerX, centerY, startAngle, endAngle } = layout;
  // Support both circle (radius) and ellipse (radiusX, radiusY)
  const rx = layout.radiusX || layout.radius;
  const ry = layout.radiusY || layout.radius;

  const positions = [];

  // If it's a full circle, we usually want equal spacing without the gap at the end
  // i.e. 0, 90, 180, 270... not 0, 120, 240, 360(same as 0)
  const isFullCircle = Math.abs((endAngle - startAngle) - Math.PI * 2) < 0.01;
  const step = (endAngle - startAngle) / count;

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
