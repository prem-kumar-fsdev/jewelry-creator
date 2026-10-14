import React, { useState, useRef, useEffect } from "react";
import { COMPONENTS, METALS, CHAIN_STYLES, BACKDROPS, EARRING_HARDWARE, EARRING_STYLES } from "../data/jewelryData";
import { drawProngLarimarCabochon, drawProngKeshiPearl, drawProngBaroqueCoinPearl } from "../utils/photorealisticRenderer";

const SeededStoneCanvasThumb = ({ renderType, metalKey = "gold" }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 80, 80);

        if (renderType === 'larimar') {
            drawProngLarimarCabochon(ctx, 40, 40, 0, 36, metalKey, true);
        } else if (renderType === 'keshi') {
            drawProngKeshiPearl(ctx, 40, 40, 0, 26, 46, metalKey, true);
        } else if (renderType === 'baroque-coin') {
            drawProngBaroqueCoinPearl(ctx, 40, 40, 0, 48, 54, metalKey, true);
        }
    }, [renderType, metalKey]);

    return (
        <canvas
            ref={canvasRef}
            width={80}
            height={80}
            className="w-full h-full object-contain pointer-events-none"
        />
    );
};

const EARRING_PRICES = {
    'baroque-larimar': 14500,
    'royal-chandelier': 18500,
    'solitaire-drop': 22000,
    'amethyst-cascade': 12800,
    'emerald-cabochon': 16000
};

