import React, { useEffect, useRef, useState, useCallback } from "react";
import { BASE_CONFIG, COMPONENTS } from "../data/jewelryData";
import { getPointOnEllipse, getAngleFromPoint, isClickNearEllipse } from "../utils/geometry";

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

const CanvasPreview = ({ configuration, onCanvasReady, calibration, onCanvasClick, onDrop, onItemMove, onItemRotate, onItemMirror }) => {
    const canvasRef = useRef(null);
    const offscreenCanvasRef = useRef(null);
    const baseLayerRef = useRef(null); // Cached base layer ImageData
    const [previewAngle, setPreviewAngle] = useState(null);
    const [previewColliding, setPreviewColliding] = useState(false);
    const [draggingItem, setDraggingItem] = useState(null); // UUID of bead being dragged

    // Rotation state (right-click drag / long-press drag)
    const rotatingItemRef = useRef(null); // UUID of stone being rotated
    const rotateStartXRef = useRef(0); // Starting X position of drag
    const rotateStartRotationRef = useRef(0); // Rotation at drag start
    const isRotatingRef = useRef(false);

    // Long-press state for mobile
    const longPressTimerRef = useRef(null);
    const longPressTouchRef = useRef(null); // Store touch identifier
    const longPressTriggeredRef = useRef(false);

    // Double-tap detection for mobile mirror
    const lastTapTimeRef = useRef(0);
    const lastTapItemRef = useRef(null);

    const getLayout = useCallback(() => {
        const layout = { ...BASE_CONFIG.layout };
        if (calibration) {
            layout.radiusX = calibration.radiusX;
            layout.radiusY = calibration.radiusY;
            const radOffset = (calibration.rotation * Math.PI) / 180;
            layout.startAngle += radOffset;
            layout.endAngle += radOffset;
        }
        return layout;
    }, [calibration]);

    const getCanvasCoordinates = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (BASE_CONFIG.dimensions.width / rect.width);
        const y = (e.clientY - rect.top) * (BASE_CONFIG.dimensions.height / rect.height);
        return { x, y };
    };

    const getTouchCanvasCoordinates = (touch, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (BASE_CONFIG.dimensions.width / rect.width);
        const y = (touch.clientY - rect.top) * (BASE_CONFIG.dimensions.height / rect.height);
        return { x, y };
    };

    const findItemAtPosition = useCallback((x, y) => {
        const layout = getLayout();
        const CLICK_THRESHOLD = 20;
        for (let item of configuration) {
            const pos = getPointOnEllipse(item.angle, layout);
            const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            if (dist < CLICK_THRESHOLD) {
                return item;
            }
        }
        return null;
    }, [configuration, getLayout]);

    const checkCollision = useCallback((angle, layout) => {
        const newPos = getPointOnEllipse(angle, layout);
        const MIN_GAP = 25;

        return configuration.some(item => {
            const existingPos = getPointOnEllipse(item.angle, layout);
            const dist = Math.sqrt(Math.pow(newPos.x - existingPos.x, 2) + Math.pow(newPos.y - existingPos.y, 2));
            return dist < MIN_GAP;
        });
    }, [configuration]);

    // Draw the base layer (wire + beads) to offscreen canvas
    const drawBaseLayer = useCallback(async () => {
        const { width, height } = BASE_CONFIG.dimensions;

        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
            offscreenCanvasRef.current.width = width;
            offscreenCanvasRef.current.height = height;
        }

        const ctx = offscreenCanvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        const layout = getLayout();

        const positions = configuration.map(item => ({
            ...item,
            ...getPointOnEllipse(item.angle, layout)
        }));

        const baseBeadImg = await loadImage(BASE_CONFIG.baseBeadImage);

        // --- Procedural Cable Chain Rendering ---
        const rx = layout.radiusX || layout.radius;
        const ry = layout.radiusY || layout.radius;
        const cx = layout.centerX;
        const cy = layout.centerY;

        // Settings for cable chain
        const linkLength = 10;
        const linkWidth = 3.5;
        const linkThickness = 1.5;
        const numLinks = 180; // Total links around the perimeter

        // Draw links
        ctx.save();
        for (let i = 0; i < numLinks; i++) {
            const t = (i / numLinks) * 2 * Math.PI;

            // Point on ellipse
            const px = cx + rx * Math.cos(t);
            const py = cy + ry * Math.sin(t);

            // Tangent angle
            const dx = -rx * Math.sin(t);
            const dy = ry * Math.cos(t);
            const angle = Math.atan2(dy, dx);

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);

            // Alternate between "flat" face-up links and "side" edge-on links
            if (i % 2 === 0) {
                // Flat Link (seen from top)
                ctx.beginPath();
                ctx.ellipse(0, 0, linkLength / 2, linkWidth / 2, 0, 0, Math.PI * 2);

                // Gold gradient for flat link
                const grad = ctx.createLinearGradient(-linkLength / 2, -linkWidth / 2, linkLength / 2, linkWidth / 2);
                grad.addColorStop(0, '#DAA520'); // GoldenRod
                grad.addColorStop(0.4, '#FFD700'); // Gold
                grad.addColorStop(0.6, '#FFFACD'); // LemonChiffon (Highlight)
                grad.addColorStop(1, '#B8860b'); // DarkGoldenRod

                ctx.strokeStyle = grad;
                ctx.lineWidth = linkThickness;
                ctx.stroke();
            } else {
                // Side Link (seen edge on - looks like a small rectangle/oval)
                ctx.beginPath();
                ctx.ellipse(0, 0, linkLength / 2 - 1, linkThickness / 2, 0, 0, Math.PI * 2);

                // Darker gradient for side link to show depth
                const grad = ctx.createLinearGradient(0, -1, 0, 1);
                grad.addColorStop(0, '#B8860b');
                grad.addColorStop(0.5, '#FFD700');
                grad.addColorStop(1, '#B8860b');

                ctx.fillStyle = grad;
                ctx.fill();
            }

            ctx.restore();
        }
        ctx.restore();

        // Add shadow behind chain
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = linkWidth + 4;
        ctx.globalCompositeOperation = 'destination-over';
        ctx.stroke();
        ctx.restore();

        // Prepare render queue
        const renderQueue = await Promise.all(
            positions.map(async (pos) => {
                let img;
                let size = 30;

                if (pos.id) {
                    const compData = COMPONENTS.find(c => c.id === pos.id);
                    if (compData) {
                        img = await loadImage(compData.image);
                        size = compData.width;
                    } else {
                        img = baseBeadImg;
                    }
                } else {
                    img = baseBeadImg;
                }

                return {
                    img, x: pos.x, y: pos.y, width: size, height: size,
                    isBaseBead: img === baseBeadImg,
                    rotation: pos.rotation || 0,
                    mirrored: pos.mirrored || false
                };
            })
        );

        // Sort by Y for depth
        renderQueue.sort((a, b) => a.y - b.y);

        // Draw items
        renderQueue.forEach(item => {
            const { img, x, y, width, height, isBaseBead, rotation, mirrored } = item;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            if (mirrored) {
                ctx.scale(-1, 1);
            }

            if (isBaseBead) {
                ctx.beginPath();
                ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
            }
            ctx.drawImage(img, -width / 2, -height / 2, width, height);
            ctx.restore();
        });

        // Cache the base layer
        baseLayerRef.current = ctx.getImageData(0, 0, width, height);
    }, [configuration, getLayout]);

    // Composite final frame
    const compositeFrame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !baseLayerRef.current) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = BASE_CONFIG.dimensions;

        // Draw cached base layer
        ctx.putImageData(baseLayerRef.current, 0, 0);

        // Draw preview overlay if dragging
        if (previewAngle !== null) {
            const layout = getLayout();
            const snapPos = getPointOnEllipse(previewAngle, layout);

            // Draw snap line
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(layout.centerX, layout.centerY);
            ctx.lineTo(snapPos.x, snapPos.y);
            ctx.strokeStyle = previewColliding ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Draw ghost bead
            const baseBeadImg = imageCache.get(BASE_CONFIG.baseBeadImage);
            if (baseBeadImg) {
                const size = 30;
                ctx.save();
                ctx.globalAlpha = 0.5;

                ctx.beginPath();
                ctx.arc(snapPos.x, snapPos.y, size / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                if (previewColliding) {
                    // Draw red overlay for collision
                    ctx.drawImage(baseBeadImg, snapPos.x - size / 2, snapPos.y - size / 2, size, size);
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fill();
                } else {
                    ctx.drawImage(baseBeadImg, snapPos.x - size / 2, snapPos.y - size / 2, size, size);
                }
                ctx.restore();
            }
        }
    }, [previewAngle, previewColliding, getLayout]);

    const handleDragOver = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();

        const angle = getAngleFromPoint(x, y, layout.centerX, layout.centerY);
        const isColliding = checkCollision(angle, layout);

        setPreviewAngle(angle);
        setPreviewColliding(isColliding);
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
        const angle = getAngleFromPoint(x, y, layout.centerX, layout.centerY);

        setPreviewAngle(null);
        setPreviewColliding(false);

        if (checkCollision(angle, layout)) {
            console.log("Drop prevented: Collision");
            return;
        }

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data && data.id && onDrop) {
                onDrop({ id: data.id, angle });
            }
        } catch (err) {
            console.error("Drop failed", err);
        }
    };

    // ========== MOUSE HANDLERS ==========

    const handleMouseDown = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);

        // Right-click: start rotation mode
        if (e.button === 2) {
            const clickedItem = findItemAtPosition(x, y);
            if (clickedItem && clickedItem.id) {
                // Only rotate stones, not base beads
                isRotatingRef.current = true;
                rotatingItemRef.current = clickedItem.uuid;
                rotateStartXRef.current = e.clientX;
                rotateStartRotationRef.current = clickedItem.rotation || 0;
                onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
            }
            return;
        }

        // Left-click: existing drag/select behavior
        if (e.button === 0) {
            const layout = getLayout();
            const CLICK_THRESHOLD = 20;
            let clickedItem = null;

            for (let item of configuration) {
                const pos = getPointOnEllipse(item.angle, layout);
                const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                if (dist < CLICK_THRESHOLD) {
                    clickedItem = item;
                    break;
                }
            }

            if (clickedItem) {
                setDraggingItem(clickedItem.uuid);
                onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
            }
        }
    };

    const handleMouseMove = (e) => {
        // Handle rotation mode
        if (isRotatingRef.current && rotatingItemRef.current && onItemRotate) {
            const deltaX = e.clientX - rotateStartXRef.current;
            const ROTATION_SENSITIVITY = 0.01; // radians per pixel
            const newRotation = rotateStartRotationRef.current + (deltaX * ROTATION_SENSITIVITY);
            onItemRotate(rotatingItemRef.current, newRotation);
            return;
        }

        // Handle drag mode
        if (!draggingItem || !onItemMove) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();

        const newAngle = getAngleFromPoint(x, y, layout.centerX, layout.centerY);

        const MIN_GAP = 25;
        const newPos = getPointOnEllipse(newAngle, layout);
        let hasCollision = false;

        for (let item of configuration) {
            if (item.uuid === draggingItem) continue;
            const existingPos = getPointOnEllipse(item.angle, layout);
            const dist = Math.sqrt(Math.pow(newPos.x - existingPos.x, 2) + Math.pow(newPos.y - existingPos.y, 2));
            if (dist < MIN_GAP) {
                hasCollision = true;
                break;
            }
        }

        if (!hasCollision) {
            onItemMove(draggingItem, newAngle);
        }
    };

    const handleMouseUp = (e) => {
        if (isRotatingRef.current) {
            isRotatingRef.current = false;
            rotatingItemRef.current = null;
            return;
        }
        setDraggingItem(null);
    };

    const handleContextMenu = (e) => {
        e.preventDefault(); // Prevent right-click menu on canvas
    };

    // Double-click: mirror the stone
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
        // Only process as a click if we weren't dragging
        if (draggingItem) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();

        const CLICK_THRESHOLD = 20;
        let clickedItem = null;

        for (let item of configuration) {
            const pos = getPointOnEllipse(item.angle, layout);
            const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            if (dist < CLICK_THRESHOLD) {
                clickedItem = item;
                break;
            }
        }

        if (clickedItem) {
            onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
        } else {
            const isNear = isClickNearEllipse(x, y, layout, 40);

            if (isNear) {
                const angle = getAngleFromPoint(x, y, layout.centerX, layout.centerY);

                if (checkCollision(angle, layout)) {
                    console.log("Too close to existing bead");
                } else {
                    onCanvasClick({ type: 'add', angle });
                }
            }
        }
    };

    // ========== TOUCH HANDLERS (Mobile) ==========

    const handleTouchStart = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const { x, y } = getTouchCanvasCoordinates(touch, canvas);

        const clickedItem = findItemAtPosition(x, y);

        if (clickedItem && clickedItem.id) {
            // Check for double-tap (mirror)
            const now = Date.now();
            if (lastTapItemRef.current === clickedItem.uuid && (now - lastTapTimeRef.current) < 300) {
                // Double-tap detected on same stone — mirror it
                if (onItemMirror) {
                    onItemMirror(clickedItem.uuid);
                }
                lastTapTimeRef.current = 0;
                lastTapItemRef.current = null;
                return; // Don't start long-press timer
            }
            lastTapTimeRef.current = now;
            lastTapItemRef.current = clickedItem.uuid;

            // Start long-press timer for rotation
            longPressTriggeredRef.current = false;
            longPressTouchRef.current = touch.identifier;

            longPressTimerRef.current = setTimeout(() => {
                // Long press triggered — enter rotation mode
                longPressTriggeredRef.current = true;
                isRotatingRef.current = true;
                rotatingItemRef.current = clickedItem.uuid;
                rotateStartXRef.current = touch.clientX;
                rotateStartRotationRef.current = clickedItem.rotation || 0;
                onCanvasClick({ type: 'select', uuid: clickedItem.uuid });

                // Vibrate for haptic feedback if supported
                if (navigator.vibrate) {
                    navigator.vibrate(30);
                }
            }, 500); // 500ms long-press
        }
    };

    const handleTouchMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Cancel long-press if user moves before timer fires
        if (longPressTimerRef.current && !longPressTriggeredRef.current) {
            // Allow small movement tolerance (5px)
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const dx = touch.clientX - rotateStartXRef.current;
                const dy = touch.clientY - (longPressTouchRef.current !== null ? touch.clientY : 0);
                // We can't easily check distance from start without storing startY, 
                // so just cancel on any significant move
                if (!isRotatingRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
            }
        }

        // Handle rotation via long-press drag
        if (isRotatingRef.current && rotatingItemRef.current && onItemRotate && e.touches.length === 1) {
            e.preventDefault(); // Prevent scrolling while rotating
            const touch = e.touches[0];
            const deltaX = touch.clientX - rotateStartXRef.current;
            const ROTATION_SENSITIVITY = 0.01;
            const newRotation = rotateStartRotationRef.current + (deltaX * ROTATION_SENSITIVITY);
            onItemRotate(rotatingItemRef.current, newRotation);
        }
    };

    const handleTouchEnd = (e) => {
        // Clear long-press timer
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

    // Initialize canvas and draw base layer when configuration changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = BASE_CONFIG.dimensions;

        // Use fixed canvas size (no DPR scaling) to ensure consistent positioning
        canvas.width = width;
        canvas.height = height;

        canvas.style.width = "100%";
        canvas.style.maxWidth = `${width}px`;
        canvas.style.height = "auto";
        canvas.style.aspectRatio = `${width}/${height}`;

        // Async draw base layer
        drawBaseLayer().then(() => {
            compositeFrame();
        });
    }, [configuration, calibration, drawBaseLayer, compositeFrame]);

    // Re-composite when preview changes (fast, no image loading)
    useEffect(() => {
        if (baseLayerRef.current) {
            compositeFrame();
        }
    }, [previewAngle, previewColliding, compositeFrame]);

    useEffect(() => {
        if (onCanvasReady) {
            onCanvasReady(canvasRef);
        }
    }, [onCanvasReady]);

    // Cleanup long-press timer on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="canvas-container relative" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <canvas
                ref={canvasRef}
                className="rounded-lg shadow-2xl"
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
                    cursor: isRotatingRef.current ? 'ew-resize' : (draggingItem ? 'grabbing' : 'pointer'),
                    maxWidth: '100%',
                    touchAction: 'manipulation'
                }}
            />
        </div>
    );
};

export default CanvasPreview;
