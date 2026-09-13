import * as THREE from 'three';

/**
 * Optimized Fine Jewelry Geometries for Earrings Studio
 * Lightweight, high-performance, and exquisite proportions.
 */

// ============================================================================
// 1. ROUND BRILLIANT CUT GEMSTONE (32 Facets, Ultra-Fast & Sparkling)
// ============================================================================
export function createBrilliantCutDiamondGeometry(radius = 0.35, crownHeight = 0.14, pavilionDepth = 0.28) {
    const segments = 12; // 12-fold symmetry for brilliant facet sparkle
    const positions = [];
    const indices = [];

    const tableY = crownHeight;
    const tableRadius = radius * 0.58;
    const girdleY = 0.02;
    const culetY = -pavilionDepth;

    // Table vertices
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(angle) * tableRadius, tableY, Math.sin(angle) * tableRadius);
    }
    // Table center
    const tableCenterIdx = segments;
    positions.push(0, tableY, 0);

    for (let i = 0; i < segments; i++) {
        indices.push(tableCenterIdx, i, (i + 1) % segments);
    }

    // Girdle vertices
    const girdleStartIdx = positions.length / 3;
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(angle) * radius, girdleY, Math.sin(angle) * radius);
    }

    // Crown facets
    for (let i = 0; i < segments; i++) {
        const t1 = i;
        const t2 = (i + 1) % segments;
        const g1 = girdleStartIdx + i;
        const g2 = girdleStartIdx + (i + 1) % segments;
        indices.push(t1, g1, t2);
        indices.push(t2, g1, g2);
    }

    // Culet
    const culetIdx = positions.length / 3;
    positions.push(0, culetY, 0);

    // Pavilion facets
    for (let i = 0; i < segments; i++) {
        const g1 = girdleStartIdx + i;
        const g2 = girdleStartIdx + (i + 1) % segments;
        indices.push(g1, culetIdx, g2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// ============================================================================
// 2. FACETED BRIOLETTE TEARDROP GEMSTONE
// ============================================================================
export function createPearBrioletteCutGeometry(radius = 0.38, height = 0.95) {
    const latBands = 8;
    const lonBands = 10;
    const positions = [];
    const indices = [];

    for (let lat = 0; lat <= latBands; lat++) {
        const v = lat / latBands;
        const y = height * (0.5 - v);
        let r = Math.sin(v * Math.PI) * (1.0 + 0.3 * Math.sin(v * Math.PI * 0.5));
        if (v < 0.25) r *= (v / 0.25);
        r *= radius;

        const offset = (lat % 2 === 1) ? (Math.PI / lonBands) : 0;
        for (let lon = 0; lon <= lonBands; lon++) {
            const u = lon / lonBands;
            const angle = u * Math.PI * 2 + offset;
            positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
        }
    }

    for (let lat = 0; lat < latBands; lat++) {
        for (let lon = 0; lon < lonBands; lon++) {
            const first = lat * (lonBands + 1) + lon;
            const second = first + lonBands + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// ============================================================================
// 3. ORGANIC BAROQUE PEARL (Natural Silky Freshwater Keshi Drop)
// ============================================================================
export function createBaroquePearlGeometry(radius = 0.42, lengthScale = 1.45, seed = 1.0) {
    // 24x18 sphere = 450 vertices (instant <1ms generation, silky smooth Gouraud normals)
    const geometry = new THREE.SphereGeometry(radius, 24, 18);
    const pos = geometry.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Normalize direction
        const d = Math.sqrt(x * x + y * y + z * z) || 1;
        const nx = x / d;
        const ny = y / d;
        const nz = z / d;

        // Natural teardrop profile (wider bottom, tapered top)
        const taper = 1.0 + 0.3 * ny - 0.15 * ny * ny;

        // Gentle organic undulations (keshi ripples)
        const ripple1 = Math.sin(ny * 4.2 + nx * 2.8 + seed) * 0.08;
        const ripple2 = Math.cos(nz * 3.5 + ny * 2.1 + seed * 1.6) * 0.05;
        const scale = 1.0 + ripple1 + ripple2;

        x = nx * radius * scale * taper;
        y = ny * radius * lengthScale * scale;
        z = nz * radius * scale * 0.78; // Natural flattened pebble profile

        pos.setXYZ(i, x, y, z);
    }

    geometry.computeVertexNormals();
    return geometry;
}

// ============================================================================
// 4. POLISHED LARIMAR / TURQUOISE CABOCHON
// ============================================================================
export function createCabochonGeometry(radius = 0.38, height = 0.16) {
    const geometry = new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    geometry.scale(1, height / radius, 1);
    return geometry;
}

// ============================================================================
// 5. INTERLOCKING JUMP RING (Wire Torus)
// ============================================================================
export function createJumpRingGeometry(ringRadius = 0.11, wireRadius = 0.026) {
    return new THREE.TorusGeometry(ringRadius, wireRadius, 10, 20);
}

export function createAkoyaPearlGeometry(radius = 0.36) {
    return new THREE.SphereGeometry(radius, 24, 20);
}

export function createChainLinkTierGeometry(radius = 0.085, wireRadius = 0.022) {
    const ring = new THREE.TorusGeometry(radius, wireRadius, 8, 18);
    ring.rotateY(Math.PI / 2);
    return ring;
}

export function createTierDropCapGeometry(radius = 0.24, height = 0.14) {
    const parts = [];
    const cone = new THREE.ConeGeometry(radius, height, 14, 1, true);
    cone.rotateX(Math.PI);
    parts.push(cone);

    const eyelet = new THREE.TorusGeometry(0.065, 0.018, 8, 16);
    eyelet.translate(0, height * 0.5 + 0.065, 0);
    parts.push(eyelet);

    return mergeGeometries(parts);
}

export function createBottomEyeletGeometry() {
    const loop = new THREE.TorusGeometry(0.065, 0.018, 8, 16);
    return loop;
}

// ============================================================================
// 6. EARRING HARDWARE: FRENCH EAR WIRE HOOK
// ============================================================================
export function createFrenchHookGeometry() {
    const curvePoints = [
        new THREE.Vector3(0, 0, 0.18),
        new THREE.Vector3(0, 0.25, 0.16),
        new THREE.Vector3(0, 0.65, 0.08),
        new THREE.Vector3(0, 0.55, -0.12),
        new THREE.Vector3(0, 0.20, -0.22)
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tube = new THREE.TubeGeometry(curve, 18, 0.024, 8, false);

    const eyelet = new THREE.TorusGeometry(0.07, 0.02, 8, 16);
    eyelet.rotateY(Math.PI / 2);
    eyelet.translate(0, 0, 0.18);

    return mergeGeometries([tube, eyelet]);
}

// ============================================================================
// 6B. EARRING HARDWARE: KIDNEY / LEVERBACK SAFETY EAR WIRE
// ============================================================================
export function createKidneyWireGeometry() {
    const curvePoints = [
        new THREE.Vector3(0, 0, 0.18),
        new THREE.Vector3(0, 0.32, 0.14),
        new THREE.Vector3(0, 0.72, 0.05),
        new THREE.Vector3(0, 0.65, -0.16),
        new THREE.Vector3(0, 0.22, -0.28),
        new THREE.Vector3(0, 0.04, -0.18),
        new THREE.Vector3(0, 0.02, -0.04)
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tube = new THREE.TubeGeometry(curve, 24, 0.022, 8, false);

    const eyelet = new THREE.TorusGeometry(0.07, 0.02, 8, 16);
    eyelet.rotateY(Math.PI / 2);
    eyelet.translate(0, 0, 0.18);

    const latchSphere = new THREE.SphereGeometry(0.035, 8, 8);
    latchSphere.translate(0, 0.02, -0.04);

    return mergeGeometries([tube, eyelet, latchSphere]);
}

// ============================================================================
// 7. EARRING HARDWARE: HUGGIE HOOP
// ============================================================================
export function createHuggieHoopGeometry(outerRadius = 0.38, tubeRadius = 0.055) {
    const hoop = new THREE.TorusGeometry(outerRadius, tubeRadius, 12, 28, Math.PI * 1.5);
    hoop.rotateZ(Math.PI * 0.75);

    const postCurve = new THREE.LineCurve3(
        new THREE.Vector3(-outerRadius * 0.65, outerRadius * 0.75, 0),
        new THREE.Vector3(outerRadius * 0.65, outerRadius * 0.75, 0)
    );
    const post = new THREE.TubeGeometry(postCurve, 4, 0.022, 6, false);

    const eyelet = new THREE.TorusGeometry(0.08, 0.022, 8, 16);
    eyelet.translate(0, -outerRadius - 0.05, 0);

    return mergeGeometries([hoop, post, eyelet]);
}

// ============================================================================
// 8. EARRING HARDWARE: SOLITAIRE STUD WITH BUTTERFLY CLUTCH
// ============================================================================
export function createStudHardwareGeometry() {
    const parts = [];

    // Post pin
    const postCurve = new THREE.LineCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -0.65)
    );
    const post = new THREE.TubeGeometry(postCurve, 4, 0.022, 6, false);
    parts.push(post);

    // Butterfly back clutch
    const clutch1 = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10);
    clutch1.rotateZ(Math.PI / 2);
    clutch1.translate(0.07, 0, -0.52);
    parts.push(clutch1);

    const clutch2 = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10);
    clutch2.rotateZ(Math.PI / 2);
    clutch2.translate(-0.07, 0, -0.52);
    parts.push(clutch2);

    // Hanging eyelet loop
    const loop = new THREE.TorusGeometry(0.08, 0.022, 8, 16);
    loop.translate(0, -0.18, 0);
    parts.push(loop);

    return mergeGeometries(parts);
}

// ============================================================================
// 9. FINE JEWELRY PRONGS & BEZEL SETTINGS
// ============================================================================
export function createProngColletGeometry(radius = 0.38, numProngs = 4, height = 0.25) {
    const parts = [];

    // Base collar ring
    const baseCollar = new THREE.TorusGeometry(radius * 0.75, 0.032, 8, 20);
    baseCollar.rotateX(Math.PI / 2);
    baseCollar.translate(0, -height * 0.7, 0);
    parts.push(baseCollar);

    // Prongs
    for (let i = 0; i < numProngs; i++) {
        const angle = (i / numProngs) * Math.PI * 2 + Math.PI / 4;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(cos * radius * 0.75, -height * 0.7, sin * radius * 0.75),
            new THREE.Vector3(cos * radius * 0.98, 0, sin * radius * 0.98),
            new THREE.Vector3(cos * radius * 0.92, height * 0.25, sin * radius * 0.92)
        ]);
        const prong = new THREE.TubeGeometry(curve, 6, 0.032, 6, false);
        parts.push(prong);
    }

    return mergeGeometries(parts);
}

