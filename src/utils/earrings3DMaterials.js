import * as THREE from 'three';

/**
 * High-Performance, Photorealistic Materials & Studio Lighting for 3D Earrings
 * Engineered for instant 60 FPS loading on both mobile and desktop.
 */

const textureCache = new Map();

// ============================================================================
// 1. INSTANT PROCEDURAL STUDIO ENVIRONMENT MAP
// ============================================================================
export function getStudioEnvironmentTexture() {
    if (textureCache.has('studio_env')) {
        return textureCache.get('studio_env');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Studio horizon with smooth ambient gradation
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 256);
    bgGrad.addColorStop(0, '#1c222b');
    bgGrad.addColorStop(0.5, '#0e1217');
    bgGrad.addColorStop(1, '#080a0d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Overhead high-intensity studio softbox (key light reflection)
    const softboxTop = ctx.createLinearGradient(0, 0, 0, 110);
    softboxTop.addColorStop(0, '#FFFFFF');
    softboxTop.addColorStop(0.3, '#FFFBF0');
    softboxTop.addColorStop(0.7, '#606875');
    softboxTop.addColorStop(1, 'rgba(14, 18, 23, 0)');
    ctx.fillStyle = softboxTop;
    ctx.fillRect(150, 0, 212, 100);

    // Warm left rim light softbox
    const softboxLeft = ctx.createRadialGradient(80, 120, 2, 80, 120, 70);
    softboxLeft.addColorStop(0, '#FFF4DC');
    softboxLeft.addColorStop(0.4, '#D4A86A');
    softboxLeft.addColorStop(0.8, '#44321A');
    softboxLeft.addColorStop(1, 'rgba(14, 18, 23, 0)');
    ctx.fillStyle = softboxLeft;
    ctx.fillRect(10, 50, 140, 140);

    // Cool right bounce softbox
    const softboxRight = ctx.createRadialGradient(430, 120, 2, 430, 120, 70);
    softboxRight.addColorStop(0, '#F0F7FF');
    softboxRight.addColorStop(0.4, '#80A8DE');
    softboxRight.addColorStop(0.8, '#243852');
    softboxRight.addColorStop(1, 'rgba(14, 18, 23, 0)');
    ctx.fillStyle = softboxRight;
    ctx.fillRect(360, 50, 140, 140);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    textureCache.set('studio_env', texture);
    return texture;
}

// ============================================================================
// 2. PROCEDURAL HIGH-RESOLUTION TEXTURES (Pearl Nacre & Larimar)
// ============================================================================

export function getLarimarTexture() {
    if (textureCache.has('larimar')) {
        return textureCache.get('larimar');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Rich vibrant Caribbean turquoise ocean blue base
    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, '#6DE3F5');
    grad.addColorStop(0.35, '#2BBED6');
    grad.addColorStop(0.7, '#158EA6');
    grad.addColorStop(1, '#0C6375');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Organic white volcanic silicate cloud clusters
    const clusters = [
        { x: 160, y: 150, r: 90 },
        { x: 330, y: 170, r: 100 },
        { x: 240, y: 310, r: 110 },
        { x: 130, y: 360, r: 80 },
        { x: 380, y: 340, r: 85 }
    ];

    for (const c of clusters) {
        const cloud = ctx.createRadialGradient(c.x, c.y, 5, c.x, c.y, c.r);
        cloud.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
        cloud.addColorStop(0.45, 'rgba(240, 252, 255, 0.55)');
        cloud.addColorStop(0.8, 'rgba(215, 248, 255, 0.2)');
        cloud.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = cloud;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Interconnecting white mineral veins
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(160, 150);
    ctx.quadraticCurveTo(240, 120, 330, 170);
    ctx.quadraticCurveTo(310, 250, 240, 310);
    ctx.quadraticCurveTo(170, 280, 160, 150);
    ctx.moveTo(240, 310);
    ctx.quadraticCurveTo(320, 350, 380, 340);
    ctx.moveTo(160, 150);
    ctx.quadraticCurveTo(120, 270, 130, 360);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set('larimar', texture);
    return texture;
}

export function getPearlTexture() {
    if (textureCache.has('pearl_nacre')) {
        return textureCache.get('pearl_nacre');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Natural iridescent nacre luster: soft warm ivory with pastel rose and silver undertones
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#FFFDF8');
    grad.addColorStop(0.25, '#FFF2EB'); // warm blush pink nacre
    grad.addColorStop(0.5, '#F2F7F9'); // cool silver-blue sheen
    grad.addColorStop(0.75, '#FFF0F5'); // lavender luminescence
    grad.addColorStop(1, '#FFF9F2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle natural organic nacre ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 12;
    for (let y = 40; y < 512; y += 70) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(160, y + 25, 340, y - 25, 512, y);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set('pearl_nacre', texture);
    return texture;
}

export function getTahitianPearlTexture() {
    if (textureCache.has('tahitian_nacre')) {
        return textureCache.get('tahitian_nacre');
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
    grad.addColorStop(0, '#263b36'); // emerald overtone
    grad.addColorStop(0.35, '#1e2830'); // deep ocean indigo
    grad.addColorStop(0.7, '#241a2e'); // regal aubergine/violet
    grad.addColorStop(1, '#0e1317');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Peacock iridescence swirl
    ctx.strokeStyle = 'rgba(78, 222, 178, 0.22)';
    ctx.lineWidth = 14;
    for (let y = 30; y < 512; y += 65) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(150, y + 30, 320, y - 30, 512, y);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set('tahitian_nacre', texture);
    return texture;
}

export function getGoldenPearlTexture() {
    if (textureCache.has('golden_nacre')) {
        return textureCache.get('golden_nacre');
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 15, 256, 256, 256);
    grad.addColorStop(0, '#FFF3C2');
    grad.addColorStop(0.3, '#F5CA65');
    grad.addColorStop(0.65, '#D6982C');
    grad.addColorStop(1, '#8C5D0E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(255, 245, 210, 0.3)';
    ctx.lineWidth = 10;
    for (let y = 30; y < 512; y += 75) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(180, y + 20, 300, y - 20, 512, y);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set('golden_nacre', texture);
    return texture;
}

export function getAkoyaPearlTexture() {
    if (textureCache.has('akoya_nacre')) {
        return textureCache.get('akoya_nacre');
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.4, '#FFF7F2');
    grad.addColorStop(0.8, '#F0F5FA');
    grad.addColorStop(1, '#E8EFF5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(255, 220, 235, 0.35)';
    ctx.lineWidth = 12;
    for (let y = 40; y < 512; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(140, y + 15, 360, y - 15, 512, y);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set('akoya_nacre', texture);
    return texture;
}

export function getPinkPearlTexture() {
    if (textureCache.has('pink_nacre')) {
        return textureCache.get('pink_nacre');
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
    grad.addColorStop(0, '#FFF5F8');
    grad.addColorStop(0.35, '#FAD1E1');
    grad.addColorStop(0.7, '#ECA1BE');
    grad.addColorStop(1, '#BA6688');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 10;
    for (let y = 35; y < 512; y += 65) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(150, y + 25, 320, y - 25, 512, y);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set('pink_nacre', texture);
    return texture;
}

export function getJadeTexture() {
    if (textureCache.has('jade')) {
        return textureCache.get('jade');
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
    grad.addColorStop(0, '#53D68A');
    grad.addColorStop(0.4, '#2CA862');
    grad.addColorStop(0.8, '#187841');
    grad.addColorStop(1, '#0D4E28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(180, 255, 210, 0.28)';
    ctx.lineWidth = 8;
    for (let y = 40; y < 512; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(160, y + 35, 300, y - 25, 512, y);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set('jade', texture);
    return texture;
}

// ============================================================================
// 3. PRECIOUS METALS (Authentic 18k Yellow Gold, Rose Gold, Platinum)
// ============================================================================
export const METAL_DEFINITIONS = {
    gold: {
        id: 'gold',
        name: '18k Yellow Gold',
        color: 0xF3C144,
        roughness: 0.14,
        metalness: 0.98,
        clearcoat: 0.45
    },
    roseGold: {
        id: 'roseGold',
        name: '18k Rose Gold',
        color: 0xE69D8E,
        roughness: 0.15,
        metalness: 0.98,
        clearcoat: 0.45
    },
    silver: {
        id: 'silver',
        name: 'Platinum White Gold',
        color: 0xF4F7FA,
        roughness: 0.11,
        metalness: 0.99,
        clearcoat: 0.5
    }
};

export function createPreciousMetalMaterial(metalId = 'gold') {
    const def = METAL_DEFINITIONS[metalId] || METAL_DEFINITIONS.gold;
    const envTex = getStudioEnvironmentTexture();

    return new THREE.MeshPhysicalMaterial({
        color: def.color,
        roughness: def.roughness,
        metalness: def.metalness,
        clearcoat: def.clearcoat,
        clearcoatRoughness: 0.06,
        envMap: envTex,
        envMapIntensity: 2.5,
        reflectivity: 1.0
    });
}

// ============================================================================
// 4. GEMSTONES (Brilliant Sparkle & Refraction)
// ============================================================================
export const GEMSTONE_DEFINITIONS = {
    diamond: {
        name: 'Brilliant Diamond',
        color: 0xFFFFFF,
        opacity: 0.88,
        roughness: 0.0,
        envMapIntensity: 3.5
    },
    sapphire: {
        name: 'Royal Ceylon Sapphire',
        color: 0x184AB8,
        opacity: 0.88,
        roughness: 0.01,
        envMapIntensity: 3.0
    },
    amethyst: {
        name: 'Imperial Amethyst',
        color: 0x7E3DBA,
        opacity: 0.86,
        roughness: 0.01,
        envMapIntensity: 2.8
    },
    emerald: {
        name: 'Colombian Emerald',
        color: 0x0E994D,
        opacity: 0.88,
        roughness: 0.01,
        envMapIntensity: 3.0
    },
    ruby: {
        name: 'Pigeon Blood Ruby',
        color: 0xCC183B,
        opacity: 0.88,
        roughness: 0.01,
        envMapIntensity: 3.0
    },
    jade: {
        name: 'Burmese Green Jade',
        color: 0x228B53,
        opacity: 0.94,
        roughness: 0.1,
        envMapIntensity: 2.2
    }
};

export function createGemstoneMaterial(gemType = 'diamond') {
    const def = GEMSTONE_DEFINITIONS[gemType] || GEMSTONE_DEFINITIONS.diamond;
    const envTex = getStudioEnvironmentTexture();

    if (gemType === 'jade') {
        const jadeTex = getJadeTexture();
        return new THREE.MeshPhysicalMaterial({
            map: jadeTex,
            color: def.color,
            roughness: def.roughness,
            metalness: 0.02,
            clearcoat: 0.85,
            clearcoatRoughness: 0.04,
            envMap: envTex,
            envMapIntensity: def.envMapIntensity,
            transmission: 0.35,
            thickness: 0.8,
            reflectivity: 0.9
        });
    }

    return new THREE.MeshPhysicalMaterial({
        color: def.color,
        transparent: true,
        opacity: def.opacity,
        roughness: def.roughness,
        metalness: 0.02,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        envMap: envTex,
        envMapIntensity: def.envMapIntensity,
        ior: 2.417,
        reflectivity: 0.98
    });
}

// ============================================================================
// 5. ORGANIC BAROQUE & CULTURED PEARL MATERIALS
// ============================================================================
export function createBaroquePearlMaterial() {
    const pearlTex = getPearlTexture();
    const envTex = getStudioEnvironmentTexture();

    return new THREE.MeshPhysicalMaterial({
        map: pearlTex,
        color: 0xFFFDF7,
        roughness: 0.12, // High pearl gloss
        metalness: 0.04,
        sheen: 1.0,
        sheenColor: new THREE.Color(0xFFE5F0), // Radiant nacre iridescence
        sheenRoughness: 0.18,
        clearcoat: 0.75,
        clearcoatRoughness: 0.06,
        envMap: envTex,
        envMapIntensity: 1.8
    });
}

export function createCustomPearlMaterial(pearlType = 'freshwater') {
    const envTex = getStudioEnvironmentTexture();
    switch (pearlType) {
        case 'tahitian': {
            const tex = getTahitianPearlTexture();
            return new THREE.MeshPhysicalMaterial({
                map: tex,
                color: 0x1c2429,
                roughness: 0.08,
                metalness: 0.12,
                sheen: 1.0,
                sheenColor: new THREE.Color(0x38D6A4), // peacock emerald/violet
                sheenRoughness: 0.14,
                clearcoat: 0.9,
                clearcoatRoughness: 0.03,
                envMap: envTex,
                envMapIntensity: 2.8
            });
        }
        case 'golden': {
            const tex = getGoldenPearlTexture();
            return new THREE.MeshPhysicalMaterial({
                map: tex,
                color: 0xF5CA65,
                roughness: 0.09,
                metalness: 0.18,
                sheen: 1.0,
                sheenColor: new THREE.Color(0xFFE599),
                sheenRoughness: 0.12,
                clearcoat: 0.88,
                clearcoatRoughness: 0.04,
                envMap: envTex,
                envMapIntensity: 2.5
            });
        }
        case 'akoya': {
            const tex = getAkoyaPearlTexture();
            return new THREE.MeshPhysicalMaterial({
                map: tex,
                color: 0xFFFAF4,
                roughness: 0.04,
                metalness: 0.03,
                sheen: 1.0,
                sheenColor: new THREE.Color(0xFFDFEA),
                sheenRoughness: 0.08,
                clearcoat: 0.96,
                clearcoatRoughness: 0.02,
                envMap: envTex,
                envMapIntensity: 2.5
            });
        }
        case 'pink': {
            const tex = getPinkPearlTexture();
            return new THREE.MeshPhysicalMaterial({
                map: tex,
                color: 0xFFE0EB,
                roughness: 0.1,
                metalness: 0.04,
                sheen: 1.0,
                sheenColor: new THREE.Color(0xFFA5C5),
                sheenRoughness: 0.18,
                clearcoat: 0.82,
                clearcoatRoughness: 0.05,
                envMap: envTex,
                envMapIntensity: 2.1
            });
        }
        default:
            return createBaroquePearlMaterial();
    }
}

export function createTierMaterial(stoneId) {
    switch (stoneId) {
        case 'tahitian_pearl':
            return createCustomPearlMaterial('tahitian');
        case 'golden_pearl':
            return createCustomPearlMaterial('golden');
        case 'akoya_pearl':
            return createCustomPearlMaterial('akoya');
        case 'pink_keshi_pearl':
            return createCustomPearlMaterial('pink');
        case 'pearl':
            return createBaroquePearlMaterial();
        case 'ruby_briolette':
            return createGemstoneMaterial('ruby');
        case 'amethyst':
            return createGemstoneMaterial('amethyst');
        case 'jade':
            return createGemstoneMaterial('jade');
        default:
            if (GEMSTONE_DEFINITIONS[stoneId]) {
                return createGemstoneMaterial(stoneId);
            }
            return createGemstoneMaterial('diamond');
    }
}

// ============================================================================
// 6. LARIMAR CABOCHON (Glossy High Polish)
// ============================================================================
export function createLarimarCabochonMaterial() {
    const larimarTex = getLarimarTexture();
    const envTex = getStudioEnvironmentTexture();

    return new THREE.MeshPhysicalMaterial({
        map: larimarTex,
        roughness: 0.06,
        metalness: 0.0,
        clearcoat: 0.92,
        clearcoatRoughness: 0.03,
        envMap: envTex,
        envMapIntensity: 2.4,
        reflectivity: 0.9
    });
}

// ============================================================================
// 7. ATELIER STAND (Satin Brushed Brass)
// ============================================================================
export function createAtelierStandMaterial() {
    const envTex = getStudioEnvironmentTexture();

    return new THREE.MeshStandardMaterial({
        color: 0x9E844E,
        roughness: 0.3,
        metalness: 0.88,
        envMap: envTex,
        envMapIntensity: 1.5
    });
}

// ============================================================================
// 8. STUDIO LIGHTING & BACKDROP THEMES
// ============================================================================
export const STUDIO_PALETTES = {
    'velvet-emerald': {
        bgTop: '#0d2b21',
        bgBottom: '#05140f',
        ambient: 0x143328,
        floor: 0x071c14
    },
    'velvet-charcoal': {
        bgTop: '#1e242d',
        bgBottom: '#0c0e12',
        ambient: 0x222933,
        floor: 0x101317
    },
    'atelier-champagne': {
        bgTop: '#2d2822',
        bgBottom: '#181410',
        ambient: 0x3d352b,
        floor: 0x211c16
    },
    'studio-white': {
        bgTop: '#2c333d',
        bgBottom: '#15191f',
        ambient: 0x333b47,
        floor: 0x181e26
    }
};

export function setupStudioSceneLighting(scene, renderer, backdropTheme = 'velvet-emerald') {
    const envTex = getStudioEnvironmentTexture();
    scene.environment = envTex;

    const palette = STUDIO_PALETTES[backdropTheme] || STUDIO_PALETTES['velvet-emerald'];

    // 1. Studio Backdrop Canvas (Smooth radial luxury atelier glow)
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d');

    const rad = bgCtx.createRadialGradient(256, 220, 20, 256, 256, 360);
    rad.addColorStop(0, palette.bgTop);
    rad.addColorStop(0.65, palette.bgBottom);
    rad.addColorStop(1, '#040608');
    bgCtx.fillStyle = rad;
    bgCtx.fillRect(0, 0, 512, 512);

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    scene.background = bgTexture;

    // 2. Ambient boutique light
    const ambientLight = new THREE.AmbientLight(palette.ambient, 1.4);
    scene.add(ambientLight);

    // 3. Key Spotlight (Crisp jewelry highlight - no harsh shadows)
    const keyLight = new THREE.SpotLight(0xFFF7EA, 25.0);
    keyLight.position.set(4.0, 7.5, 6.0);
    keyLight.angle = Math.PI / 4.2;
    keyLight.penumbra = 0.55;
    keyLight.decay = 1.6;
    keyLight.castShadow = false;
    scene.add(keyLight);

    // 4. Fill Light (Soft cool bounce)
    const fillLight = new THREE.DirectionalLight(0xD8EEFF, 1.2);
    fillLight.position.set(-5.0, 3.5, 4.0);
    scene.add(fillLight);

    // 5. Rim Light (Accent silhouette)
    const rimLight = new THREE.DirectionalLight(0xFFE8CC, 2.4);
    rimLight.position.set(2.0, 4.5, -5.5);
    scene.add(rimLight);

    return {
        ambientLight,
        keyLight,
        fillLight,
        rimLight,
        envTexture: envTex,
        bgTexture
    };
}