const Controls = ({
    variantConfig,
    configuration,
    activeItemUuid,
    selectedMetal = "gold",
    onSelectMetal,
    selectedChainStyle = "cable",
    onSelectChainStyle,
    selectedBackdrop = "velvet-emerald",
    onSelectBackdrop,
    selectedEarringStyle = "baroque-larimar",
    onSelectEarringStyle,
    selectedEarringHardware = "hook",
    onSelectEarringHardware,
    earringChain = [],
    onAttachEarringStone,
    onRemoveLastEarringStone,
    onRemoveEarringStoneAtIndex,
    onResetEarringChain,
    onSelectStone,
    onRemove,
    onClear,
    onExport,
    onAddToCart,
    isProcessing = false
}) => {
    const [openSections, setOpenSections] = useState({
        metal: true,
        hardware: true,
        silhouette: false,
        stones: true,
        backdrop: false,
        craftsmanship: false
    });
    const [stoneCategory, setStoneCategory] = useState("all");

    const toggleSection = (key) => {
        setOpenSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const expandAll = () => {
        setOpenSections({
            metal: true,
            hardware: true,
            silhouette: true,
            stones: true,
            backdrop: true,
            craftsmanship: true
        });
    };

    const collapseAll = () => {
        setOpenSections({
            metal: false,
            hardware: false,
            silhouette: false,
            stones: false,
            backdrop: false,
            craftsmanship: false
        });
    };

    const isEarring = variantConfig?.type === 'earrings';

    const showEarringCascade = isEarring;

    const basePrice = isEarring
        ? (EARRING_PRICES[selectedEarringStyle] || 14500)
        : (variantConfig?.basePrice || 5000);

    const componentsPrice = configuration.reduce((sum, item) => {
        if (!item.id) return sum;
        const comp = COMPONENTS.find((c) => c.id === item.id);
        return sum + (comp ? comp.price : 0);
    }, 0);

    // Chained earring stones price (pair price: each stone tier price * 2)
    const earringChainPrice = earringChain.reduce((sum, stoneId) => {
        const comp = COMPONENTS.find(c => c.id === stoneId);
        return sum + (comp ? comp.price * 2 : 0);
    }, 0);

    const totalPrice = isEarring
        ? basePrice + earringChainPrice
        : basePrice + componentsPrice;

    const activeItem = activeItemUuid ? configuration.find(i => i.uuid === activeItemUuid) : null;
    const activeComp = activeItem && activeItem.id ? COMPONENTS.find(c => c.id === activeItem.id) : null;
    const currentMetal = METALS[selectedMetal] || METALS.gold;
    const currentEarringStyle = EARRING_STYLES[selectedEarringStyle] || EARRING_STYLES['baroque-larimar'];
    const currentHardware = EARRING_HARDWARE[selectedEarringHardware] || EARRING_HARDWARE.hook;

    const canAction = isEarring || configuration.length > 0;

    return (
        <div className="controls-panel">
            {/* Product Header */}
            <div className="product-header">
                <div className="variant-tag">
                    {isEarring ? "Articulated Fine Drop Earrings" : (variantConfig?.shortName || "Jewelry")} • {currentMetal.shortName}
                </div>
                <h1 className="product-title">
                    {isEarring ? currentEarringStyle.name : (variantConfig?.name || "Custom Jewelry")}
                </h1>
                <div className="product-price">PKR {totalPrice.toLocaleString()}</div>
                <div className="price-breakdown">
                    <span>Base: PKR {basePrice.toLocaleString()}</span>
                    {isEarring && earringChainPrice > 0 && (
                        <span>+ Chained Pearls/Stones (Pair): PKR {earringChainPrice.toLocaleString()}</span>
                    )}
                    {!isEarring && componentsPrice > 0 && (
                        <span>+ Stones: PKR {componentsPrice.toLocaleString()}</span>
                    )}
                </div>
            </div>

            {/* Accordions Global Action Bar */}
            <div className="accordion-global-bar">
                <span className="global-bar-title">ATELIER CONFIGURATION</span>
                <div className="global-bar-actions">
                    <button type="button" className="text-btn-subtle" onClick={expandAll}>
                        Expand All
                    </button>
                    <span className="dot-sep">•</span>
                    <button type="button" className="text-btn-subtle" onClick={collapseAll}>
                        Collapse All
                    </button>
                </div>
            </div>

            <div className="luxury-accordion-stack">
                {/* =========================================================================
                    ACCORDION 01: PRECIOUS METAL
                   ========================================================================= */}
                <div className={`luxury-accordion-item ${openSections.metal ? 'is-open' : ''}`}>
                    <button
                        type="button"
                        className="luxury-accordion-trigger"
                        onClick={() => toggleSection('metal')}
                        aria-expanded={openSections.metal}
                    >
                        <div className="accordion-title-group">
                            <div className="accordion-title-text">
                                <h3 className="luxury-accordion-title">Precious Metal</h3>
                                <span className="luxury-accordion-sub">{currentMetal.name}</span>
                            </div>
                        </div>
                        <div className="accordion-meta-group">
                            <span
                                className="accordion-swatch-badge"
                                style={{ background: currentMetal.swatch }}
                                title={currentMetal.name}
                            />
                            <span className="luxury-accordion-chevron">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </span>
                        </div>
                    </button>

                    <div className="luxury-accordion-collapse">
                        <div className="luxury-accordion-inner">
                            <div className="metal-selector-grid">
                                {Object.values(METALS).map((metal) => {
                                    const isSelected = selectedMetal === metal.id;
                                    return (
                                        <button
                                            key={metal.id}
                                            type="button"
                                            className={`metal-btn ${isSelected ? "active" : ""}`}
                                            onClick={() => onSelectMetal && onSelectMetal(metal.id)}
                                        >
                                            <span
                                                className="metal-swatch"
                                                style={{ background: metal.swatch }}
                                            />
                                            <span className="metal-name">{metal.shortName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* =========================================================================
                    ACCORDION: EARRING ATTACHMENT / HARDWARE (Earrings Only)
                   ========================================================================= */}
                {isEarring && (
                    <div className={`luxury-accordion-item ${openSections.hardware ? 'is-open' : ''}`}>
                        <button
                            type="button"
                            className="luxury-accordion-trigger"
                            onClick={() => toggleSection('hardware')}
                            aria-expanded={openSections.hardware}
                        >
                            <div className="accordion-title-group">
                                <div className="accordion-title-text">
                                    <h3 className="luxury-accordion-title">Earring Attachment</h3>
                                    <span className="luxury-accordion-sub">{currentHardware.name}</span>
                                </div>
                            </div>
                            <div className="accordion-meta-group">
                                <span className="luxury-meta-pill">
                                    {currentHardware.tag}
                                </span>
                                <span className="luxury-accordion-chevron">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </span>
                            </div>
                        </button>

                        <div className="luxury-accordion-collapse">
                            <div className="luxury-accordion-inner">
                                <div className="hardware-selector-grid">
                                    {Object.values(EARRING_HARDWARE).map((hw) => {
                                        const isSelected = selectedEarringHardware === hw.id;
                                        return (
                                            <button
                                                key={hw.id}
                                                type="button"
                                                className={`hardware-card ${isSelected ? 'active' : ''}`}
                                                onClick={() => onSelectEarringHardware && onSelectEarringHardware(hw.id)}
                                            >
                                                <div className="hardware-card-header">
                                                    <span className="hardware-card-title">{hw.name}</span>
                                                    <span className={`hardware-tag ${isSelected ? 'active' : ''}`}>{hw.tag}</span>
                                                </div>
                                                <p className="hardware-card-desc">{hw.description}</p>
                                                <div className="hardware-card-footer">
                                                    <span className="hardware-spec">18k Solid Gold Cast</span>
                                                    {isSelected && <span className="hardware-active-indicator">Selected ✓</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================
                    ACCORDION 02: ATELIER SILHOUETTE / CHAIN WEAVE
                   ========================================================================= */}
                <div className={`luxury-accordion-item ${openSections.silhouette ? 'is-open' : ''}`}>
                    <button
                        type="button"
                        className="luxury-accordion-trigger"
                        onClick={() => toggleSection('silhouette')}
                        aria-expanded={openSections.silhouette}
                    >
                        <div className="accordion-title-group">
                            <div className="accordion-title-text">
                                <h3 className="luxury-accordion-title">
                                    {isEarring ? "Atelier Silhouette" : "Chain Weave Style"}
                                </h3>
                                <span className="luxury-accordion-sub">
                                    {isEarring ? currentEarringStyle.name : (CHAIN_STYLES[selectedChainStyle]?.name || "Luxury Cable")}
                                </span>
                            </div>
                        </div>
                        <div className="accordion-meta-group">
                            <span className="luxury-meta-pill">
                                {isEarring ? "5 Silhouettes" : "4 Styles"}
                            </span>
                            <span className="luxury-accordion-chevron">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </span>
                        </div>
                    </button>

                    <div className="luxury-accordion-collapse">
                        <div className="luxury-accordion-inner">
                            {isEarring ? (
                                <div className="earring-styles-grid">
                                    {Object.values(EARRING_STYLES).map((style) => {
                                        const isSelected = selectedEarringStyle === style.id;
                                        const price = EARRING_PRICES[style.id] || 14500;
                                        return (
                                            <button
                                                key={style.id}
                                                type="button"
                                                className={`earring-style-card ${isSelected ? "active" : ""}`}
                                                onClick={() => onSelectEarringStyle && onSelectEarringStyle(style.id)}
                                            >
                                                <div className="earring-style-header">
                                                    <span className="earring-style-title">{style.name}</span>
                                                    {style.id === 'baroque-larimar' && (
                                                        <span className="featured-badge">Featured</span>
                                                    )}
                                                </div>
                                                <p className="earring-style-desc">{style.description}</p>
                                                <div className="earring-style-price">PKR {price.toLocaleString()}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="chain-styles-grid">
                                    {Object.values(CHAIN_STYLES).map((style) => {
                                        const isSelected = selectedChainStyle === style.id;
                                        return (
                                            <button
                                                key={style.id}
                                                type="button"
                                                className={`chain-style-btn ${isSelected ? "active" : ""}`}
                                                onClick={() => onSelectChainStyle && onSelectChainStyle(style.id)}
                                                title={style.description}
                                            >
                                                <span className="chain-style-name">{style.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* =========================================================================
                    ACCORDION 03: CASCADE PEARLS & STONES OR STONES & BEADS
                   ========================================================================= */}
                <div className={`luxury-accordion-item ${openSections.stones ? 'is-open' : ''}`}>
                    <button
                        type="button"
                        className="luxury-accordion-trigger"
                        onClick={() => toggleSection('stones')}
                        aria-expanded={openSections.stones}
                    >
                        <div className="accordion-title-group">
                            <div className="accordion-title-text">
                                <h3 className="luxury-accordion-title">
                                    {showEarringCascade ? "Cascade Pearls & Stones" : "Stones & Beads"}
                                </h3>
                                <span className="luxury-accordion-sub">
                                    {showEarringCascade
                                        ? (earringChain.length === 0 ? "Ready to customize" : `${earringChain.length} / 6 Tiers Chained`)
                                        : `${configuration.length} / ${variantConfig?.maxComponents || 16} Placed`}
                                </span>
                            </div>
                        </div>
                        <div className="accordion-meta-group">
                            {showEarringCascade && earringChain.length > 0 ? (
                                <span className="luxury-count-pill">{earringChain.length} Tiers</span>
                            ) : !showEarringCascade && configuration.length > 0 ? (
                                <span className="luxury-count-pill">{configuration.length} Placed</span>
                            ) : null}
                            <span className="luxury-accordion-chevron">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </span>
                        </div>
                    </button>

                    <div className="luxury-accordion-collapse">
                        <div className="luxury-accordion-inner">
                            {/* Chained Pearls & Stones Atelier for Earrings */}
                            {showEarringCascade && (
                                <div className="cascade-atelier-section">
                                    <div className="option-label" style={{ marginBottom: '0.6rem' }}>
                                        <span className="option-value">
                                            {earringChain.length} / 6 Tiers Chained
                                        </span>
                                        {earringChain.length > 0 && (
                                            <button
                                                type="button"
                                                className="text-btn danger"
                                                onClick={onResetEarringChain}
                                                style={{ marginLeft: 'auto' }}
                                            >
                                                Reset All
                                            </button>
                                        )}
                                    </div>

                                    {/* Minimal Atelier Guidance Note */}
                                    <div className="minimal-atelier-hint">
                                        <span className="hint-symbol">◇</span>
                                        <span>Tap <strong>+ Attach</strong> or drag pearls to extend cascade tiers (max 6 tiers)</span>
                                    </div>

                                    {/* Category Filter Tabs */}
                                    <div className="stone-category-tabs">
                                        <button
                                            type="button"
                                            className={`category-tab ${stoneCategory === 'all' ? 'active' : ''}`}
                                            onClick={() => setStoneCategory('all')}
                                        >
                                            All Assets
                                        </button>
                                        <button
                                            type="button"
                                            className={`category-tab ${stoneCategory === 'pearl' ? 'active' : ''}`}
                                            onClick={() => setStoneCategory('pearl')}
                                        >
                                            ✨ Lustrous Pearls
                                        </button>
                                        <button
                                            type="button"
                                            className={`category-tab ${stoneCategory === 'gemstone' ? 'active' : ''}`}
                                            onClick={() => setStoneCategory('gemstone')}
                                        >
                                            💎 Cut Gemstones
                                        </button>
                                    </div>

                                    {/* Draggable Component Cards Grid */}
                                    <div className="components-grid stones-grid-cascade">
                                        {COMPONENTS.filter(comp => {
                                            if (!comp.forEarrings) return false;
                                            if (stoneCategory === 'pearl') return comp.type === 'pearl';
                                            if (stoneCategory === 'gemstone') return comp.type === 'gemstone';
                                            return true;
                                        }).map((comp) => (
                                            <div
                                                key={comp.id}
                                                className="component-card-cascade"
                                                draggable="true"
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("application/json", JSON.stringify({ id: comp.id, name: comp.name }));
                                                    e.dataTransfer.effectAllowed = "copy";
                                                }}
                                                title={`Drag into canvas or click to attach ${comp.name}`}
                                            >
                                                <div className="card-thumb-wrap">
                                                    {comp.renderType ? (
                                                        <SeededStoneCanvasThumb renderType={comp.renderType} metalKey={selectedMetal} />
                                                    ) : (
                                                        <img src={comp.image} alt={comp.name} />
                                                    )}
                                                    <span className="drag-cue-badge">Drag 🖐️</span>
                                                </div>
                                                <div className="card-info">
                                                    <div className="flex items-center justify-between gap-1 w-full">
                                                        <span className="comp-name">{comp.name}</span>
                                                        {comp.shapeTag && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#c9a962]/15 text-[#c9a962] font-semibold tracking-wide whitespace-nowrap">
                                                                {comp.shapeTag}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="comp-price">+PKR {(comp.price * 2).toLocaleString()} <span className="pair-sub">pair</span></span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="quick-attach-btn"
                                                    onClick={() => onAttachEarringStone && onAttachEarringStone(comp.id)}
                                                    title="Click to append to chain"
                                                >
                                                    + Attach
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Active Cascading Hierarchy Display */}
                                    <div className="chain-hierarchy-section">
                                        <div className="hierarchy-header">
                                            <h4>Active Cascading Chain</h4>
                                            {earringChain.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="text-btn danger"
                                                    onClick={onRemoveLastEarringStone}
                                                >
                                                    Undo Last
                                                </button>
                                            )}
                                        </div>

                                        <div className="hierarchy-tree">
                                            <div className="hierarchy-node base-node">
                                                <span className="node-icon">✨</span>
                                                <span className="node-label">{currentEarringStyle.name} (Base Drop)</span>
                                            </div>

                                            {earringChain.map((stoneId, idx) => {
                                                const comp = COMPONENTS.find(c => c.id === stoneId);
                                                return (
                                                    <div key={`${stoneId}-${idx}`} className="hierarchy-node chained-node">
                                                        <span className="node-link-connector">⛓️</span>
                                                        {comp?.renderType ? (
                                                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-black/10">
                                                                <SeededStoneCanvasThumb renderType={comp.renderType} metalKey={selectedMetal} />
                                                            </div>
                                                        ) : (
                                                            <img src={comp?.image} alt={comp?.name} className="node-thumb" />
                                                        )}
                                                        <span className="node-label">Tier {idx + 1}: {comp?.name || stoneId}</span>
                                                        <button
                                                            type="button"
                                                            className="node-delete-btn"
                                                            onClick={() => onRemoveEarringStoneAtIndex && onRemoveEarringStoneAtIndex(idx)}
                                                            title="Remove this tier"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {earringChain.length === 0 && (
                                                <div className="hierarchy-empty">
                                                    <span>No chained tiers yet. Drag any pearl or gemstone above to begin cascading!</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Non-Earring Stones & Beads Section (Necklaces & Bracelets) */}
                            {!showEarringCascade && (
                                <div>
                                    <div className="option-label" style={{ marginBottom: '0.6rem' }}>
                                        <span className="option-value">
                                            {configuration.length} / {variantConfig?.maxComponents || 16} placed
                                        </span>
                                        {configuration.length > 0 && (
                                            <button className="text-btn danger" onClick={onClear} style={{ marginLeft: 'auto' }}>
                                                Clear All
                                            </button>
                                        )}
                                    </div>

                                    {activeItem && (
                                        <div className="selected-info">
                                            <span>Editing: <strong>{activeComp ? activeComp.name : `${currentMetal.shortName} Bead`}</strong> {activeItem.side ? `(${activeItem.side} side)` : ""}</span>
                                            <button className="text-btn danger" onClick={() => onRemove(activeItem.uuid)}>
                                                Remove
                                            </button>
                                        </div>
                                    )}

                                    <div className="components-grid">
                                        {COMPONENTS.filter(comp => !comp.forEarrings).map((comp) => (
                                            <button
                                                key={comp.id}
                                                className={`component-btn ${activeItem && activeItem.id === comp.id ? 'active' : ''}`}
                                                onClick={() => onSelectStone(comp.id)}
                                                title={comp.name}
                                                draggable="true"
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("application/json", JSON.stringify({ id: comp.id }));
                                                    e.dataTransfer.effectAllowed = "copy";
                                                }}
                                            >
                                                <img src={comp.image} alt={comp.name} />
                                                <span className="comp-name">{comp.name}</span>
                                                <span className="comp-price">+PKR {comp.price.toLocaleString()}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* =========================================================================
                    ACCORDION 04: ATELIER BACKDROP
                   ========================================================================= */}
                <div className={`luxury-accordion-item ${openSections.backdrop ? 'is-open' : ''}`}>
                    <button
                        type="button"
                        className="luxury-accordion-trigger"
                        onClick={() => toggleSection('backdrop')}
                        aria-expanded={openSections.backdrop}
                    >
                        <div className="accordion-title-group">
                            <div className="accordion-title-text">
                                <h3 className="luxury-accordion-title">Atelier Backdrop</h3>
                                <span className="luxury-accordion-sub">
                                    {BACKDROPS[selectedBackdrop]?.name || "Emerald Velvet"}
                                </span>
                            </div>
                        </div>
                        <div className="accordion-meta-group">
                            <span
                                className="accordion-swatch-badge"
                                style={{ background: BACKDROPS[selectedBackdrop]?.swatch || '#09241b' }}
                                title={BACKDROPS[selectedBackdrop]?.name}
                            />
                            <span className="luxury-accordion-chevron">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </span>
                        </div>
                    </button>

                    <div className="luxury-accordion-collapse">
                        <div className="luxury-accordion-inner">
                            <div className="backdrop-selector-grid">
                                {Object.values(BACKDROPS).map((bd) => {
                                    const isSelected = selectedBackdrop === bd.id;
                                    return (
                                        <button
                                            key={bd.id}
                                            type="button"
                                            className={`backdrop-btn ${isSelected ? "active" : ""}`}
                                            onClick={() => onSelectBackdrop && onSelectBackdrop(bd.id)}
                                            title={bd.tagline}
                                        >
                                            <span
                                                className="backdrop-swatch"
                                                style={{ background: bd.swatch }}
                                            />
                                            <span className="backdrop-name">{bd.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* =========================================================================
                    ACCORDION 05: CRAFTSMANSHIP & ATELIER GUIDE
                   ========================================================================= */}
                <div className={`luxury-accordion-item ${openSections.craftsmanship ? 'is-open' : ''}`}>
                    <button
                        type="button"
                        className="luxury-accordion-trigger"
                        onClick={() => toggleSection('craftsmanship')}
                        aria-expanded={openSections.craftsmanship}
                    >
                        <div className="accordion-title-group">
                            <div className="accordion-title-text">
                                <h3 className="luxury-accordion-title">Atelier Guide & Details</h3>
                                <span className="luxury-accordion-sub">Bespoke Craftsmanship & Physics</span>
                            </div>
                        </div>
                        <div className="accordion-meta-group">
                            <span className="luxury-meta-pill">Guide</span>
                            <span className="luxury-accordion-chevron">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </span>
                        </div>
                    </button>

                    <div className="luxury-accordion-collapse">
                        <div className="luxury-accordion-inner">
                            {/* Instructions */}
                            <div className="instruction-box">
                                <p className="instruction-highlight">{variantConfig?.instruction}</p>
                                {isEarring ? (
                                    <>
                                        <p>• <strong>Interactive Physics:</strong> Tug or drag the earrings to feel the physical pendulum motion.</p>
                                        <p>• <strong>Cascade Tiers:</strong> Drag or click pearls & gemstones above to chain tiers below.</p>
                                        <p>• <strong>Symmetric Pair:</strong> Earrings mirror each other in real-time with authentic physics.</p>
                                    </>
                                ) : (
                                    <>
                                        <p>Click anywhere along the chain to add charms & beads.</p>
                                        <p>Drag beads along the chain to reposition.</p>
                                        <p>Right-click + drag a stone horizontally to rotate.</p>
                                        <p>Double-click a stone to mirror horizontally.</p>
                                    </>
                                )}
                            </div>

                            {/* Info Box */}
                            <div className="info-box" style={{ marginTop: '0.85rem' }}>
                                <div className="info-box-header">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Custom crafted luxury:</span>
                                </div>
                                <ul>
                                    <li>Handmade to order in {currentMetal.name} (5-7 business days)</li>
                                    <li>Authentic high-luster precious metal & genuine gemstones</li>
                                    <li>Complimentary luxury velvet gift packaging</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="actions">
                <button
                    className="secondary-btn"
                    onClick={onExport}
                    disabled={!canAction}
                >
                    Save Design
                </button>
                <button
                    className="primary-btn"
                    onClick={onAddToCart}
                    disabled={!canAction || isProcessing}
                >
                    {isProcessing ? "Processing..." : "Add To Bag"}
                </button>
            </div>
        </div>
    );
};

export default Controls;
