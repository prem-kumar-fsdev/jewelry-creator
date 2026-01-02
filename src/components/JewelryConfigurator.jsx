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

    const handleAddToCart = () => {
        if (canvasRef.current) {
            const imageData = canvasRef.current.toDataURL("image/png");
            const orderPayload = {
                baseProductId: BASE_CONFIG.id,
                configuration: configuration,
                previewImage: imageData,
                timestamp: new Date().toISOString(),
            };
            console.log("Adding to cart:", orderPayload);
            alert("Added to cart! Check console for payload.");
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
        };
        setConfiguration(prev => [...prev, newItem]);
        setActiveItemUuid(newItem.uuid);
    };

    return (
        <div className="configurator-layout">
            <div className="preview-area" style={{ flexDirection: 'column' }}>
                <CanvasPreview
                    configuration={configuration}
                    onCanvasReady={handleCanvasReady}
                    calibration={calibration}
                    onCanvasClick={handleCanvasClick}
                    onDrop={handleDrop}
                />

                {/* Calibration Controls */}
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '20px',
                    color: 'white'
                }}>
                    <label>
                        Radius X: {calibration.radiusX}px
                        <input
                            type="range"
                            name="radiusX"
                            min="100"
                            max="300"
                            value={calibration.radiusX}
                            onChange={handleCalibrationChange}
                            style={{ display: 'block', width: '200px' }}
                        />
                    </label>
                    <label>
                        Radius Y: {calibration.radiusY}px
                        <input
                            type="range"
                            name="radiusY"
                            min="100"
                            max="300"
                            value={calibration.radiusY}
                            onChange={handleCalibrationChange}
                            style={{ display: 'block', width: '200px' }}
                        />
                    </label>
                    <label>
                        Rotation: {calibration.rotation}°
                        <input
                            type="range"
                            name="rotation"
                            min="-180"
                            max="180"
                            value={calibration.rotation}
                            onChange={handleCalibrationChange}
                            style={{ display: 'block', width: '200px' }}
                        />
                    </label>
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
                />
            </div>
        </div>
    );
};

export default JewelryConfigurator;
