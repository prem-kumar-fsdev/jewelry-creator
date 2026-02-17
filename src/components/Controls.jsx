import React from "react";
import { COMPONENTS } from "../data/jewelryData";

const Controls = ({
    configuration,
    activeItemUuid,
    onSelectStone,
    onRemove,
    onClear,
    onExport,
    onAddToCart,
    isProcessing = false
}) => {
    const BASE_PRICE = 5000;
    const componentsPrice = configuration.reduce((sum, item) => {
        if (!item.id) return sum;
        const comp = COMPONENTS.find((c) => c.id === item.id);
        return sum + (comp ? comp.price : 0);
    }, 0);
    const totalPrice = BASE_PRICE + componentsPrice;

    const activeItem = activeItemUuid ? configuration.find(i => i.uuid === activeItemUuid) : null;
    const activeComp = activeItem && activeItem.id ? COMPONENTS.find(c => c.id === activeItem.id) : null;

    return (
        <div className="controls-panel">
            {/* Product Header */}
            <div className="product-header">
                <h1 className="product-title">Custom Gold Bracelet</h1>
                <div className="product-price">PKR {totalPrice.toLocaleString()}</div>
                <div className="price-breakdown">
                    <span>Base: PKR {BASE_PRICE.toLocaleString()}</span>
                    {componentsPrice > 0 && (
                        <span>+ Stones: PKR {componentsPrice.toLocaleString()}</span>
                    )}
                </div>
            </div>

            {/* Stone Selection Section */}
            <div className="option-section">
                <div className="option-label">
                    <h3>Stones</h3>
                    <span className="option-value">
                        {configuration.length} selected
                    </span>
                    {configuration.length > 0 && (
                        <button className="text-btn danger" onClick={onClear} style={{ marginLeft: 'auto' }}>
                            Clear All
                        </button>
                    )}
                </div>

                {activeItem && (
                    <div className="selected-info">
                        <span>Editing: <strong>{activeComp ? activeComp.name : "Gold Bead"}</strong></span>
                        <button className="text-btn danger" onClick={() => onRemove(activeItem.uuid)}>
                            Remove
                        </button>
                    </div>
                )}

                <div className="components-grid">
                    {COMPONENTS.map((comp) => (
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

            {/* Instructions */}
            {!activeItem && (
                <div className="instruction-box">
                    <p>Click on the gold chain to add a bead.</p>
                    <p>Click on a bead to select and customize it.</p>
                    <p>Drag beads to reposition them.</p>
                    <p>Right-click + drag a stone to rotate it.</p>
                    <p>Double-click a stone to mirror it.</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>On mobile: long-press to rotate, double-tap to mirror.</p>
                </div>
            )}

            {/* Info Box */}
            <div className="info-box">
                <div className="info-box-header">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Please note that custom jewelry items:</span>
                </div>
                <ul>
                    <li>Are made to order and may take 5-7 business days</li>
                    <li>Cannot be returned or exchanged</li>
                    <li>May slightly differ from the preview</li>
                </ul>
            </div>

            {/* Action Buttons */}
            <div className="actions">
                <button
                    className="secondary-btn"
                    onClick={onExport}
                    disabled={configuration.length === 0}
                >
                    Save Design
                </button>
                <button
                    className="primary-btn"
                    onClick={onAddToCart}
                    disabled={configuration.length === 0 || isProcessing}
                >
                    {isProcessing ? "Processing..." : "Add To Bag"}
                </button>
            </div>
        </div>
    );
};

export default Controls;
