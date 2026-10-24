import React, { useState, useRef } from "react";
import CanvasPreview from "./CanvasPreview";
import Controls from "./Controls";
import { COMPONENTS, EARRING_STYLES } from "../data/jewelryData";

const JewelryConfigurator = ({ variantConfig, isActive = true }) => {
    const isEarring = variantConfig.type === 'earrings';

    const [configuration, setConfiguration] = useState([]);
    const [activeItemUuid, setActiveItemUuid] = useState(null);
    const [selectedMetal, setSelectedMetal] = useState("gold");
    const [selectedChainStyle, setSelectedChainStyle] = useState("cable");
    const [selectedBackdrop, setSelectedBackdrop] = useState("studio-white");
    const [selectedEarringStyle, setSelectedEarringStyle] = useState("baroque-larimar");
    const [selectedEarringHardware, setSelectedEarringHardware] = useState("hook"); // 'hook', 'post', 'wire'
    const [earringChain, setEarringChain] = useState([]);
    const [mobileView, setMobileView] = useState("split"); // 'split' | 'studio' | 'controls'

    const canvasRef = useRef(null);

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
            const styleTag = isEarring ? `-${selectedEarringStyle}` : '';
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
        <div className={`sj-legacy-layout ${mobileView === 'studio' ? 'is-expanded' : ''}`}>
            <div className="sj-legacy-gallery"><button className="sj-present-button sj-legacy-expand" onClick={() => setMobileView(mobileView === 'studio' ? 'split' : 'studio')}>{mobileView === 'studio' ? 'Close expanded view' : '⛶ Expand view'}</button>
                <CanvasPreview
                    isActive={isActive}
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
            </div>
            <div className="sj-legacy-sidebar">
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
