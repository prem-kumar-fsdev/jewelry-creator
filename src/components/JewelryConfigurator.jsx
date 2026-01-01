import React, { useState, useRef } from "react";
import CanvasPreview from "./CanvasPreview";
import Controls from "./Controls";
import { BASE_CONFIG } from "../data/jewelryData";

const JewelryConfigurator = () => {
    // Initialize with empty slots (null)
    const [configuration, setConfiguration] = useState(
        Array(BASE_CONFIG.slotCount).fill(null)
    );
    const [activeSlot, setActiveSlot] = useState(null);
    const canvasRef = useRef(null);

    const handleSelectSlot = (index) => {
        setActiveSlot(index);
    };

    const handleSelectStone = (stoneId) => {
        if (activeSlot === null) {
            // If no slot selected, maybe find first empty? Or just ignore.
            // Let's auto-select first empty if none selected, or just do nothing.
            // Better UX: Do nothing, user must select slot.
            alert("Please select a bead position first.");
            return;
        }
        const newConfig = [...configuration];
        newConfig[activeSlot] = stoneId;
        setConfiguration(newConfig);
    };

    const handleRemove = (index) => {
        const newConfig = [...configuration];
        newConfig[index] = null;
        setConfiguration(newConfig);
    };

    const handleClear = () => {
        setConfiguration(Array(BASE_CONFIG.slotCount).fill(null));
        setActiveSlot(null);
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

    return (
        <div className="configurator-layout">
            <div className="preview-area" style={{ flexDirection: 'column' }}>
                <CanvasPreview
                    configuration={configuration}
                    onCanvasReady={handleCanvasReady}
                    calibration={calibration}
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
                    activeSlot={activeSlot}
                    onSelectSlot={handleSelectSlot}
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
