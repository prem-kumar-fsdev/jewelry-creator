import React, { useEffect, useRef, useState } from "react";
import { BASE_CONFIG, COMPONENTS } from "../data/jewelryData";
import { getPointOnEllipse, getAngleFromPoint, isClickNearEllipse } from "../utils/geometry";

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });

const CanvasPreview = ({ configuration, onCanvasReady, calibration, onCanvasClick, onDrop }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [previewItem, setPreviewItem] = useState(null); // { id, angle, isColliding }

    // Helpers to get current layout
    const getLayout = () => {
        const layout = { ...BASE_CONFIG.layout };
        if (calibration) {
            layout.radiusX = calibration.radiusX;
            layout.radiusY = calibration.radiusY;
            const radOffset = (calibration.rotation * Math.PI) / 180;
            layout.startAngle += radOffset;
            layout.endAngle += radOffset;
        }
        return layout;
    };

    const getCanvasCoordinates = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (BASE_CONFIG.dimensions.width / rect.width);
        const y = (e.clientY - rect.top) * (BASE_CONFIG.dimensions.height / rect.height);
        return { x, y };
    };

    // Helper: collision detection
    const checkCollision = (angle, layout, excludeUuid = null) => {
        const newPos = getPointOnEllipse(angle, layout);
        const MIN_GAP = 25;

        return configuration.some(item => {
            if (excludeUuid && item.uuid === excludeUuid) return false;
            const existingPos = getPointOnEllipse(item.angle, layout);
            const dist = Math.sqrt(Math.pow(newPos.x - existingPos.x, 2) + Math.pow(newPos.y - existingPos.y, 2));
            return dist < MIN_GAP;
        });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();

        const angle = getAngleFromPoint(x, y, layout.centerX, layout.centerY);
        const isColliding = checkCollision(angle, layout);

        setPreviewItem({ angle, isColliding });
    };

    const handleDragLeave = () => {
        setPreviewItem(null);
    };

    const handleDropEvent = (e) => {
        e.preventDefault();

        const canvas = canvasRef.current;
        const { x, y } = getCanvasCoordinates(e, canvas);
        const layout = getLayout();
        const angle = getAngleFromPoint(x, y, layout.centerX, layout.centerY);

        setPreviewItem(null);

        if (checkCollision(angle, layout)) {
            console.log("Drop prevented: Collision");
            return;
        }

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data && data.id) {
                if (onDrop) {
                    onDrop({ id: data.id, angle });
                }
            }
        } catch (err) {
            console.error("Drop failed", err);
        }
    };

    const handleCanvasClickEvent = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e, canvas);

        console.log(`Canvas Click at: ${x.toFixed(1)}, ${y.toFixed(1)}`);

        const layout = getLayout();

        // 1. Check if clicked on an existing item
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
            console.log("Selected Item:", clickedItem.uuid);
            onCanvasClick({ type: 'select', uuid: clickedItem.uuid });
        } else {
            // 2. Check if clicked near the ellipse wire
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

    useEffect(() => {
        let active = true;

        const draw = async () => {
            setIsDrawing(true);
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            const { width, height } = BASE_CONFIG.dimensions;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            canvas.style.width = "100%";
            canvas.style.maxWidth = `${width}px`;
            canvas.style.height = "auto";
            canvas.style.aspectRatio = `${width}/${height}`;

            ctx.clearRect(0, 0, width, height);

            try {
                const layout = getLayout();

                const positions = configuration.map(item => ({
                    ...item,
                    ...getPointOnEllipse(item.angle, layout)
                }));

                if (previewItem) {
                    positions.push({
                        id: 'PREVIEW_GHOST',
                        ...getPointOnEllipse(previewItem.angle, layout),
                        isPreview: true,
                        isColliding: previewItem.isColliding
                    });
                }

                const baseBeadImg = await loadImage(BASE_CONFIG.baseBeadImage);

                // Draw Wire
                ctx.beginPath();
                ctx.ellipse(
                    layout.centerX,
                    layout.centerY,
                    layout.radiusX || layout.radius,
                    layout.radiusY || layout.radius,
                    0, 0, Math.PI * 2
                );
                ctx.strokeStyle = '#d4af37';
                ctx.lineWidth = 4;
                ctx.stroke();

                const renderQueue = await Promise.all(
                    positions.map(async (pos) => {
                        let img;
                        let size = 30;
                        let alpha = 1.0;
                        let filter = "none";

                        if (pos.isPreview) {
                            img = baseBeadImg;
                            alpha = 0.5;
                            if (pos.isColliding) {
                                // Red tint for invalid drop
                                filter = "brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)";
                            }
                        } else if (pos.id) {
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

                        return { img, x: pos.x, y: pos.y, width: size, height: size, uuid: pos.uuid, alpha, filter };
                    })
                );

                renderQueue.sort((a, b) => a.y - b.y);

                renderQueue.forEach(item => {
                    const { img, x, y, width, height, alpha, filter } = item;

                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.filter = filter;

                    if (img === baseBeadImg) {
                        ctx.beginPath();
                        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
                    } else {
                        ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
                    }
                    ctx.restore();
                });

                if (previewItem) {
                    const snapPos = getPointOnEllipse(previewItem.angle, layout);
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(layout.centerX, layout.centerY);
                    ctx.lineTo(snapPos.x, snapPos.y);
                    ctx.strokeStyle = previewItem.isColliding ? 'red' : 'rgba(255, 255, 255, 0.3)';
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.restore();
                }

            } catch (err) {
                console.error("Error drawing canvas:", err);
            } finally {
                if (active) setIsDrawing(false);
            }
        };

        draw();

        return () => {
            active = false;
        };
    }, [configuration, calibration, previewItem]);

    useEffect(() => {
        if (onCanvasReady) {
            onCanvasReady(canvasRef);
        }
    }, [onCanvasReady]);

    return (
        <div className="canvas-container relative" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <canvas
                ref={canvasRef}
                className="rounded-lg shadow-2xl"
                onClick={handleCanvasClickEvent}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropEvent}
                style={{ cursor: 'pointer', maxWidth: '100%' }}
            />
            {isDrawing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg pointer-events-none">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
            )}
        </div>
    );
};

export default CanvasPreview;
