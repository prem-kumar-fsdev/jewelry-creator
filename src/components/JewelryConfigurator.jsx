import React, { useState, useRef } from "react";
import CanvasPreview from "./CanvasPreview";
import Controls from "./Controls";
import Earrings3DStudio, { EARRING_STYLES } from "./Earrings3DStudio";
import { COMPONENTS } from "../data/jewelryData";

class StudioErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("3D Studio Crash:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ position: 'absolute', inset: 0, background: '#1a0000', color: '#ff4444', padding: '2rem', zIndex: 9999, overflow: 'auto' }}>
                    <h3>3D Studio Render Error</h3>
                    <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>{this.state.error?.stack || this.state.error?.message}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const JewelryConfigurator = ({ variantConfig, isActive = true }) => {
    const isEarring = variantConfig.type === 'earrings';

    const [configuration, setConfiguration] = useState([]);
    const [activeItemUuid, setActiveItemUuid] = useState(null);
    const [selectedMetal, setSelectedMetal] = useState("gold");
    const [selectedChainStyle, setSelectedChainStyle] = useState("cable");
    const [selectedBackdrop, setSelectedBackdrop] = useState("velvet-emerald");
    const [selectedEarringStyle, setSelectedEarringStyle] = useState("baroque-larimar");
    const [selectedEarringHardware, setSelectedEarringHardware] = useState("hook"); // 'hook', 'post', 'wire'
    const [earringStudioMode, setEarringStudioMode] = useState("3d"); // '3d' or '2d'
    const [earringChain, setEarringChain] = useState([]);

    const canvasRef = useRef(null);

    const is3DEarring = isEarring && earringStudioMode === '3d';
    const generateUuid = () => Math.random().toString(36).substr(2, 9);

    const handleAttachEarringStone = (stoneId) => {
        if (earringChain.length >= 6) {
            alert("Maximum cascade tiers reached (6 tiers).");
            return;
        }
        setEarringChain(prev => [...prev, stoneId]);
    };

    const handleRemoveLastEarringStone = () => {
        setEarringChain(prev => prev.slice(0, -1));
    };

    const handleRemoveEarringStoneAtIndex = (index) => {
        setEarringChain(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleResetEarringChain = () => {
        setEarringChain([]);
    };

    const handleCanvasClick = (clickData) => {
        if (clickData.type === 'add') {
            if (configuration.length >= (variantConfig.maxComponents || 16)) {
                return;
            }
            const newItem = {
                uuid: generateUuid(),
                id: null, // null = base bead
                angle: clickData.angle,
                side: clickData.side || 'left',
                rotation: 0,
                mirrored: false,
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
            const styleTag = is3DEarring ? `-${selectedEarringStyle}` : '';
            link.download = `my-custom-${variantConfig.type}${styleTag}-${selectedMetal}.png`;
            link.href = url;
            link.click();
        }
    };

    const [isProcessing, setIsProcessing] = useState(false);

    const handleAddToCart = async () => {
        if (!canvasRef.current || (!isEarring && configuration.length === 0)) return;

        setIsProcessing(true);
        try {
            const imageData = canvasRef.current.toDataURL("image/png");

            const response = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    baseProductId: variantConfig.id,
                    jewelryType: variantConfig.type,
                    metal: selectedMetal,
                    chainStyle: isEarring ? selectedEarringStyle : selectedChainStyle,
                    earringStyle: selectedEarringStyle,
                    earringHardware: isEarring ? selectedEarringHardware : undefined,
                    configuration: isEarring
                        ? [
                            { id: selectedEarringStyle, name: EARRING_STYLES[selectedEarringStyle]?.name || "Custom Fine Drop Earrings" },
                            ...earringChain.map(id => {
                                const c = COMPONENTS.find(item => item.id === id);
                                return { id, name: c ? `${c.name} (Cascade Tier)` : id };
                            })
                          ]
                        : configuration,
                    previewImage: imageData,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate checkout');
            }

            if (data.invoice_url) {
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

    const handleDrop = (dropData) => {
        if (configuration.length >= (variantConfig.maxComponents || 16)) return;
        const newItem = {
            uuid: generateUuid(),
            id: dropData.id,
            angle: dropData.angle,
            side: dropData.side || 'left',
            rotation: 0,
            mirrored: false,
        };
        setConfiguration(prev => [...prev, newItem]);
        setActiveItemUuid(newItem.uuid);
    };

    return (
        <div className="configurator-layout">
            <div className="preview-area">
                {/* Animated studio background overlay */}
                <div className="studio-ambient-glow" />
                <div className="studio-vignette-frame" />

                {/* Studio Watermark & Mode Switcher Header */}
                <div className="studio-top-controls">
                    <div className="studio-watermark">
                        <span className="watermark-icon">◇</span>
                        <span className="watermark-text">3D ATELIER STUDIO</span>
                    </div>

                    {/* Mode Toggle for Earrings */}
                    {isEarring && (
                        <div className="studio-mode-toggle">
                            <button
                                type="button"
                                className={`mode-toggle-btn ${earringStudioMode === '3d' ? 'active' : ''}`}
                                onClick={() => setEarringStudioMode('3d')}
                            >
                                <span className="mode-icon">🌟</span>
                                <span className="mode-label">3D Real Physics</span>
                            </button>
                            <button
                                type="button"
                                className={`mode-toggle-btn ${earringStudioMode === '2d' ? 'active' : ''}`}
                                onClick={() => setEarringStudioMode('2d')}
                            >
                                <span className="mode-icon">📐</span>
                                <span className="mode-label">2D Canvas</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Viewport: Either 3D Three.js Earrings Studio OR 2D Canvas */}
                {is3DEarring && isActive ? (
                    <StudioErrorBoundary>
                        <Earrings3DStudio
                            selectedMetal={selectedMetal}
                            selectedBackdrop={selectedBackdrop}
                            earringStyle={selectedEarringStyle}
                            selectedEarringHardware={selectedEarringHardware}
                            attachedChain={earringChain}
                            onAttachStone={handleAttachEarringStone}
                            onRemoveLastStone={handleRemoveLastEarringStone}
                            onResetChain={handleResetEarringChain}
                            onCanvasReady={handleCanvasReady}
                        />
                    </StudioErrorBoundary>
                ) : (
                    <CanvasPreview
                        variantConfig={variantConfig}
                        configuration={configuration}
                        selectedMetal={selectedMetal}
                        selectedChainStyle={selectedChainStyle}
                        selectedBackdrop={selectedBackdrop}
                        selectedEarringStyle={selectedEarringStyle}
                        selectedEarringHardware={selectedEarringHardware}
                        earringChain={earringChain}
                        onAttachEarringStone={handleAttachEarringStone}
                        onCanvasReady={handleCanvasReady}
                        onCanvasClick={handleCanvasClick}
                        onDrop={handleDrop}
                        onItemMove={handleItemMove}
                        onItemRotate={handleItemRotate}
                        onItemMirror={handleItemMirror}
                    />
                )}

                {/* Floating Summary Bar at Bottom (2D Canvas only) */}
                {!is3DEarring && (
                    <div className="preview-summary-bar">
                        <span className="summary-badge metal-badge">
                            ✨ {selectedMetal === 'gold' ? '18k Yellow Gold' : selectedMetal === 'roseGold' ? '18k Rose Gold' : 'Platinum White Gold'}
                        </span>
                        {isEarring && (
                            <span className="summary-badge hardware-badge">
                                {selectedEarringHardware === 'post' ? '🧷 Ear Post' : selectedEarringHardware === 'wire' ? '➰ Kidney Wire' : '🪝 French Hook'}
                            </span>
                        )}
                        <span className="summary-badge style-badge">
                            {isEarring
                                ? `💎 ${EARRING_STYLES[selectedEarringStyle]?.name || 'Articulated Drop'}`
                                : `⛓️ ${selectedChainStyle === 'cable' ? 'Luxury Cable' : selectedChainStyle === 'cuban' ? 'Diamond Cuban' : selectedChainStyle === 'rope' ? 'Twisted Rope' : 'Elongated Clip'}`
                            }
                        </span>
                        <span className="summary-badge count-badge">
                            {isEarring
                                ? `✨ ${earringChain.length} ${earringChain.length === 1 ? 'Tier Chained' : 'Tiers Chained'}`
                                : `💎 ${configuration.length} ${configuration.length === 1 ? 'Stone Placed' : 'Stones Placed'}`
                            }
                        </span>
                    </div>
                )}
            </div>

            {/* Sidebar Controls */}
            <div className="sidebar">
                <Controls
                    variantConfig={variantConfig}
                    configuration={configuration}
                    activeItemUuid={activeItemUuid}
                    selectedMetal={selectedMetal}
                    onSelectMetal={setSelectedMetal}
                    selectedChainStyle={selectedChainStyle}
                    onSelectChainStyle={setSelectedChainStyle}
                    selectedBackdrop={selectedBackdrop}
                    onSelectBackdrop={setSelectedBackdrop}
                    selectedEarringStyle={selectedEarringStyle}
                    onSelectEarringStyle={setSelectedEarringStyle}
                    selectedEarringHardware={selectedEarringHardware}
                    onSelectEarringHardware={setSelectedEarringHardware}
                    earringStudioMode={earringStudioMode}
                    earringChain={earringChain}
                    onAttachEarringStone={handleAttachEarringStone}
                    onRemoveLastEarringStone={handleRemoveLastEarringStone}
                    onRemoveEarringStoneAtIndex={handleRemoveEarringStoneAtIndex}
                    onResetEarringChain={handleResetEarringChain}
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
