import React, { useEffect, useRef, useState, useCallback } from "react";
import { COMPONENTS, METALS, CHAIN_STYLES, BACKDROPS } from "../data/jewelryData";
import { getPointOnLayout, getAngleFromPoint, isClickNearEllipse } from "../utils/geometry";
import { Earring2DPhysicsSystem } from "../utils/earrings2DPhysics";
import {
    drawPhotorealisticChain,
    drawLuxuryClaspAndEndCaps,
    drawLuxuryEarringStud,
    drawFrenchEarHook,
    drawEarPost,
    drawEarWire,
    drawArticulatedJumpRing,
    drawProngLarimarCabochon,
    drawProngKeshiPearl,
    drawProngBaroqueCoinPearl,
    drawCustomTierElement,
    drawJumpRingAndBail,
    drawSparkle,
    sampleEquidistantEllipse,
    sampleEquidistantBezier,
    drawLuxuryBackdrop,
    LUXURY_METALS
} from "../utils/photorealisticRenderer";

// Global image cache to eliminate re-fetching
const imageCache = new Map();

const loadImage = async (src) => {
    if (imageCache.has(src)) {
        return imageCache.get(src);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            imageCache.set(src, img);
            resolve(img);
        };
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });
};

/**
 * Configure articulated drop segments based on selected atelier style and attached tiers
 */
const get2DEarringSegments = (styleKey = 'baroque-larimar', chainItems = [], configItems = []) => {
    const rawTiers = chainItems.length > 0
        ? chainItems
        : configItems.filter(c => c.id).map(c => c.id);

    // Each tier pearl has radius 14px.
    const tiers = rawTiers.map((id, idx) => ({
        type: 'tier',
        id,
        // First tier hangs below Baroque Coin (length = 45). Subsequent tiers (length = 33).
        length: idx === 0 ? 45 : 33,
        mass: 1.05
    }));

    if (styleKey === 'royal-chandelier') {
        return [
            { type: 'diamond-stud', length: 16, mass: 0.5, size: 22 },
            { type: 'sapphire-briolette', length: 36, mass: 0.85, width: 22, height: 36 },
            { type: 'keshi', length: 48, mass: 1.8, width: 24, height: 42 },
            ...tiers
        ];
    }
    if (styleKey === 'solitaire-drop') {
        return [
            { type: 'huggie-link', length: 16, mass: 0.5, size: 22 },
            { type: 'baroque-coin', length: 45, mass: 2.2, width: 46, height: 50 },
            ...tiers
        ];
    }
    if (styleKey === 'amethyst-cascade') {
        return [
            { type: 'amethyst-collet', length: 18, mass: 0.6, size: 26 },
            { type: 'keshi', length: 37, mass: 0.85, width: 22, height: 38 },
            { type: 'baroque-coin', length: 50, mass: 2.2, width: 48, height: 52 },
            ...tiers
        ];
    }
    if (styleKey === 'emerald-cabochon') {
        return [
            { type: 'emerald-collet', length: 18, mass: 0.6, size: 26 },
            { type: 'keshi', length: 37, mass: 0.85, width: 22, height: 38 },
            { type: 'baroque-coin', length: 50, mass: 2.2, width: 48, height: 52 },
            ...tiers
        ];
    }

    // Default 'baroque-larimar' (Fine jewelry reference piece):
    // 1. Hook (r=3.8) -> Larimar (r=13.5): length = 18px
    // 2. Larimar (r=13.5) -> Keshi (hh=19): length = 37px (connected by 1 gold hinge)
    // 3. Keshi (hh=19) -> Baroque Coin (hh=26): length = 50px (connected by 1 gold hinge)
    // Exactly ONE single gold hinge between each pearl, completely uniform 5px clearance!
    return [
        { type: 'larimar', length: 18, mass: 0.6, size: 26 },
        { type: 'keshi', length: 37, mass: 0.85, width: 22, height: 38 },
        { type: 'baroque-coin', length: 50, mass: 2.4, width: 48, height: 52 },
        ...tiers
    ];
};

