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

const CanvasPreview = ({ configuration, onCanvasReady, calibration, onCanvasClick }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

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

    const handleCanvasClickEvent = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // Map Click to Canvas Coordinate Space (500x500 base)
        const x = (e.clientX - rect.left) * (BASE_CONFIG.dimensions.width / rect.width);
        const y = (e.clientY - rect.top) * (BASE_CONFIG.dimensions.height / rect.height);

        console.log(`Canvas Click at: ${x.toFixed(1)}, ${y.toFixed(1)}`);

        const layout = getLayout();

        // 1. Check if clicked on an existing item
        // Reduced threshold to allow placing beads closer together
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
                const newPos = getPointOnEllipse(angle, layout);

                // Collision Check: Ensure we don't place it on top of another bead
                const MIN_GAP = 28; // Allow placing beads almost touching (Gold bead ~30px)

                const isTooClose = configuration.some(item => {
                    const existingPos = getPointOnEllipse(item.angle, layout);
                    const dist = Math.sqrt(Math.pow(newPos.x - existingPos.x, 2) + Math.pow(newPos.y - existingPos.y, 2));
                    return dist < MIN_GAP;
                });

                if (isTooClose) {
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

            // Set display size
            canvas.style.width = "100%";
            canvas.style.maxWidth = `${width}px`;
            canvas.style.height = "auto";
            canvas.style.aspectRatio = `${width}/${height}`;

            ctx.clearRect(0, 0, width, height);

            try {
                const layout = getLayout();

                // 1. Prepare Items
                const positions = configuration.map(item => ({
                    ...item,
                    ...getPointOnEllipse(item.angle, layout)
                }));

                const baseBeadImg = await loadImage(BASE_CONFIG.baseBeadImage);

                // 2. Draw Wire
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

                // 3. Prepare Render Queue
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
                            img,
                            x: pos.x,
                            y: pos.y,
                            width: size,
                            height: size,
                            uuid: pos.uuid
                        };
                    })
                );

                // 4. Sort by Y for depth
                renderQueue.sort((a, b) => a.y - b.y);

                // 5. Draw Items
                renderQueue.forEach(item => {
                    const { img, x, y, width, height } = item;

                    ctx.save();
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
    }, [configuration, calibration]);

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
