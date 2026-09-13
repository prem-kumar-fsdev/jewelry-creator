import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    createBrilliantCutDiamondGeometry,
    createPearBrioletteCutGeometry,
    createBaroquePearlGeometry,
    createCabochonGeometry,
    createJumpRingGeometry,
    createFrenchHookGeometry,
    createKidneyWireGeometry,
    createHuggieHoopGeometry,
    createStudHardwareGeometry,
    createProngColletGeometry,
    createConnectorBezelSettingGeometry,
    createAtelierDisplayStandGeometry,
    createAkoyaPearlGeometry,
    createChainLinkTierGeometry,
    createTierDropCapGeometry,
    createBottomEyeletGeometry
} from '../utils/earrings3DGeometries';
import {
    createPreciousMetalMaterial,
    createGemstoneMaterial,
    createBaroquePearlMaterial,
    createLarimarCabochonMaterial,
    createAtelierStandMaterial,
    createTierMaterial,
    setupStudioSceneLighting
} from '../utils/earrings3DMaterials';
import { EarringPhysicsSystem } from '../utils/earrings3DPhysics';
import { COMPONENTS } from '../data/jewelryData';

/**
 * High-Performance, Photorealistic 3D Earrings Studio
 * Features instant loading (<100ms), 60 FPS physics, and dynamic chain tier attachment.
 */

export const getEarringSegmentsConfig = (styleConfig, chainItems = []) => {
    const lengths = [...(styleConfig?.lengths || [0.32, 0.16, 0.48, 0.16, 0.82])];
    const masses = [...(styleConfig?.masses || [0.4, 0.15, 0.6, 0.15, 1.1])];

    chainItems.forEach(() => {
        // Interlocking jump ring link
        lengths.push(0.16);
        masses.push(0.15);
        // Stone / Pearl drop tier
        lengths.push(0.72);
        masses.push(0.9);
    });

    return lengths.map((len, idx) => ({
        length: len,
        mass: masses[idx] || 1.0
    }));
};

export const EARRING_STYLES = {
    'baroque-larimar': {
        id: 'baroque-larimar',
        name: 'Baroque Pearl & Larimar Drop',
        description: 'Lustrous organic baroque pearl with polished sea-foam larimar cabochon in 18k gold',
        topHardware: 'stud',
        middleType: 'larimar',
        dropType: 'baroque-pearl',
        lengths: [0.32, 0.16, 0.48, 0.16, 0.82],
        masses: [0.4, 0.15, 0.6, 0.15, 1.1]
    },
    'royal-chandelier': {
        id: 'royal-chandelier',
        name: 'Royal Sapphire Chandelier',
        description: 'Brilliant diamond stud cascading to a royal Ceylon blue faceted sapphire briolette drop',
        topHardware: 'stud',
        middleType: 'diamond',
        dropType: 'sapphire-briolette',
        lengths: [0.32, 0.16, 0.45, 0.16, 0.85],
        masses: [0.5, 0.15, 0.6, 0.15, 1.0]
    },
    'solitaire-drop': {
        id: 'solitaire-drop',
        name: 'Solitaire Diamond Drop',
        description: 'Diamond huggie hoop suspending a giant brilliant-cut diamond drop in 18k gold',
        topHardware: 'huggie',
        middleType: 'none',
        dropType: 'diamond-solitaire',
        lengths: [0.45, 0.16, 0.65],
        masses: [0.5, 0.15, 1.2]
    },
    'amethyst-cascade': {
        id: 'amethyst-cascade',
        name: 'Amethyst & Keshi Pearl Cascade',
        description: 'Imperial amethyst gemstone paired with a lustrous organic freshwater keshi pearl drop',
        topHardware: 'hook',
        middleType: 'amethyst',
        dropType: 'baroque-pearl',
        lengths: [0.38, 0.16, 0.48, 0.16, 0.82],
        masses: [0.4, 0.15, 0.6, 0.15, 1.1]
    },
    'emerald-cabochon': {
        id: 'emerald-cabochon',
        name: 'Colombian Emerald Drop',
        description: 'Fine gold stud setting with vivid green emerald and tiered baroque teardrop',
        topHardware: 'stud',
        middleType: 'emerald',
        dropType: 'baroque-pearl',
        lengths: [0.32, 0.16, 0.46, 0.16, 0.82],
        masses: [0.45, 0.15, 0.6, 0.15, 1.1]
    }
};

