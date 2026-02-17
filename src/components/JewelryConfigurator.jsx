import React, { useState, useRef } from "react";
import CanvasPreview from "./CanvasPreview";
import Controls from "./Controls";
import { BASE_CONFIG } from "../data/jewelryData";

const JewelryConfigurator = () => {
    // Configuration is now an array of objects: { id: string, angle: number, uuid: string }
    const [configuration, setConfiguration] = useState([]);
    const [activeItemUuid, setActiveItemUuid] = useState(null);
    const canvasRef = useRef(null);

    // Initial load - maybe add some default beads? 
    // Let's start empty for "custom" feel, or maybe 4 balanced ones.

    // Helper to generate unique ID
    const generateUuid = () => Math.random().toString(36).substr(2, 9);

    const handleCanvasClick = (clickData) => {
        // clickData contains { type: 'add'|'select', ... }
        if (clickData.type === 'add') {
            const newItem = {
                uuid: generateUuid(),
                id: null, // null = base bead
                angle: clickData.angle,
                rotation: 0, // stone self-rotation in radians
                mirrored: false, // horizontal flip
            };
            setConfiguration(prev => [...prev, newItem]);
            setActiveItemUuid(newItem.uuid);
        } else if (clickData.type === 'select') {
            setActiveItemUuid(clickData.uuid);
        }
    };

    const handleItemMove = (uuid, newAngle) => {
        setConfiguration(prev => prev.map(item =>
            item.uuid === uuid ? { ...item, angle: newAngle } : item
        ));
    };

    const handleItemRotate = (uuid, newRotation) => {
        setConfiguration(prev => prev.map(item =>
            item.uuid === uuid ? { ...item, rotation: newRotation } : item
        ));
    };

    const handleItemMirror = (uuid) => {
        setConfiguration(prev => prev.map(item =>
            item.uuid === uuid ? { ...item, mirrored: !item.mirrored } : item
        ));
    };

    const handleSelectStone = (stoneId) => {
        if (!activeItemUuid) return;
        setConfiguration(prev => prev.map(item =>
            item.uuid === activeItemUuid ? { ...item, id: stoneId } : item
        ));
    };

    const handleRemove = (uuid) => {
        setConfiguration(prev => prev.filter(item => item.uuid !== uuid));
        if (activeItemUuid === uuid) setActiveItemUuid(null);
    };

    const handleClear = () => {
        setConfiguration([]);
        setActiveItemUuid(null);
    };

    const handleCanvasReady = (ref) => {
        canvasRef.current = ref.current;
    };

    const handleExport = () => {
        if (canvasRef.current) {
            const url = canvasRef.current.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = "my-custom-jewelry.png";
            link.href = url;
            link.click();
        }
    };

    const [isProcessing, setIsProcessing] = useState(false);

    const handleAddToCart = async () => {
        if (!canvasRef.current || configuration.length === 0) return;

        setIsProcessing(true);
        try {
            const imageData = canvasRef.current.toDataURL("image/png");

            // Call the backend function
            const response = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    baseProductId: BASE_CONFIG.id,
                    configuration: configuration,
                    previewImage: imageData, // Send image if you want to store it or use it (backend currently ignores it but good to have)
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate checkout');
            }

            if (data.invoice_url) {
                // Redirect user to Shopify Checkout
                window.location.href = data.invoice_url;
            } else {
                alert("Error: No invoice URL returned from backend.");
            }

        } catch (error) {
            console.error("Checkout Error:", error);
            alert("Checkout Failed: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const [calibration, setCalibration] = useState({
        radiusX: BASE_CONFIG.layout.radiusX,
        radiusY: BASE_CONFIG.layout.radiusY,
        rotation: 0, // degrees
    });

    const handleCalibrationChange = (e) => {
        const { name, value } = e.target;
        setCalibration(prev => ({
            ...prev,
            [name]: parseFloat(value)
        }));
    };

    const handleDrop = (dropData) => {
        // dropData = { id, angle }
        const newItem = {
            uuid: generateUuid(),
            id: dropData.id,
            angle: dropData.angle,
            rotation: 0,
            mirrored: false,
        };
        setConfiguration(prev => [...prev, newItem]);
        setActiveItemUuid(newItem.uuid);
    };

    return (
        <div className="configurator-layout">
            <div className="preview-area">
                <div className="canvas-container">
                    <CanvasPreview
                        configuration={configuration}
                        onCanvasReady={handleCanvasReady}
                        calibration={calibration}
                        onCanvasClick={handleCanvasClick}
                        onDrop={handleDrop}
                        onItemMove={handleItemMove}
                        onItemRotate={handleItemRotate}
                        onItemMirror={handleItemMirror}
                    />

                </div>
            </div>
            <div className="sidebar">
                <Controls
                    configuration={configuration}
                    activeItemUuid={activeItemUuid}
                    onSelectStone={handleSelectStone}
                    onRemove={handleRemove}
                    onClear={handleClear}
                    onExport={handleExport}
                    onAddToCart={handleAddToCart}
                    isProcessing={isProcessing}
                />
            </div>
        </div>
    );
};

export default JewelryConfigurator;
