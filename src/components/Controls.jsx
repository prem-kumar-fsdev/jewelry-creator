import React from "react";
import { COMPONENTS } from "../data/jewelryData";

const Controls = ({
    configuration,
    activeSlot,
    onSelectSlot,
    onSelectStone,
    onRemove,
    onClear,
    onExport,
    onAddToCart
}) => {
    const totalPrice = configuration.reduce((sum, id) => {
        if (!id) return sum;
        const comp = COMPONENTS.find((c) => c.id === id);
        return sum + (comp ? comp.price : 0);
    }, 0);

    const filledCount = configuration.filter(Boolean).length;

    return (
        <div className="controls-panel">
            <div className="panel-header">
                <h2>Designer</h2>
                <p className="price-tag">${totalPrice.toFixed(2)}</p>
            </div>

            <div className="section">
                <div className="section-header">
                    <h3>1. Select Position</h3>
                    {filledCount > 0 && (
                        <button className="text-btn danger" onClick={onClear}>
                            Clear All
                        </button>
                    )}
                </div>

                <div className="slots-grid">
                    {configuration.map((id, index) => {
                        const comp = id ? COMPONENTS.find((c) => c.id === id) : null;
                        const isActive = activeSlot === index;

                        return (
                            <button
                                key={index}
                                className={`slot-btn ${isActive ? "active" : ""} ${id ? "filled" : "empty"}`}
                                onClick={() => onSelectSlot(index)}
                                title={`Position ${index + 1}`}
                            >
                                <span className="slot-number">{index + 1}</span>
                                {comp ? (
                                    <img src={comp.image} alt={comp.name} />
                                ) : (
                                    <span className="slot-placeholder"></span>
                                )}
                                {id && isActive && (
                                    <span
                                        className="slot-remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(index);
                                        }}
                                    >
                                        ×
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="section">
                <h3>2. Choose Stone</h3>
                <div className={`components-grid ${activeSlot === null ? "disabled" : ""}`}>
                    {COMPONENTS.map((comp) => (
                        <button
                            key={comp.id}
                            className="component-btn"
                            onClick={() => onSelectStone(comp.id)}
                            disabled={activeSlot === null}
                            title={comp.name}
                        >
                            <img src={comp.image} alt={comp.name} />
                            <span className="comp-name">{comp.name}</span>
                            <span className="comp-price">+${comp.price}</span>
                        </button>
                    ))}
                </div>
                {activeSlot === null && (
                    <p className="hint-text">Select a position above to add a stone.</p>
                )}
            </div>

            <div className="actions" style={{ display: 'flex', gap: '1rem' }}>
                <button
                    className="primary-btn"
                    style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}
                    onClick={onExport}
                    disabled={filledCount === 0}
                >
                    Export
                </button>
                <button
                    className="primary-btn"
                    onClick={onAddToCart}
                    disabled={filledCount === 0}
                >
                    Add to Cart
                </button>
            </div>
        </div>
    );
};

export default Controls;