const Earrings3DStudio = ({
    selectedMetal = 'gold',
    selectedBackdrop = 'velvet-emerald',
    earringStyle = 'baroque-larimar',
    selectedEarringHardware = 'hook',
    attachedChain = [],
    onAttachStone,
    onRemoveLastStone,
    onResetChain,
    onCanvasReady
}) => {
    const mountRef = useRef(null);
    const canvasRef = useRef(null);

    // State
    const [breezeLevel, setBreezeLevel] = useState(1);
    const [isAutoOrbit, setIsAutoOrbit] = useState(false);
    const [viewMode, setViewMode] = useState('pair');
    const [isHoveredEarring, setIsHoveredEarring] = useState(false);
    const [activeStyle, setActiveStyle] = useState(earringStyle);
    const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
    const isDragOverCanvasRef = useRef(false);
    const [toastMessage, setToastMessage] = useState(null);
    const toastTimeoutRef = useRef(null);

    // Three.js References
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const leftPhysicsRef = useRef(null);
    const rightPhysicsRef = useRef(null);
    const leftMeshesRef = useRef([]);
    const rightMeshesRef = useRef([]);
    const snapRingLeftRef = useRef(null);
    const snapRingRightRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Interaction References
    const raycasterRef = useRef(new THREE.Raycaster());
    const mousePosRef = useRef(new THREE.Vector2());
    const activeDraggingSystemRef = useRef(null);
    const prevCameraPosRef = useRef(new THREE.Vector3());

    const triggerToast = (msg) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage(msg);
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    useEffect(() => {
        if (earringStyle && EARRING_STYLES[earringStyle]) {
            setActiveStyle(earringStyle);
        }
    }, [earringStyle]);

    // ========================================================================
    // BUILD EARRING MESHES
    // ========================================================================
    const buildEarringAssembly = useCallback((styleConfig, metalId, side = 'left', chainItems = []) => {
        const metalMat = createPreciousMetalMaterial(metalId);
        const pearlMat = createBaroquePearlMaterial();
        const larimarMat = createLarimarCabochonMaterial();
        const diamondMat = createGemstoneMaterial('diamond');
        const sapphireMat = createGemstoneMaterial('sapphire');
        const amethystMat = createGemstoneMaterial('amethyst');
        const emeraldMat = createGemstoneMaterial('emerald');

        const segmentObjects = [];

        const getGemMaterial = (type) => {
            switch (type) {
                case 'larimar': return larimarMat;
                case 'diamond': return diamondMat;
                case 'sapphire': return sapphireMat;
                case 'amethyst': return amethystMat;
                case 'emerald': return emeraldMat;
                default: return larimarMat;
            }
        };

        if (styleConfig.id === 'solitaire-drop') {
            // 3-Segment Chain: Huggie Hoop -> Jump Ring -> Diamond Solitaire
            const hoopGroup = new THREE.Group();
            const hoopMesh = new THREE.Mesh(createHuggieHoopGeometry(0.28, 0.045), metalMat);
            hoopGroup.add(hoopMesh);
            segmentObjects.push(hoopGroup);

            const ringGroup = new THREE.Group();
            const ringMesh = new THREE.Mesh(createJumpRingGeometry(0.1, 0.024), metalMat);
            ringMesh.rotateY(Math.PI / 2);
            ringGroup.add(ringMesh);
            segmentObjects.push(ringGroup);

            const dropGroup = new THREE.Group();
            const collet = new THREE.Mesh(createProngColletGeometry(0.38, 6, 0.22), metalMat);
            dropGroup.add(collet);

            const gem = new THREE.Mesh(createBrilliantCutDiamondGeometry(0.38, 0.14, 0.28), diamondMat);
            dropGroup.add(gem);

            // If chain items are attached below, add connecting eyelet to terminal drop
            if (chainItems.length > 0) {
                const bottomLoop = new THREE.Mesh(createBottomEyeletGeometry(), metalMat);
                bottomLoop.position.y = -0.32;
                bottomLoop.rotateY(Math.PI / 2);
                dropGroup.add(bottomLoop);
            }
            segmentObjects.push(dropGroup);

        } else {
            // 5-Segment Articulated Chain
            // 0: Top Hardware (French Hook, Stud Post, or Ear Wire)
            const topGroup = new THREE.Group();
            const activeHardware = selectedEarringHardware || styleConfig.topHardware || 'hook';
            if (activeHardware === 'hook') {
                const hookMesh = new THREE.Mesh(createFrenchHookGeometry(), metalMat);
                topGroup.add(hookMesh);
            } else if (activeHardware === 'wire') {
                const wireMesh = new THREE.Mesh(createKidneyWireGeometry(), metalMat);
                topGroup.add(wireMesh);
            } else {
                const stud = new THREE.Mesh(createStudHardwareGeometry(), metalMat);
                topGroup.add(stud);

                const studGem = new THREE.Mesh(createBrilliantCutDiamondGeometry(0.14, 0.06, 0.1), diamondMat);
                topGroup.add(studGem);
            }
            segmentObjects.push(topGroup);

            // 1: Top Jump Ring
            const ring1Group = new THREE.Group();
            const ring1Mesh = new THREE.Mesh(createJumpRingGeometry(0.09, 0.022), metalMat);
            ring1Mesh.rotateY(Math.PI / 2);
            ring1Group.add(ring1Mesh);
            segmentObjects.push(ring1Group);

            // 2: Middle Charm (Larimar Cabochon or Gemstone)
            const midGroup = new THREE.Group();
            const bezel = new THREE.Mesh(createConnectorBezelSettingGeometry(0.38, 0.32, 0.14), metalMat);
            midGroup.add(bezel);

            if (styleConfig.middleType === 'larimar') {
                const cab = new THREE.Mesh(createCabochonGeometry(0.36, 0.16), larimarMat);
                cab.rotateX(Math.PI / 2);
                midGroup.add(cab);
            } else {
                const gem = new THREE.Mesh(createBrilliantCutDiamondGeometry(0.35, 0.12, 0.24), getGemMaterial(styleConfig.middleType));
                midGroup.add(gem);
            }
            segmentObjects.push(midGroup);

            // 3: Lower Jump Ring
            const ring2Group = new THREE.Group();
            const ring2Mesh = new THREE.Mesh(createJumpRingGeometry(0.09, 0.022), metalMat);
            ring2Mesh.rotateY(Math.PI / 2);
            ring2Group.add(ring2Mesh);
            segmentObjects.push(ring2Group);

            // 4: Terminal Drop (Baroque Keshi Pearl or Briolette Gemstone)
            const dropGroup = new THREE.Group();
            if (styleConfig.dropType === 'sapphire-briolette') {
                const briolette = new THREE.Mesh(createPearBrioletteCutGeometry(0.38, 0.95), sapphireMat);
                dropGroup.add(briolette);

                const cap = new THREE.Mesh(createProngColletGeometry(0.24, 4, 0.14), metalMat);
                cap.position.y = 0.45;
                dropGroup.add(cap);
            } else {
                const pearlSeed = side === 'left' ? 1.0 : 2.5;
                const pearl = new THREE.Mesh(createBaroquePearlGeometry(0.42, 1.45, pearlSeed), pearlMat);
                dropGroup.add(pearl);

                const cap = new THREE.Mesh(createProngColletGeometry(0.28, 4, 0.16), metalMat);
                cap.position.y = 0.52;
                dropGroup.add(cap);
            }

            // If chained, add linking bottom eyelet to allow continuous cascading
            if (chainItems.length > 0) {
                const bottomLoop = new THREE.Mesh(createBottomEyeletGeometry(), metalMat);
                bottomLoop.position.y = -0.58;
                bottomLoop.rotateY(Math.PI / 2);
                dropGroup.add(bottomLoop);
            }
            segmentObjects.push(dropGroup);
        }

        // ====================================================================
        // DYNAMIC EXTENSION: CHAIN ITEMS (Jump Ring + Stone for each attached tier)
        // ====================================================================
        chainItems.forEach((stoneId, tierIdx) => {
            const isLast = tierIdx === chainItems.length - 1;

            // 1. Interlocking Jump Ring
            const linkGroup = new THREE.Group();
            const linkMesh = new THREE.Mesh(createChainLinkTierGeometry(0.085, 0.022), metalMat);
            linkGroup.add(linkMesh);
            segmentObjects.push(linkGroup);

            // 2. Stone / Pearl Tier
            const tierGroup = new THREE.Group();
            const tierMat = createTierMaterial(stoneId);

            // Top bail / cap
            const topCap = new THREE.Mesh(createTierDropCapGeometry(0.22, 0.13), metalMat);
            topCap.position.y = 0.42;
            tierGroup.add(topCap);

            // If not last tier, add bottom eyelet loop for subsequent links
            if (!isLast) {
                const btmLoop = new THREE.Mesh(createBottomEyeletGeometry(), metalMat);
                btmLoop.position.y = -0.48;
                btmLoop.rotateY(Math.PI / 2);
                tierGroup.add(btmLoop);
            }

            // Stone Mesh
            let stoneMesh;
            if (stoneId === 'akoya_pearl') {
                stoneMesh = new THREE.Mesh(createAkoyaPearlGeometry(0.36), tierMat);
            } else if (stoneId === 'ruby_briolette' || stoneId === 'sapphire-briolette') {
                stoneMesh = new THREE.Mesh(createPearBrioletteCutGeometry(0.36, 0.88), tierMat);
            } else if (stoneId === 'amethyst' || stoneId === 'emerald' || stoneId === 'diamond' || stoneId === '1st_stone') {
                stoneMesh = new THREE.Mesh(createBrilliantCutDiamondGeometry(0.36, 0.13, 0.25), tierMat);
            } else if (stoneId === 'jade') {
                stoneMesh = new THREE.Mesh(createCabochonGeometry(0.35, 0.16), tierMat);
                stoneMesh.rotateX(Math.PI / 2);
            } else {
                // Tahitian, Golden, Pink Keshi, Freshwater Pearls
                const pearlSeed = (side === 'left' ? 1.2 : 2.7) + (tierIdx + 1) * 1.3;
                stoneMesh = new THREE.Mesh(createBaroquePearlGeometry(0.38, 1.38, pearlSeed), tierMat);
            }
            tierGroup.add(stoneMesh);
            segmentObjects.push(tierGroup);
        });

        return segmentObjects;
    }, []);

    // ========================================================================
    // INITIALIZE SCENE
    // ========================================================================
    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        const w = container.clientWidth || 800;
        const h = container.clientHeight || 700;

        // 1. Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const isMobile = window.innerWidth <= 768;
        const aspect = w / h;
        // On portrait mobile screens (aspect < 1.0), use a wider FOV so earrings never get cropped horizontally
        const fov = aspect < 1.0 ? 46 : 36;
        const camZ = aspect < 1.0 ? 10.5 : 9.2;

        // 2. Camera (Flattering jewelry telephoto FOV)
        const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 40);
        camera.position.set(0, 1.4, camZ);
        cameraRef.current = camera;
        prevCameraPosRef.current.copy(camera.position);

        // 3. Renderer (Smooth performance, zero shadow overhead)
        const renderer = new THREE.WebGLRenderer({
            antialias: !isMobile,
            alpha: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true
        });
        renderer.setSize(w, h);
        renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.75));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = false;
        rendererRef.current = renderer;

        const domElement = renderer.domElement;
        domElement.className = 'three-earrings-canvas';
        container.innerHTML = '';
        container.appendChild(domElement);
        canvasRef.current = domElement;

        if (onCanvasReady) {
            onCanvasReady(canvasRef);
        }

        // 4. OrbitControls
        const controls = new OrbitControls(camera, domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.minDistance = 2.5;
        controls.maxDistance = 14.0;
        controls.minPolarAngle = 0.2;
        controls.maxPolarAngle = Math.PI * 0.51;
        controls.target.set(0, 1.1, 0);
        controlsRef.current = controls;

        // 5. Studio Lighting & Procedural Reflection Environment
        setupStudioSceneLighting(scene, renderer, selectedBackdrop);

        // 6. Atelier Stand (No harsh shadows)
        const standMat = createAtelierStandMaterial();
        const standGeo = createAtelierDisplayStandGeometry();
        const standMesh = new THREE.Mesh(standGeo, standMat);
        scene.add(standMesh);

        // 7. Initialize Physics & Earrings
        const styleConfig = EARRING_STYLES[activeStyle] || EARRING_STYLES['baroque-larimar'];
        const segmentsConfig = getEarringSegmentsConfig(styleConfig, attachedChain);

        const leftAnchor = new THREE.Vector3(-1.4, 2.45, 0);
        const rightAnchor = new THREE.Vector3(1.4, 2.45, 0);

        const leftPhysics = new EarringPhysicsSystem(leftAnchor, segmentsConfig);
        const rightPhysics = new EarringPhysicsSystem(rightAnchor, segmentsConfig);
        leftPhysicsRef.current = leftPhysics;
        rightPhysicsRef.current = rightPhysics;

        const leftMeshes = buildEarringAssembly(styleConfig, selectedMetal, 'left', attachedChain);
        const rightMeshes = buildEarringAssembly(styleConfig, selectedMetal, 'right', attachedChain);

        leftMeshes.forEach(m => scene.add(m));
        rightMeshes.forEach(m => scene.add(m));

        leftMeshesRef.current = leftMeshes;
        rightMeshesRef.current = rightMeshes;

        // Glowing 3D Magnetic Snap Targets for Drag-and-Drop
        const snapMat = new THREE.MeshBasicMaterial({
            color: 0x38e8ff,
            transparent: true,
            opacity: 0.9,
            wireframe: false
        });
        const snapGeo = new THREE.TorusGeometry(0.18, 0.024, 10, 24);
        const snapLeft = new THREE.Mesh(snapGeo, snapMat);
        const snapRight = new THREE.Mesh(snapGeo, snapMat);
        snapLeft.visible = false;
        snapRight.visible = false;
        scene.add(snapLeft);
        scene.add(snapRight);
        snapRingLeftRef.current = snapLeft;
        snapRingRightRef.current = snapRight;

        // Subtle initial settling impulse
        leftPhysics.applyImpulse(new THREE.Vector3(0.4, 0, 0.2));
        rightPhysics.applyImpulse(new THREE.Vector3(-0.4, 0, -0.2));

        // 8. Animation & Physics Loop
        let lastTime = performance.now();

        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);

            try {
                const now = performance.now();
                const dt = Math.min((now - lastTime) / 1000, 0.04);
                lastTime = now;

                // Auto-orbit
                if (isAutoOrbit && controlsRef.current) {
                    controlsRef.current.autoRotate = true;
                    controlsRef.current.autoRotateSpeed = 1.2;
                } else if (controlsRef.current) {
                    controlsRef.current.autoRotate = false;
                }

                // Camera inertia sway
                const camPos = camera.position;
                const camDeltaX = camPos.x - prevCameraPosRef.current.x;
                const camDeltaZ = camPos.z - prevCameraPosRef.current.z;
                if (Math.abs(camDeltaX) > 0.001 || Math.abs(camDeltaZ) > 0.001) {
                    leftPhysics.applyImpulse(new THREE.Vector3(-camDeltaX * 4.0, 0, -camDeltaZ * 4.0));
                    rightPhysics.applyImpulse(new THREE.Vector3(-camDeltaX * 4.0, 0, -camDeltaZ * 4.0));
                }
                prevCameraPosRef.current.copy(camPos);

                // Step Physics
                leftPhysics.step(dt);
                rightPhysics.step(dt);

                // Sync Scene
                leftPhysics.syncScene(leftMeshesRef.current);
                rightPhysics.syncScene(rightMeshesRef.current);

                // Magnetic snap indicators during drag
                if (snapRingLeftRef.current && leftPhysicsRef.current) {
                    snapRingLeftRef.current.visible = isDragOverCanvasRef.current;
                    if (isDragOverCanvasRef.current) {
                        snapRingLeftRef.current.position.copy(leftPhysicsRef.current.getTerminalPosition());
                        snapRingLeftRef.current.rotation.y += 0.05;
                        snapRingLeftRef.current.rotation.x = Math.PI / 2;
                    }
                }
                if (snapRingRightRef.current && rightPhysicsRef.current) {
                    snapRingRightRef.current.visible = isDragOverCanvasRef.current;
                    if (isDragOverCanvasRef.current) {
                        snapRingRightRef.current.position.copy(rightPhysicsRef.current.getTerminalPosition());
                        snapRingRightRef.current.rotation.y += 0.05;
                        snapRingRightRef.current.rotation.x = Math.PI / 2;
                    }
                }

                controls.update();
                renderer.render(scene, camera);
            } catch (err) {
                console.error("3D Studio Animate Error:", err);
            }
        };

        animate();

        // 9. Resize Handling
        const handleResize = () => {
            if (!container) return;
            const newW = container.clientWidth;
            const newH = container.clientHeight;
            if (newW === 0 || newH === 0) return;

            const newAspect = newW / newH;
            camera.fov = newAspect < 1.0 ? 46 : 36;
            camera.aspect = newAspect;
            camera.position.z = newAspect < 1.0 ? 10.5 : 9.2;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            resizeObserver.disconnect();
            renderer.dispose();
            if (container.contains(domElement)) {
                container.removeChild(domElement);
            }
        };
    }, [activeStyle, buildEarringAssembly]);

    // Update metal, style or attached chain without rebuilding entire scene
    useEffect(() => {
        if (!sceneRef.current) return;
        const styleConfig = EARRING_STYLES[activeStyle] || EARRING_STYLES['baroque-larimar'];

        leftMeshesRef.current.forEach(m => sceneRef.current.remove(m));
        rightMeshesRef.current.forEach(m => sceneRef.current.remove(m));

        const leftMeshes = buildEarringAssembly(styleConfig, selectedMetal, 'left', attachedChain);
        const rightMeshes = buildEarringAssembly(styleConfig, selectedMetal, 'right', attachedChain);

        leftMeshes.forEach(m => sceneRef.current.add(m));
        rightMeshes.forEach(m => sceneRef.current.add(m));

        leftMeshesRef.current = leftMeshes;
        rightMeshesRef.current = rightMeshes;

        const segs = getEarringSegmentsConfig(styleConfig, attachedChain);
        if (leftPhysicsRef.current) leftPhysicsRef.current.updateChain(segs);
        if (rightPhysicsRef.current) rightPhysicsRef.current.updateChain(segs);

        // Gentle physical settling impulse
        if (leftPhysicsRef.current) leftPhysicsRef.current.applyImpulse(new THREE.Vector3(0.5, 0, 0.3));
        if (rightPhysicsRef.current) rightPhysicsRef.current.applyImpulse(new THREE.Vector3(-0.5, 0, -0.3));
    }, [selectedMetal, activeStyle, attachedChain, selectedEarringHardware, buildEarringAssembly]);

    // Breeze update
    useEffect(() => {
        const factor = breezeLevel === 0 ? 0.0 : breezeLevel === 1 ? 0.5 : 1.2;
        if (leftPhysicsRef.current) leftPhysicsRef.current.setBreeze(factor);
        if (rightPhysicsRef.current) rightPhysicsRef.current.setBreeze(factor);
    }, [breezeLevel]);

    // Backdrop update
    useEffect(() => {
        if (!sceneRef.current || !rendererRef.current) return;
        setupStudioSceneLighting(sceneRef.current, rendererRef.current, selectedBackdrop);
    }, [selectedBackdrop]);

    // Mouse & Touch interactions
    const updatePointerCoords = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mousePosRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mousePosRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        updatePointerCoords(e);

        const camera = cameraRef.current;
        if (!camera) return;

        raycasterRef.current.setFromCamera(mousePosRef.current, camera);

        const leftIdx = leftPhysicsRef.current ? leftPhysicsRef.current.hitTest(raycasterRef.current, camera) : -1;
        if (leftIdx > 0) {
            leftPhysicsRef.current.startDrag(leftIdx, raycasterRef.current, camera);
            activeDraggingSystemRef.current = leftPhysicsRef.current;
            if (controlsRef.current) controlsRef.current.enabled = false;
            return;
        }

        const rightIdx = rightPhysicsRef.current ? rightPhysicsRef.current.hitTest(raycasterRef.current, camera) : -1;
        if (rightIdx > 0) {
            rightPhysicsRef.current.startDrag(rightIdx, raycasterRef.current, camera);
            activeDraggingSystemRef.current = rightPhysicsRef.current;
            if (controlsRef.current) controlsRef.current.enabled = false;
            return;
        }
    };

    const handlePointerMove = (e) => {
        updatePointerCoords(e);
        const camera = cameraRef.current;
        if (!camera) return;

        raycasterRef.current.setFromCamera(mousePosRef.current, camera);

        if (activeDraggingSystemRef.current) {
            activeDraggingSystemRef.current.updateDrag(raycasterRef.current);
            return;
        }

        const leftHit = leftPhysicsRef.current ? leftPhysicsRef.current.hitTest(raycasterRef.current, camera) : -1;
        const rightHit = rightPhysicsRef.current ? rightPhysicsRef.current.hitTest(raycasterRef.current, camera) : -1;
        setIsHoveredEarring(leftHit > 0 || rightHit > 0);
    };

    const handlePointerUp = () => {
        if (activeDraggingSystemRef.current) {
            activeDraggingSystemRef.current.endDrag();
            activeDraggingSystemRef.current = null;
        }
        if (controlsRef.current) {
            controlsRef.current.enabled = true;
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        isDragOverCanvasRef.current = true;
        if (!isDragOverCanvas) {
            setIsDragOverCanvas(true);
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        isDragOverCanvasRef.current = true;
        setIsDragOverCanvas(true);
    };

    const handleDragLeave = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        isDragOverCanvasRef.current = false;
        setIsDragOverCanvas(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        isDragOverCanvasRef.current = false;
        setIsDragOverCanvas(false);

        try {
            const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
            if (!raw) return;
            let parsed = null;
            try {
                parsed = JSON.parse(raw);
            } catch (err) {
                parsed = { id: raw, name: raw };
            }

            const stoneId = parsed?.id;
            if (stoneId && onAttachStone) {
                onAttachStone(stoneId);
                const comp = COMPONENTS.find(c => c.id === stoneId);
                triggerToast(`Attached ${comp?.name || parsed?.name || 'Pearl/Stone'} to earring chain ✨`);
                if (leftPhysicsRef.current) leftPhysicsRef.current.applyImpulse(new THREE.Vector3(0.6, 0, 0.4));
                if (rightPhysicsRef.current) rightPhysicsRef.current.applyImpulse(new THREE.Vector3(-0.6, 0, -0.4));
            }
        } catch (err) {
            console.error("Drop Error:", err);
        }
    };

    const handleSwayImpulse = () => {
        if (leftPhysicsRef.current) leftPhysicsRef.current.applyImpulse(new THREE.Vector3(1.2, 0, 0.7));
        if (rightPhysicsRef.current) rightPhysicsRef.current.applyImpulse(new THREE.Vector3(-1.2, 0, -0.7));
    };

    const setCameraPreset = (preset) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;

        setViewMode(preset);

        if (preset === 'pair') {
            camera.position.set(0, 1.4, 9.2);
            controls.target.set(0, 1.1, 0);
        } else if (preset === 'macro-left') {
            camera.position.set(-1.4, 1.4, 3.2);
            controls.target.set(-1.4, 1.3, 0);
        } else if (preset === 'macro-right') {
            camera.position.set(1.4, 1.4, 3.2);
            controls.target.set(1.4, 1.3, 0);
        }
    };

    return (
        <div className="three-earrings-viewport" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* WebGL Canvas Container */}
            <div
                ref={mountRef}
                className={`three-canvas-container ${isDragOverCanvas ? 'drag-over-active' : ''}`}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    cursor: activeDraggingSystemRef.current ? 'grabbing' : isHoveredEarring ? 'grab' : 'default'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            />

            {/* Visual Snap Drop Overlay */}
            {isDragOverCanvas && (
                <div className="canvas-drag-snap-overlay">
                    <div className="drag-snap-card">
                        <div className="snap-pulse-badge">✨</div>
                        <div className="snap-text-title">Release to Attach Chain</div>
                        <div className="snap-text-sub">Connecting with precious jump ring to last stone</div>
                    </div>
                </div>
            )}

            {/* Floating Feedback Toast */}
            {toastMessage && (
                <div className="hud-toast-notification">
                    <span className="toast-icon">✨</span>
                    <span className="toast-text">{toastMessage}</span>
                </div>
            )}

            {/* HUD Overlay */}
            <div className="three-earrings-hud">
                <div className="hud-top-bar">
                    <div className="hud-badge physics-active">
                        <span className="pulse-dot" />
                        <span>60 FPS Real-Time Physics</span>
                    </div>

                    {attachedChain.length > 0 && (
                        <div className="hud-badge chain-active">
                            <span>⛓️ Cascade: {attachedChain.length} {attachedChain.length === 1 ? 'Tier' : 'Tiers'}</span>
                        </div>
                    )}

                    <div className="hud-hint">
                        🖐️ Drag stones from sidebar into preview to chain, or flick earring!
                    </div>
                </div>

                <div className="hud-bottom-toolbar">
                    <button
                        type="button"
                        className="hud-action-btn"
                        onClick={handleSwayImpulse}
                        title="Give earrings a physical push"
                    >
                        <span className="btn-icon">💫</span>
                        <span className="btn-text">Sway Earrings</span>
                    </button>

                    <button
                        type="button"
                        className={`hud-action-btn ${breezeLevel > 0 ? 'active' : ''}`}
                        onClick={() => setBreezeLevel(prev => (prev + 1) % 3)}
                        title="Toggle studio breeze"
                    >
                        <span className="btn-icon">🌬️</span>
                        <span className="btn-text">
                            {breezeLevel === 0 ? 'Breeze: Off' : breezeLevel === 1 ? 'Breeze: Gentle' : 'Breeze: Airy'}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`hud-action-btn ${isAutoOrbit ? 'active' : ''}`}
                        onClick={() => setIsAutoOrbit(prev => !prev)}
                        title="Auto-rotate 360° view"
                    >
                        <span className="btn-icon">🔄</span>
                        <span className="btn-text">{isAutoOrbit ? 'Rotating' : 'Auto Orbit'}</span>
                    </button>

                    {attachedChain.length > 0 && (
                        <>
                            <button
                                type="button"
                                className="hud-action-btn danger-hover"
                                onClick={onRemoveLastStone}
                                title="Undo the last attached tier"
                            >
                                <span className="btn-icon">↩</span>
                                <span className="btn-text">Undo Tier</span>
                            </button>

                            <button
                                type="button"
                                className="hud-action-btn danger-hover"
                                onClick={onResetChain}
                                title="Reset earring to base silhouette"
                            >
                                <span className="btn-icon">✕</span>
                                <span className="btn-text">Reset Chain</span>
                            </button>
                        </>
                    )}

                    <div className="hud-button-group">
                        <button
                            type="button"
                            className={`hud-group-btn ${viewMode === 'pair' ? 'active' : ''}`}
                            onClick={() => setCameraPreset('pair')}
                        >
                            Pair
                        </button>
                        <button
                            type="button"
                            className={`hud-group-btn ${viewMode === 'macro-left' ? 'active' : ''}`}
                            onClick={() => setCameraPreset('macro-left')}
                        >
                            Macro Left
                        </button>
                        <button
                            type="button"
                            className={`hud-group-btn ${viewMode === 'macro-right' ? 'active' : ''}`}
                            onClick={() => setCameraPreset('macro-right')}
                        >
                            Macro Right
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Earrings3DStudio;