export function createConnectorBezelSettingGeometry(radiusX = 0.4, radiusZ = 0.35, height = 0.15) {
    const parts = [];

    // Oval bezel rim
    const rim = new THREE.TorusGeometry(radiusX, 0.035, 8, 24);
    rim.scale(1, radiusZ / radiusX, 1);
    parts.push(rim);

    // 4 prongs
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const x = Math.cos(angle) * radiusX;
        const z = Math.sin(angle) * radiusZ;
        const prong = new THREE.CylinderGeometry(0.028, 0.028, height, 6);
        prong.translate(x, height * 0.3, z);
        parts.push(prong);
    }

    // Top loop
    const topLoop = new THREE.TorusGeometry(0.08, 0.022, 8, 16);
    topLoop.translate(0, radiusZ + 0.08, 0);
    parts.push(topLoop);

    // Bottom loop
    const bottomLoop = new THREE.TorusGeometry(0.08, 0.022, 8, 16);
    bottomLoop.translate(0, -(radiusZ + 0.08), 0);
    parts.push(bottomLoop);

    return mergeGeometries(parts);
}

// ============================================================================
// 10. LUXURY ATELIER DISPLAY STAND (Slender, Elegant Proportions)
// ============================================================================
export function createAtelierDisplayStandGeometry() {
    const parts = [];

    // Base pedestal
    const base1 = new THREE.CylinderGeometry(2.4, 2.6, 0.22, 32);
    base1.translate(0, -3.8, 0);
    parts.push(base1);

    const base2 = new THREE.CylinderGeometry(1.8, 2.1, 0.18, 32);
    base2.translate(0, -3.6, 0);
    parts.push(base2);

    // Column
    const column = new THREE.CylinderGeometry(0.1, 0.14, 6.2, 20);
    column.translate(0, -0.6, 0);
    parts.push(column);

    // Knob
    const knob = new THREE.SphereGeometry(0.24, 16, 12);
    knob.translate(0, 2.5, 0);
    parts.push(knob);

    // T-Bar
    const tBarCurve = new THREE.LineCurve3(
        new THREE.Vector3(-1.8, 2.5, 0),
        new THREE.Vector3(1.8, 2.5, 0)
    );
    const tBar = new THREE.TubeGeometry(tBarCurve, 8, 0.08, 10, false);
    parts.push(tBar);

    // Left & Right Hook Notches
    const leftHook = new THREE.TorusGeometry(0.14, 0.028, 8, 16, Math.PI);
    leftHook.rotateZ(Math.PI);
    leftHook.translate(-1.4, 2.5, 0);
    parts.push(leftHook);

    const rightHook = new THREE.TorusGeometry(0.14, 0.028, 8, 16, Math.PI);
    rightHook.rotateZ(Math.PI);
    rightHook.translate(1.4, 2.5, 0);
    parts.push(rightHook);

    // Finial tips
    const finialL = new THREE.SphereGeometry(0.14, 12, 10);
    finialL.translate(-1.8, 2.5, 0);
    parts.push(finialL);

    const finialR = new THREE.SphereGeometry(0.14, 12, 10);
    finialR.translate(1.8, 2.5, 0);
    parts.push(finialR);

    return mergeGeometries(parts);
}

// Merge Helper
function mergeGeometries(geometries) {
    let totalPositions = 0;
    let totalIndices = 0;

    for (const g of geometries) {
        totalPositions += g.attributes.position.count * 3;
        totalIndices += g.index ? g.index.count : g.attributes.position.count;
    }

    const mergedPositions = new Float32Array(totalPositions);
    const mergedIndices = [];

    let posOffset = 0;
    let indexOffset = 0;

    for (const g of geometries) {
        const pos = g.attributes.position.array;
        mergedPositions.set(pos, posOffset);

        const vertOffset = posOffset / 3;
        if (g.index) {
            const idx = g.index.array;
            for (let i = 0; i < idx.length; i++) {
                mergedIndices.push(idx[i] + vertOffset);
            }
        } else {
            for (let i = 0; i < g.attributes.position.count; i++) {
                mergedIndices.push(i + vertOffset);
            }
        }

        posOffset += pos.length;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
    merged.setIndex(mergedIndices);
    merged.computeVertexNormals();
    return merged;
}
