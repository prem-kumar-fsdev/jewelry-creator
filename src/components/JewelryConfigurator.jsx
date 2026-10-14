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
    const [selectedBackdrop, setSelectedBackdrop] = useState("velvet-emerald");
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
        <div className="flex flex-col lg:flex-row h-[calc(100vh-88px)] sm:h-[calc(100vh-72px)] overflow-hidden bg-[#f7f5f2]">
            {/* Viewport Canvas */}
            <div
                className={`relative overflow-hidden bg-[#0a0a0a] p-0 transition-all duration-300 ${
                    mobileView === 'studio'
                        ? 'h-full w-full shrink-0 z-30'
                        : mobileView === 'controls'
                        ? 'hidden lg:flex lg:flex-1 lg:h-full shrink-0 lg:shrink'
                        : 'h-[44vh] sm:h-[50vh] lg:h-full lg:flex-1 w-full shrink-0 lg:shrink'
                }`}
            >
                {/* Animated studio background overlay */}
                <div className="absolute inset-0 pointer-events-none z-[2] bg-[radial-gradient(ellipse_80%_60%_at_30%_40%,rgba(201,169,98,0.05)_0%,transparent_70%),radial-gradient(ellipse_60%_80%_at_70%_60%,rgba(201,169,98,0.03)_0%,transparent_65%)]" />
                <div className="absolute inset-0 pointer-events-none z-[2] shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]" />

                {/* Studio Header & View Controls */}
                <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-6 sm:right-6 z-20 flex items-center justify-between pointer-events-none gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-[10px] sm:text-[11px] font-medium tracking-[1.5px] uppercase shrink-0">
                        <span className="text-[#c9a962]">◇</span>
                        <span className="hidden xs:inline">ATELIER STUDIO</span>
                        <span className="xs:hidden">ATELIER</span>
                    </div>

                    <div className="flex items-center gap-1.5 pointer-events-auto ml-auto">
                        {/* Mobile Expand Studio Toggle Button */}
                        <div className="lg:hidden flex items-center p-0.5 sm:p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-lg">
                            <button
                                type="button"
                                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                onClick={() => setMobileView(prev => prev === 'studio' ? 'split' : 'studio')}
                                title={mobileView === 'studio' ? "Restore split controls view" : "Expand studio view"}
                            >
                                <span>{mobileView === 'studio' ? '⇲' : '⛶'}</span>
                                <span>{mobileView === 'studio' ? 'Split' : 'Expand'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Viewport Canvas */}
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

                {/* Floating Switcher on Mobile when in Full Studio View */}
                {mobileView === 'studio' && (
                    <div className="lg:hidden absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                        <button
                            type="button"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/85 backdrop-blur-md border border-[#c9a962]/50 text-white shadow-2xl text-xs font-medium cursor-pointer hover:bg-black"
                            onClick={() => setMobileView('split')}
                        >
                            <span>⚙️</span>
                            <span>Atelier Controls & Options</span>
                            <span className="text-[#c9a962]">→</span>
                        </button>
                    </div>
                )}

                {/* Floating Summary Bar at Bottom (hidden on very small portrait mobile to keep view clean) */}
                {mobileView !== 'studio' && (
                    <div className="hidden sm:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex-wrap items-center justify-center gap-1.5 max-w-[90%] pointer-events-none">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium shadow-lg">
                            ✨ {selectedMetal === 'gold' ? '18k Yellow Gold' : selectedMetal === 'roseGold' ? '18k Rose Gold' : 'Platinum White Gold'}
                        </span>
                        {isEarring && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium shadow-lg">
                                {selectedEarringHardware === 'post' ? '🧷 Ear Post' : selectedEarringHardware === 'wire' ? '➰ Kidney Wire' : '🪝 French Hook'}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium shadow-lg">
                            {isEarring
                                ? `💎 ${EARRING_STYLES[selectedEarringStyle]?.name || 'Articulated Drop'}`
                                : `⛓️ ${selectedChainStyle === 'cable' ? 'Luxury Cable' : selectedChainStyle === 'cuban' ? 'Diamond Cuban' : selectedChainStyle === 'rope' ? 'Twisted Rope' : 'Elongated Clip'}`
                            }
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium shadow-lg">
                            {isEarring
                                ? `✨ ${earringChain.length} ${earringChain.length === 1 ? 'Tier Chained' : 'Tiers Chained'}`
                                : `💎 ${configuration.length} ${configuration.length === 1 ? 'Stone Placed' : 'Stones Placed'}`
                            }
                        </span>
                    </div>
                )}
            </div>

            <div
                className={`w-full lg:w-[560px] xl:w-[580px] bg-white border-t lg:border-t-0 lg:border-l border-[#e6e3dc] overflow-y-auto transition-all duration-300 ${
                    mobileView === 'studio'
                        ? 'hidden lg:block lg:h-full lg:flex-none'
                        : mobileView === 'controls'
                        ? 'h-full w-full'
                        : 'flex-1 min-h-0 lg:h-full lg:flex-none'
                }`}
            >
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
