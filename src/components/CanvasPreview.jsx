import React, { useEffect, useRef, useState } from "react";
import { BASE_CONFIG, COMPONENTS } from "../data/jewelryData";
import { calculatePositions } from "../utils/geometry";

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Good practice
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });

const CanvasPreview = ({ configuration, onCanvasReady, calibration }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        let active = true;

        const draw = async () => {
            setIsDrawing(true);
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            const { width, height } = BASE_CONFIG.dimensions;

            // Handle high-DPI displays
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.clearRect(0, 0, width, height);

            try {
                // 1. Calculate Positions
                // Apply calibration if available
                const layout = { ...BASE_CONFIG.layout };
                if (calibration) {
                    layout.radiusX = calibration.radiusX;
                    layout.radiusY = calibration.radiusY;
                    const radOffset = (calibration.rotation * Math.PI) / 180;
                    layout.startAngle += radOffset;
                    layout.endAngle += radOffset;
                }
                const positions = calculatePositions(BASE_CONFIG.slotCount, layout);

                // 2. Prepare Render Items (Base beads + Configured stones)
                const baseBeadImg = await loadImage(BASE_CONFIG.baseBeadImage);

                // Draw Wire connecting points (simple styling)
                if (positions.length > 0) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#d4af37'; // Gold color
                    ctx.lineWidth = 4;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    const first = positions[0];
                    ctx.moveTo(first.x, first.y);
                    for (let i = 1; i < positions.length; i++) {
                        const p = positions[i];
                        ctx.lineTo(p.x, p.y);
                    }
                    // Close loop
                    ctx.lineTo(first.x, first.y);
                    ctx.stroke();
                }

                // Prepare promises for all items
                const renderQueue = await Promise.all(
                    positions.map(async (pos, index) => {
                        const stoneId = configuration[index];
                        let img;
                        let size = 30; // Default base bead size

                        if (stoneId) {
                            const compData = COMPONENTS.find(c => c.id === stoneId);
                            if (compData) {
                                img = await loadImage(compData.image);
                                size = compData.width; // Use stone size
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
                            index // Keep track of index if needed
                        };
                    })
                );

                // 3. Sort by Y-coordinate for simplistic depth handling
                // Lower Y (top of screen) = Background = Draw First
                // Higher Y (bottom of screen) = Foreground = Draw Last
                renderQueue.sort((a, b) => a.y - b.y);

                // 4. Draw All
                renderQueue.forEach(item => {
                    const { img, x, y, width, height } = item;

                    ctx.save();
                    // Optional: Clip to circle for beads if they are square images
                    // But assume transparent PNGs for now.
                    // If base bead has white background, we might want to clip it circular.
                    // Let's try circular clipping for base beads only? 
                    // Or just draw.

                    if (img === baseBeadImg) {
                        // Clip to circle to remove potential white corners from generated image
                        ctx.beginPath();
                        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        // Draw slightly larger to fill clip
                        ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
                    } else {
                        // Stones are usually pre-cut
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
    }, [configuration]);

    // Expose canvas ref via callback if needed, or just let parent access via ref if we used forwardRef
    // But here we just use it for display.
    // We can pass the ref up if we want to export.
    useEffect(() => {
        if (onCanvasReady) {
            onCanvasReady(canvasRef);
        }
    }, [onCanvasReady]);

    return (
        <div className="canvas-container relative">
            <canvas ref={canvasRef} className="rounded-lg shadow-2xl" />
            {isDrawing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
            )}
        </div>
    );
};

export default CanvasPreview;