const CanvasPreview = ({
    variantConfig,
    configuration = [],
    selectedMetal = "gold",
    selectedChainStyle = "cable",
    selectedBackdrop = "velvet-emerald",
    selectedEarringStyle = "baroque-larimar",
    selectedEarringHardware = "hook",
    earringChain = [],
    onAttachEarringStone,
    onCanvasReady,
    calibration,
    onCanvasClick,
    onDrop,
    onItemMove,
    onItemRotate,
    onItemMirror
}) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);

    const isEarring = variantConfig?.type === 'earrings';

    const [previewAngle, setPreviewAngle] = useState(null);
    const [previewSide, setPreviewSide] = useState('left');
    const [previewColliding, setPreviewColliding] = useState(false);
    const [draggingItem, setDraggingItem] = useState(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 700 });

    // 2D Articulated Physics Systems for Earrings
    const leftPhysicsRef = useRef(null);
    const rightPhysicsRef = useRef(null);
    const activePhysicsDraggingRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const lastAnimTimeRef = useRef(performance.now());

    // Rotation state (for necklace/bracelet)
    const rotatingItemRef = useRef(null);
    const rotateStartXRef = useRef(0);
    const rotateStartRotationRef = useRef(0);
    const isRotatingRef = useRef(false);

    // Long-press & mobile gestures
    const longPressTimerRef = useRef(null);
    const longPressTouchRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const lastTapTimeRef = useRef(0);
    const lastTapItemRef = useRef(null);

    const getLayout = useCallback(() => {
        const layout = { ...variantConfig.layout };
        if (calibration) {
            layout.radiusX = calibration.radiusX;
            layout.radiusY = calibration.radiusY;
            const radOffset = (calibration.rotation * Math.PI) / 180;
            layout.startAngle += radOffset;
            layout.endAngle += radOffset;
        }
        return layout;
    }, [variantConfig, calibration]);

    // Precise screen-to-design coordinate transform
    const getCanvasCoordinates = useCallback((e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        const designW = variantConfig.dimensions.width;  // 500
        const designH = variantConfig.dimensions.height; // 500

        const scale = Math.min(cw / designW, ch / designH) * 0.88;
        const offsetX = (cw - designW * scale) / 2;
        const offsetY = (ch - designH * scale) / 2;

        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        const x = (screenX - offsetX) / scale;
        const y = (screenY - offsetY) / scale;
        return { x, y };
    }, [variantConfig]);

    const getTouchCanvasCoordinates = useCallback((touch, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        const designW = variantConfig.dimensions.width;
        const designH = variantConfig.dimensions.height;

        const scale = Math.min(cw / designW, ch / designH) * 0.88;
        const offsetX = (cw - designW * scale) / 2;
        const offsetY = (ch - designH * scale) / 2;

        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;

        const x = (screenX - offsetX) / scale;
        const y = (screenY - offsetY) / scale;
        return { x, y };
    }, [variantConfig]);

    const findItemAtPosition = useCallback((x, y) => {
        const layout = getLayout();
        const CLICK_THRESHOLD = 30;
        for (let item of configuration) {
            const pos = getPointOnLayout(item.angle, layout, item.side || 'left');
            const dist = Math.hypot(x - pos.x, y - pos.y);
            if (dist < CLICK_THRESHOLD) {
                return item;
            }
        }
        return null;
    }, [configuration, getLayout]);

    const checkCollision = useCallback((angle, side = 'left', excludeUuid = null) => {
        const layout = getLayout();
        const newPos = getPointOnLayout(angle, layout, side);
        const MIN_GAP = 30;

        return configuration.some(item => {
            if (excludeUuid && item.uuid === excludeUuid) return false;
            if (layout.type === 'dual-earring' && (item.side || 'left') !== side) return false;

            const existingPos = getPointOnLayout(item.angle, layout, item.side || 'left');
            const dist = Math.hypot(newPos.x - existingPos.x, newPos.y - existingPos.y);
            return dist < MIN_GAP;
        });
    }, [configuration, getLayout]);

    // Preload tier images
    useEffect(() => {
        if (!earringChain || earringChain.length === 0) return;
        earringChain.forEach(id => {
            const comp = COMPONENTS.find(c => c.id === id);
            if (comp && comp.image) {
                loadImage(comp.image).catch(() => {});
            }
        });
    }, [earringChain]);

    // Initialize & sync 2D Earring Physics Systems
    useEffect(() => {
        if (!isEarring) return;

        const layout = getLayout();
        const leftAnchor = layout.leftCenter || { x: 165, y: 75 };
        const rightAnchor = layout.rightCenter || { x: 335, y: 75 };

        const segments = get2DEarringSegments(selectedEarringStyle, earringChain, configuration);

        if (!leftPhysicsRef.current) {
            leftPhysicsRef.current = new Earring2DPhysicsSystem(leftAnchor, segments);
            leftPhysicsRef.current.phaseOffset = 0;
        } else {
            leftPhysicsRef.current.setAnchor(leftAnchor.x, leftAnchor.y);
            leftPhysicsRef.current.updateChain(segments);
        }

        if (!rightPhysicsRef.current) {
            rightPhysicsRef.current = new Earring2DPhysicsSystem(rightAnchor, segments);
            rightPhysicsRef.current.phaseOffset = Math.PI * 0.45; // slight organic phase difference
        } else {
            rightPhysicsRef.current.setAnchor(rightAnchor.x, rightAnchor.y);
            rightPhysicsRef.current.updateChain(segments);
        }
    }, [isEarring, selectedEarringStyle, earringChain, configuration, getLayout]);

    // ResizeObserver: tracks the container size
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setCanvasSize({ width: Math.round(width), height: Math.round(height) });
                }
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // ─── Drawing Routine for an Articulated Drop Earring ──────────────────────────
    const drawArticulatedEarring = useCallback((ctx, physics, labelText) => {
        if (!physics) return;

        const anchor = physics.anchor;

        // 1. Top Earring Attachment Hardware (Hook, Post, or Wire)
        if (selectedEarringHardware === 'post') {
            drawEarPost(ctx, anchor.x, anchor.y, 0, selectedMetal);
        } else if (selectedEarringHardware === 'wire') {
            drawEarWire(ctx, anchor.x, anchor.y, 0, selectedMetal);
        } else {
            drawFrenchEarHook(ctx, anchor.x, anchor.y, 0, selectedMetal);
        }

        // 2. Articulated Stones / Pearls
        // Exactly ONE hinge between each pair of pearls (drawn cleanly at the bottom of each pearl).
        // The bottom-most pearl in the chain has NO hinge below it until a new pearl is attached!
        const segments = physics.getSegments();

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const isLast = (i === segments.length - 1);

            // Segment Stone / Pearl (bottom single hinge only drawn if !isLast)
            if (seg.type === 'larimar') {
                drawProngLarimarCabochon(ctx, seg.endX, seg.endY, seg.angle, seg.size || 26, selectedMetal, isLast);
            } else if (seg.type === 'keshi') {
                drawProngKeshiPearl(ctx, seg.endX, seg.endY, seg.angle, seg.width || 22, seg.height || 38, selectedMetal, isLast);
            } else if (seg.type === 'baroque-coin') {
                drawProngBaroqueCoinPearl(ctx, seg.endX, seg.endY, seg.angle, seg.width || 48, seg.height || 52, selectedMetal, isLast);
            } else if (seg.type === 'tier') {
                const compData = COMPONENTS.find(c => c.id === seg.id);
                const img = compData?.image ? imageCache.get(compData.image) : null;
                drawCustomTierElement(ctx, seg.endX, seg.endY, seg.angle, compData, selectedMetal, img, isLast);
            } else if (seg.type === 'diamond-stud') {
                drawProngLarimarCabochon(ctx, seg.endX, seg.endY, seg.angle, seg.size || 22, selectedMetal, isLast);
            } else {
                drawProngLarimarCabochon(ctx, seg.endX, seg.endY, seg.angle, 26, selectedMetal, isLast);
            }
        }

        // 3. Studio Earring Labels
        ctx.save();
        ctx.font = "600 11px Inter, sans-serif";
        ctx.fillStyle = selectedBackdrop.includes("velvet") ? "rgba(255, 255, 255, 0.45)" : "rgba(80, 80, 80, 0.65)";
        ctx.textAlign = "center";
        ctx.letterSpacing = "2px";
        ctx.fillText(labelText, anchor.x, 435);
        ctx.restore();
    }, [selectedMetal, selectedBackdrop, selectedEarringHardware]);

    // ─── Render Frame (Synchronous & Blazing Fast) ──────────────────────────────
    const renderFrame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || canvasSize.width === 0) return;

        const { width: cw, height: ch } = canvasSize;
        const designW = variantConfig.dimensions.width;  // 500
        const designH = variantConfig.dimensions.height; // 500
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

        if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
        }

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cw, ch);

        const layout = getLayout();

        // 1. Luxury Studio Backdrop
        drawLuxuryBackdrop(ctx, cw, ch, selectedBackdrop, layout.type);

        // 2. Center and fit design coordinate space
        const scale = Math.min(cw / designW, ch / designH) * 0.88;
        const offsetX = (cw - designW * scale) / 2;
        const offsetY = (ch - designH * scale) / 2;

        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // 3. Render Articulated Drop Earrings
        if (isEarring) {
            drawArticulatedEarring(ctx, leftPhysicsRef.current, "LEFT EARRING");
            drawArticulatedEarring(ctx, rightPhysicsRef.current, "RIGHT EARRING");

            // Interactive Helper Hint at bottom
            ctx.save();
            ctx.font = "500 11px Inter, sans-serif";
            ctx.fillStyle = selectedBackdrop.includes("velvet") ? "rgba(255, 235, 170, 0.55)" : "rgba(100, 90, 60, 0.65)";
            ctx.textAlign = "center";
            ctx.letterSpacing = "1.2px";
            ctx.fillText("◇ ARTICULATED FINE JEWELRY • TUG PEARLS TO SWING ◇", 250, 468);
            ctx.restore();

            ctx.restore();
            return;
        }

        // 4. Non-Earrings (Necklace / Bracelet)
        const currentMetal = METALS[selectedMetal] || METALS.gold;
        const baseBeadSrc = currentMetal.baseBeadImage || variantConfig.baseBeadImage;
        const baseBeadImg = imageCache.get(baseBeadSrc);

        const linkPitch = selectedChainStyle === 'paperclip' ? 12 : selectedChainStyle === 'rope' ? 6.5 : 7.8;

        if (layout.type === 'necklace-curve') {
            const rightPt = {
                x: layout.centerX + layout.radiusX * Math.cos(layout.startAngle),
                y: layout.centerY + layout.radiusY * Math.sin(layout.startAngle)
            };
            const leftPt = {
                x: layout.centerX + layout.radiusX * Math.cos(layout.endAngle),
                y: layout.centerY + layout.radiusY * Math.sin(layout.endAngle)
            };

            const leftAnchor = { x: layout.centerX - 82, y: 18 };
            const rightAnchor = { x: layout.centerX + 82, y: 18 };

            const leftHangerPts = sampleEquidistantBezier(leftAnchor, { x: layout.centerX - 115, y: 88 }, leftPt, null, linkPitch);
            const rightHangerPts = sampleEquidistantBezier(rightAnchor, { x: layout.centerX + 115, y: 88 }, rightPt, null, linkPitch);

            drawPhotorealisticChain(ctx, leftHangerPts, selectedMetal, selectedChainStyle);
            drawPhotorealisticChain(ctx, rightHangerPts, selectedMetal, selectedChainStyle);

            const mainArcPts = sampleEquidistantEllipse(
                layout.centerX, layout.centerY, layout.radiusX, layout.radiusY,
                layout.startAngle, layout.endAngle, linkPitch
            );
            drawPhotorealisticChain(ctx, mainArcPts, selectedMetal, selectedChainStyle);
            drawLuxuryClaspAndEndCaps(ctx, leftAnchor, rightAnchor, selectedMetal);

        } else {
            // Bracelet
            const braceletPts = sampleEquidistantEllipse(
                layout.centerX, layout.centerY, layout.radiusX, layout.radiusY,
                0, Math.PI * 2, linkPitch
            );
            drawPhotorealisticChain(ctx, braceletPts, selectedMetal, selectedChainStyle);
            drawLuxuryClaspAndEndCaps(
                ctx,
                { x: layout.centerX - 9, y: layout.centerY - layout.radiusY },
                { x: layout.centerX + 9, y: layout.centerY - layout.radiusY },
                selectedMetal
            );
        }

        // Draw placed beads for necklace & bracelet
        const positions = configuration.map(item => ({
            ...item,
            ...getPointOnLayout(item.angle, layout, item.side || 'left')
        }));

        positions.sort((a, b) => a.y - b.y);

        positions.forEach(item => {
            const compData = item.id ? COMPONENTS.find(c => c.id === item.id) : null;
            const img = (compData?.image ? imageCache.get(compData.image) : baseBeadImg) || baseBeadImg;
            const size = compData ? compData.width : 30;
            const isBaseBead = !compData;

            if (!img) return;

            ctx.save();
            ctx.translate(item.x, item.y);

            // Drop shadow
            ctx.save();
            ctx.beginPath();
            ctx.arc(3.5, 7.5, size * 0.44, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
            ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 6;
            ctx.fill();
            ctx.restore();

            // Item body
            ctx.save();
            ctx.rotate(item.rotation || 0);
            if (item.mirrored) ctx.scale(-1, 1);

            if (isBaseBead) {
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.clip();
                if (selectedMetal === "roseGold") {
                    ctx.filter = "hue-rotate(330deg) saturate(1.15) brightness(1.05)";
                }
            }

            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();

            drawJumpRingAndBail(ctx, 0, 0, item.angle, selectedMetal, isBaseBead);
            if (!isBaseBead) {
                drawSparkle(ctx, -size * 0.25, -size * 0.25, 6, "#FFFFFF");
            }
            ctx.restore();
        });

        // Snap preview for necklace/bracelet
        if (previewAngle !== null) {
            const snapPos = getPointOnLayout(previewAngle, layout, previewSide);
            const center = { x: layout.centerX, y: layout.centerY };

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(snapPos.x, snapPos.y);
            ctx.strokeStyle = previewColliding ? 'rgba(235, 75, 75, 0.7)' : 'rgba(255, 235, 170, 0.6)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.arc(snapPos.x, snapPos.y, 16, 0, Math.PI * 2);
            ctx.strokeStyle = previewColliding ? 'rgba(235, 75, 75, 0.85)' : 'rgba(255, 225, 130, 0.85)';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }, [
        canvasSize, variantConfig, getLayout, selectedBackdrop, isEarring,
        selectedMetal, selectedChainStyle, configuration, previewAngle, previewSide,
        previewColliding, drawArticulatedEarring
    ]);

    // ─── Animation Loop (Continuous for Live 2D Physics) ──────────────────────────
    useEffect(() => {
        let active = true;

        const loop = (timestamp) => {
            if (!active) return;

            const dt = (timestamp - lastAnimTimeRef.current) / 1000;
            lastAnimTimeRef.current = timestamp;

            if (isEarring) {
                leftPhysicsRef.current?.step(dt);
                rightPhysicsRef.current?.step(dt);
            }

            renderFrame();

            // Earring mode runs continuous 60 FPS physics loop; others only redraw when needed
            if (isEarring || activePhysicsDraggingRef.current) {
                animationFrameIdRef.current = requestAnimationFrame(loop);
            }
        };

        lastAnimTimeRef.current = performance.now();

        if (isEarring) {
            animationFrameIdRef.current = requestAnimationFrame(loop);
        } else {
            renderFrame();
        }

        return () => {
            active = false;
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, [isEarring, renderFrame]);

    useEffect(() => {
        if (onCanvasReady) {
            onCanvasReady(canvasRef);
        }
    }, [onCanvasReady]);

    // ─── Interaction Handlers (Mouse & Touch) ──────────────────────────────────
    const handleDragOver = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (isEarring) {
            e.dataTransfer.dropEffect = "copy";
            return;
        }

        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();
        const nearInfo = isClickNearEllipse(x, y, layout, 50);

        if (nearInfo.isNear) {
            const side = nearInfo.side || 'left';
            const center = nearInfo.center;
            const angle = getAngleFromPoint(x, y, center.x, center.y);
            const isColliding = checkCollision(angle, side);

            setPreviewAngle(angle);
            setPreviewSide(side);
            setPreviewColliding(isColliding);
        } else {
            setPreviewAngle(null);
            setPreviewColliding(false);
        }
    };

    const handleDragLeave = () => {
        setPreviewAngle(null);
        setPreviewColliding(false);
    };

    const handleDropEvent = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        setPreviewAngle(null);
        setPreviewColliding(false);

        try {
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) return;
            const data = JSON.parse(raw);

            if (isEarring) {
                if (data && data.id && onAttachEarringStone) {
                    onAttachEarringStone(data.id);
                    // Add lively physical impulse on attachment!
                    leftPhysicsRef.current?.applyImpulse((Math.random() - 0.5) * 60, -20);
                    rightPhysicsRef.current?.applyImpulse((Math.random() - 0.5) * 60, -20);
                }
                return;
            }

            const { x, y } = getCanvasCoordinates(e, canvas);
            const layout = getLayout();
            const nearInfo = isClickNearEllipse(x, y, layout, 50);
            if (!nearInfo.isNear) return;

            const side = nearInfo.side || 'left';
            const center = nearInfo.center;
            const angle = getAngleFromPoint(x, y, center.x, center.y);

            if (!checkCollision(angle, side) && onDrop) {
                onDrop({ id: data.id, angle, side });
            }
        } catch (err) {
            console.error("Drop failed", err);
        }
    };

    const handleMouseDown = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);

        // 2D Earring Physics Grab
        if (isEarring && e.button === 0) {
            const grabDist = 52;
            if (leftPhysicsRef.current && leftPhysicsRef.current.grabNodeAt(x, y, grabDist)) {
                activePhysicsDraggingRef.current = leftPhysicsRef.current;
                setDraggingItem('left-earring');
                return;
            }
            if (rightPhysicsRef.current && rightPhysicsRef.current.grabNodeAt(x, y, grabDist)) {
                activePhysicsDraggingRef.current = rightPhysicsRef.current;
                setDraggingItem('right-earring');
                return;
            }
            return;
        }

        // Right-click: stone rotation (Necklace & Bracelet)
        if (e.button === 2) {
            const clickedItem = findItemAtPosition(x, y);
            if (clickedItem && clickedItem.id) {
                isRotatingRef.current = true;
                rotatingItemRef.current = clickedItem.uuid;
                rotateStartXRef.current = e.clientX;
                rotateStartRotationRef.current = clickedItem.rotation || 0;
                onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
            }
            return;
        }

        // Left-click: drag/select (Necklace & Bracelet)
        if (e.button === 0) {
            const clickedItem = findItemAtPosition(x, y);
            if (clickedItem) {
                setDraggingItem(clickedItem.uuid);
                onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
            }
        }
    };

    const handleMouseMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Earring Live Physics Drag
        if (isEarring) {
            if (activePhysicsDraggingRef.current) {
                const { x, y } = getCanvasCoordinates(e, canvas);
                activePhysicsDraggingRef.current.updateDrag(x, y);
            }
            return;
        }

        // Rotation
        if (isRotatingRef.current && rotatingItemRef.current && onItemRotate) {
            const deltaX = e.clientX - rotateStartXRef.current;
            const newRotation = rotateStartRotationRef.current + (deltaX * 0.01);
            onItemRotate(rotatingItemRef.current, newRotation);
            return;
        }

        // Drag along necklace / bracelet curve
        if (!draggingItem || !onItemMove) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();
        const angle = getAngleFromPoint(x, y, layout.centerX, layout.centerY);

        if (layout.type === 'necklace-curve') {
            if (angle < layout.startAngle || angle > layout.endAngle) return;
        }

        if (!checkCollision(angle, 'left', draggingItem)) {
            onItemMove(draggingItem, angle);
        }
    };

    const handleMouseUp = () => {
        // Earring Physics Release
        if (isEarring && activePhysicsDraggingRef.current) {
            activePhysicsDraggingRef.current.releaseGrab();
            activePhysicsDraggingRef.current = null;
            setDraggingItem(null);
            return;
        }

        if (isRotatingRef.current) {
            isRotatingRef.current = false;
            rotatingItemRef.current = null;
        }
        if (draggingItem) {
            setDraggingItem(null);
        }
    };

    const handleCanvasClickEvent = (e) => {
        if (isEarring) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const clickedItem = findItemAtPosition(x, y);

        if (clickedItem) {
            onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
        } else {
            const layout = getLayout();
            const nearInfo = isClickNearEllipse(x, y, layout, 40);
            if (nearInfo.isNear) {
                const side = nearInfo.side || 'left';
                const center = nearInfo.center;
                const angle = getAngleFromPoint(x, y, center.x, center.y);

                if (layout.type === 'necklace-curve') {
                    if (angle < layout.startAngle || angle > layout.endAngle) return;
                }

                if (!checkCollision(angle, side)) {
                    onCanvasClick({ type: 'add', angle, side });
                }
            }
        }
    };

    const handleDoubleClick = (e) => {
        if (isEarring) {
            // Double click on earrings to give a gentle playful nudge!
            leftPhysicsRef.current?.applyImpulse(45, -15);
            rightPhysicsRef.current?.applyImpulse(-45, -15);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const clickedItem = findItemAtPosition(x, y);

        if (clickedItem && clickedItem.id && onItemMirror) {
            onItemMirror(clickedItem.uuid);
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
    };

    // ─── Touch Handlers ───────────────────────────────────────────────────────
    const handleTouchStart = (e) => {
        const canvas = canvasRef.current;
        if (!canvas || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const { x, y } = getTouchCanvasCoordinates(touch, canvas);

        if (isEarring) {
            const grabDist = 55;
            if (leftPhysicsRef.current && leftPhysicsRef.current.grabNodeAt(x, y, grabDist)) {
                activePhysicsDraggingRef.current = leftPhysicsRef.current;
                setDraggingItem('left-earring');
                return;
            }
            if (rightPhysicsRef.current && rightPhysicsRef.current.grabNodeAt(x, y, grabDist)) {
                activePhysicsDraggingRef.current = rightPhysicsRef.current;
                setDraggingItem('right-earring');
                return;
            }
            return;
        }

        const clickedItem = findItemAtPosition(x, y);

        if (clickedItem && clickedItem.id) {
            const now = Date.now();
            if (lastTapItemRef.current === clickedItem.uuid && (now - lastTapTimeRef.current) < 300) {
                if (onItemMirror) onItemMirror(clickedItem.uuid);
                lastTapTimeRef.current = 0;
                lastTapItemRef.current = null;
                return;
            }
            lastTapTimeRef.current = now;
            lastTapItemRef.current = clickedItem.uuid;

            longPressTriggeredRef.current = false;
            longPressTouchRef.current = touch.identifier;

            longPressTimerRef.current = setTimeout(() => {
                longPressTriggeredRef.current = true;
                isRotatingRef.current = true;
                rotatingItemRef.current = clickedItem.uuid;
                rotateStartXRef.current = touch.clientX;
                rotateStartRotationRef.current = clickedItem.rotation || 0;
                onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
            }, 500);
        }
    };

    const handleTouchMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (isEarring && activePhysicsDraggingRef.current && e.touches.length === 1) {
            const touch = e.touches[0];
            const { x, y } = getTouchCanvasCoordinates(touch, canvas);
            activePhysicsDraggingRef.current.updateDrag(x, y);
            return;
        }

        if (longPressTimerRef.current && !longPressTriggeredRef.current) {
            if (!isRotatingRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        }

        if (isRotatingRef.current && rotatingItemRef.current && onItemRotate && e.touches.length === 1) {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - rotateStartXRef.current;
            const newRotation = rotateStartRotationRef.current + (deltaX * 0.01);
            onItemRotate(rotatingItemRef.current, newRotation);
        }
    };

    const handleTouchEnd = () => {
        if (isEarring && activePhysicsDraggingRef.current) {
            activePhysicsDraggingRef.current.releaseGrab();
            activePhysicsDraggingRef.current = null;
            setDraggingItem(null);
            return;
        }

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (isRotatingRef.current) {
            isRotatingRef.current = false;
            rotatingItemRef.current = null;
            longPressTriggeredRef.current = false;
            return;
        }

        longPressTriggeredRef.current = false;
    };

    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden'
            }}
        >
            {/* Interactive Photorealistic Jewelry Canvas */}
            <canvas
                ref={canvasRef}
                className="luxury-canvas"
                onClick={handleCanvasClickEvent}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropEvent}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    zIndex: 2,
                    cursor: isEarring
                        ? (activePhysicsDraggingRef.current ? 'grabbing' : 'grab')
                        : (isRotatingRef.current ? 'ew-resize' : (draggingItem ? 'grabbing' : 'pointer')),
                    touchAction: 'manipulation'
                }}
            />
        </div>
    );
};

export default CanvasPreview;
