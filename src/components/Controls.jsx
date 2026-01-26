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
            <div className="panel-header">
                <h2>Designer</h2>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.8em', opacity: 0.7 }}>Base: PKR {BASE_PRICE.toLocaleString()}</span>
                    <span style={{ fontSize: '0.8em', opacity: 0.7 }}>+ Beads: PKR {componentsPrice.toLocaleString()}</span>
                    <p className="price-tag" style={{ marginTop: '5px' }}>Total: PKR {totalPrice.toLocaleString()}</p>
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <h3>1. Edit Bead</h3>
                    {configuration.length > 0 && (
                        <button className="text-btn danger" onClick={onClear}>
                            Clear All
                        </button>
                    )}
                </div>

                {!activeItem ? (
                    <div className="instruction-box">
                        <p>Click anywhere on the gold wire to add a bead.</p>
                        <p>Click on a bead to select it.</p>
                    </div>
                ) : (
                    <div className="selected-item-controls">
                        <div className="selected-info">
                            <span>Selected: <strong>{activeComp ? activeComp.name : "Base Gold Bead"}</strong></span>
                            <button className="text-btn danger" onClick={() => onRemove(activeItem.uuid)}>
                                Remove Bead
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`section ${!activeItem ? 'disabled' : ''}`}>
                <h3>2. Choose Stone</h3>
                <div className="components-grid">
                    {COMPONENTS.map((comp) => (
                        <button
                            key={comp.id}
                            className={`component-btn ${activeItem && activeItem.id === comp.id ? 'active' : ''}`}
                            onClick={() => onSelectStone(comp.id)}
                            disabled={false} // Always enable dragging
                            title={comp.name}
                            draggable="true"
                            onDragStart={(e) => {
                                e.dataTransfer.setData("application/json", JSON.stringify({ id: comp.id }));
                                e.dataTransfer.effectAllowed = "copy";
                            }}
                        >
                            <img src={comp.image} alt={comp.name} />
                            <span className="comp-name">{comp.name}</span>
                            <span className="comp-price">+PKR {comp.price}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="actions" style={{ display: 'flex', gap: '1rem' }}>
                <button
                    className="primary-btn"
                    style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}
                    onClick={onExport}
                    disabled={configuration.length === 0}
                >
                    Export
                </button>
                <button
                    className="primary-btn"
                    onClick={onAddToCart}
                    disabled={configuration.length === 0 || isProcessing}
                >
                    {isProcessing ? "Processing..." : "Add to Cart"}
                </button>
            </div>
        </div>
    );
};

export default Controls;
