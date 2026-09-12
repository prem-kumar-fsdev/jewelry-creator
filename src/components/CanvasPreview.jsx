import React, { useEffect, useRef, useState, useCallback } from "react";
import { COMPONENTS, METALS, CHAIN_STYLES, BACKDROPS } from "../data/jewelryData";
import { getPointOnLayout, getAngleFromPoint, isClickNearEllipse } from "../utils/geometry";
import {
    drawPhotorealisticChain,
    drawLuxuryClaspAndEndCaps,
    drawLuxuryEarringStud,
    drawJumpRingAndBail,
    drawSparkle,
    sampleEquidistantEllipse,
    sampleEquidistantBezier,
    drawLuxuryBackdrop,
    LUXURY_METALS
} from "../utils/photorealisticRenderer";

// Image cache - persists across renders
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

const CanvasPreview = ({
    variantConfig,
    configuration,
    selectedMetal = "gold",
    selectedChainStyle = "cable",
    selectedBackdrop = "velvet-emerald",
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

    const [previewAngle, setPreviewAngle] = useState(null);
    const [previewSide, setPreviewSide] = useState('left');
    const [previewColliding, setPreviewColliding] = useState(false);
    const [draggingItem, setDraggingItem] = useState(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 700 });

    // Rotation state
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

    // ─── 3D Three.js Studio Scene Lifecycle ──────────────────────────────────
    // Removed per user request. We now use a simple 2D luxury backdrop.

    // ResizeObserver: tracks the container and syncs canvas
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    const w = Math.round(width);
                    const h = Math.round(height);
                    setCanvasSize({ width: w, height: h });
                }
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // ─── Render Photorealistic Jewelry on Overlay Canvas ───────────────────────
    const renderJewelry = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || canvasSize.width === 0) return;

        const { width: cw, height: ch } = canvasSize;
        const designW = variantConfig.dimensions.width;  // 500
        const designH = variantConfig.dimensions.height; // 500
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

        canvas.width = cw * dpr;
        canvas.height = ch * dpr;

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cw, ch);

        const layout = getLayout();
        
        // Draw the luxury studio background covering the full area before scaling
        drawLuxuryBackdrop(ctx, cw, ch, selectedBackdrop, layout.type);

        // Center and fit the 500x500 jewelry design inside the full studio view
        const scale = Math.min(cw / designW, ch / designH) * 0.88;
        const offsetX = (cw - designW * scale) / 2;
        const offsetY = (ch - designH * scale) / 2;

        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        const currentMetal = METALS[selectedMetal] || METALS.gold;
        const baseBeadSrc = currentMetal.baseBeadImage || variantConfig.baseBeadImage;
        const baseBeadImg = await loadImage(baseBeadSrc);

        const linkPitch = selectedChainStyle === 'paperclip' ? 12 : selectedChainStyle === 'rope' ? 6.5 : 7.8;

        // 1. Render Photorealistic Base Chain
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

            // Left upper suspension hanger (drapes naturally from neck to leftPt)
            const leftHangerPts = sampleEquidistantBezier(
                leftAnchor,
                { x: layout.centerX - 115, y: 88 },
                leftPt,
                null,
                linkPitch
            );

            // Right upper suspension hanger (drapes naturally from neck to rightPt)
            const rightHangerPts = sampleEquidistantBezier(
                rightAnchor,
                { x: layout.centerX + 115, y: 88 },
                rightPt,
                null,
                linkPitch
            );

            drawPhotorealisticChain(ctx, leftHangerPts, selectedMetal, selectedChainStyle);
            drawPhotorealisticChain(ctx, rightHangerPts, selectedMetal, selectedChainStyle);

            // Main draped catenary necklace curve
            const mainArcPts = sampleEquidistantEllipse(
                layout.centerX,
                layout.centerY,
                layout.radiusX,
                layout.radiusY,
                layout.startAngle,
                layout.endAngle,
                linkPitch
            );
            drawPhotorealisticChain(ctx, mainArcPts, selectedMetal, selectedChainStyle);

            // Suspension end-caps & lobster claw clasp at top anchor points
            drawLuxuryClaspAndEndCaps(ctx, leftAnchor, rightAnchor, selectedMetal);

        } else if (layout.type === 'dual-earring') {
            // Left Earring Stud & Hoop
            drawLuxuryEarringStud(ctx, layout.leftCenter.x, layout.leftCenter.y, selectedMetal);
            const leftHoopPts = sampleEquidistantEllipse(
                layout.leftCenter.x,
                layout.leftCenter.y,
                layout.radiusX,
                layout.radiusY,
                0,
                Math.PI * 2,
                linkPitch
            );
            drawPhotorealisticChain(ctx, leftHoopPts, selectedMetal, selectedChainStyle);

            // Right Earring Stud & Hoop
            drawLuxuryEarringStud(ctx, layout.rightCenter.x, layout.rightCenter.y, selectedMetal);
            const rightHoopPts = sampleEquidistantEllipse(
                layout.rightCenter.x,
                layout.rightCenter.y,
                layout.radiusX,
                layout.radiusY,
                0,
                Math.PI * 2,
                linkPitch
            );
            drawPhotorealisticChain(ctx, rightHoopPts, selectedMetal, selectedChainStyle);

            // Studio Earring Labels
            ctx.save();
            ctx.font = "600 11px Inter, sans-serif";
            ctx.fillStyle = selectedBackdrop.includes("velvet") ? "rgba(255, 255, 255, 0.45)" : "rgba(80, 80, 80, 0.65)";
            ctx.textAlign = "center";
            ctx.letterSpacing = "2px";
            ctx.fillText("LEFT EARRING", layout.leftCenter.x, 385);
            ctx.fillText("RIGHT EARRING", layout.rightCenter.x, 385);
            ctx.restore();

        } else {
            // Bracelet (Classic Ellipse)
            const braceletPts = sampleEquidistantEllipse(
                layout.centerX,
                layout.centerY,
                layout.radiusX,
                layout.radiusY,
                0,
                Math.PI * 2,
                linkPitch
            );
            drawPhotorealisticChain(ctx, braceletPts, selectedMetal, selectedChainStyle);

            // Clasp link at top
            drawLuxuryClaspAndEndCaps(
                ctx,
                { x: layout.centerX - 9, y: layout.centerY - layout.radiusY },
                { x: layout.centerX + 9, y: layout.centerY - layout.radiusY },
                selectedMetal
            );
        }

        // 2. Prepare beads/stones render queue
        const positions = configuration.map(item => ({
            ...item,
            ...getPointOnLayout(item.angle, layout, item.side || 'left')
        }));

        const renderQueue = await Promise.all(
            positions.map(async (pos) => {
                let img;
                let size = layout.type === 'dual-earring' ? 26 : 30;
                let compData = null;

                if (pos.id) {
                    compData = COMPONENTS.find(c => c.id === pos.id);
                    if (compData) {
                        img = await loadImage(compData.image);
                        size = layout.type === 'dual-earring' ? Math.round(compData.width * 0.82) : compData.width;
                    } else {
                        img = baseBeadImg;
                    }
                } else {
                    img = baseBeadImg;
                }

                return {
                    img,
                    x: pos.x,
                    y: pos.y,
                    angle: pos.angle,
                    width: size,
                    height: size,
                    isBaseBead: img === baseBeadImg,
                    rotation: pos.rotation || 0,
                    mirrored: pos.mirrored || false,
                    compData
                };
            })
        );

        // Sort by Y for natural depth
        renderQueue.sort((a, b) => a.y - b.y);

        // 3. Draw items with realistic lighting, jump rings, contact shadows & sparkles
        renderQueue.forEach(item => {
            const { img, x, y, angle, width, height, isBaseBead, rotation, mirrored } = item;

            ctx.save();
            ctx.translate(x, y);

            // A. Component Cast Drop Shadow onto Velvet Display Pedestal
            ctx.save();
            ctx.beginPath();
            ctx.arc(3.5, 7.5, width * 0.44, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
            ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 6;
            ctx.fill();
            ctx.restore();

            // B. Draw item image with rotation and mirror
            ctx.save();
            ctx.rotate(rotation);
            if (mirrored) {
                ctx.scale(-1, 1);
            }

            if (isBaseBead) {
                // Spherical bead render
                ctx.beginPath();
                ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                // Rose gold tint if selected
                if (selectedMetal === "roseGold") {
                    ctx.filter = "hue-rotate(330deg) saturate(1.15) brightness(1.05)";
                }
            }

            ctx.drawImage(img, -width / 2, -height / 2, width, height);
            ctx.restore();

            // C. Authentic jewelry bail connector attaching charm to chain
            drawJumpRingAndBail(ctx, 0, 0, angle, selectedMetal, isBaseBead);

            // D. Specular micro-glint on gemstone / charm
            if (!isBaseBead) {
                drawSparkle(ctx, -width * 0.25, -height * 0.25, 6, "#FFFFFF");
            }

            ctx.restore();
        });

        // 4. Snap guide halo and ghost bead if dragging / hovering
        if (previewAngle !== null) {
            const snapPos = getPointOnLayout(previewAngle, layout, previewSide);
            const center = layout.type === 'dual-earring'
                ? (previewSide === 'right' ? layout.rightCenter : layout.leftCenter)
                : { x: layout.centerX, y: layout.centerY };

            // Snap line with soft glow
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(snapPos.x, snapPos.y);
            ctx.strokeStyle = previewColliding ? 'rgba(235, 75, 75, 0.7)' : 'rgba(255, 235, 170, 0.6)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 2;
            ctx.shadowColor = previewColliding ? 'rgba(235, 75, 75, 0.8)' : 'rgba(255, 220, 120, 0.8)';
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.restore();

            // Snap guide halo
            ctx.save();
            ctx.beginPath();
            ctx.arc(snapPos.x, snapPos.y, 16, 0, Math.PI * 2);
            ctx.strokeStyle = previewColliding ? 'rgba(235, 75, 75, 0.85)' : 'rgba(255, 225, 130, 0.85)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.restore();

            // Ghost bead
            const size = layout.type === 'dual-earring' ? 26 : 30;
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.arc(snapPos.x, snapPos.y, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            if (previewColliding) {
                ctx.drawImage(baseBeadImg, snapPos.x - size / 2, snapPos.y - size / 2, size, size);
                ctx.fillStyle = 'rgba(235, 50, 50, 0.55)';
                ctx.fill();
            } else {
                ctx.drawImage(baseBeadImg, snapPos.x - size / 2, snapPos.y - size / 2, size, size);
            }
            ctx.restore();
        }

        ctx.restore();
    }, [configuration, variantConfig, selectedMetal, selectedChainStyle, selectedBackdrop, getLayout, canvasSize, previewAngle, previewSide, previewColliding]);

    // Trigger re-render whenever dependencies change
    useEffect(() => {
        renderJewelry();
    }, [renderJewelry]);

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
        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();
        const nearInfo = isClickNearEllipse(x, y, layout, 50);

        setPreviewAngle(null);
        setPreviewColliding(false);

        if (!nearInfo.isNear) return;

        const side = nearInfo.side || 'left';
        const center = nearInfo.center;
        const angle = getAngleFromPoint(x, y, center.x, center.y);

        if (checkCollision(angle, side)) {
            return;
        }

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data && data.id && onDrop) {
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

        // Right-click: stone rotation
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

        // Left-click: drag/select
        if (e.button === 0) {
            const clickedItem = findItemAtPosition(x, y);
            if (clickedItem) {
                setDraggingItem(clickedItem.uuid);
                onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
            }
        }
    };

    const handleMouseMove = (e) => {
        // Rotation
        if (isRotatingRef.current && rotatingItemRef.current && onItemRotate) {
            const deltaX = e.clientX - rotateStartXRef.current;
            const ROTATION_SENSITIVITY = 0.01;
            const newRotation = rotateStartRotationRef.current + (deltaX * ROTATION_SENSITIVITY);
            onItemRotate(rotatingItemRef.current, newRotation);
            return;
        }

        // Drag along chain
        if (!draggingItem || !onItemMove) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();
        const currentItem = configuration.find(i => i.uuid === draggingItem);
        if (!currentItem) return;

        const side = currentItem.side || 'left';
        const center = layout.type === 'dual-earring'
            ? (side === 'right' ? layout.rightCenter : layout.leftCenter)
            : { x: layout.centerX, y: layout.centerY };

        const newAngle = getAngleFromPoint(x, y, center.x, center.y);

        // Clamp necklace curve angles
        if (layout.type === 'necklace-curve') {
            if (newAngle < layout.startAngle || newAngle > layout.endAngle) return;
        }

        if (!checkCollision(newAngle, side, draggingItem)) {
            onItemMove(draggingItem, newAngle);
        }
    };

    const handleMouseUp = () => {
        if (isRotatingRef.current) {
            isRotatingRef.current = false;
            rotatingItemRef.current = null;
            return;
        }
        setDraggingItem(null);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
    };

    const handleDoubleClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas || !onItemMirror) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const clickedItem = findItemAtPosition(x, y);

        if (clickedItem && clickedItem.id) {
            onItemMirror(clickedItem.uuid);
        }
    };

    const handleCanvasClickEvent = (e) => {
        if (draggingItem) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();
        const clickedItem = findItemAtPosition(x, y);

        if (clickedItem) {
            onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
        } else {
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

    // ─── Touch Handlers ───────────────────────────────────────────────────────
    const handleTouchStart = (e) => {
        const canvas = canvasRef.current;
        if (!canvas || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const { x, y } = getTouchCanvasCoordinates(touch, canvas);
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

                if (navigator.vibrate) navigator.vibrate(30);
            }, 500);
        }
    };

    const handleTouchMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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
            const ROTATION_SENSITIVITY = 0.01;
            const newRotation = rotateStartRotationRef.current + (deltaX * ROTATION_SENSITIVITY);
            onItemRotate(rotatingItemRef.current, newRotation);
        }
    };

    const handleTouchEnd = () => {
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
            {/* Interactive 2D Photorealistic Jewelry Canvas */}
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
                    cursor: isRotatingRef.current ? 'ew-resize' : (draggingItem ? 'grabbing' : 'pointer'),
                    touchAction: 'manipulation'
                }}
            />
        </div>
    );
};

export default CanvasPreview;
