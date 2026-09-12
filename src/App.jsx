import React, { useState } from "react";
import JewelryConfigurator from "./components/JewelryConfigurator";
import { JEWELRY_VARIANTS } from "./data/jewelryData";
import "./App.css";

const TABS = [
  {
    key: "necklace",
    label: "Necklaces",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4c0 7.5 3.5 16 8 16s8-8.5 8-16" />
        <circle cx="12" cy="17" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "earrings",
    label: "Earrings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="6" r="2" />
        <path d="M7 8v2a5 5 0 0 0 5 5h0a5 5 0 0 1-5-5" />
        <circle cx="7" cy="16" r="2.5" fill="currentColor" />
        
        <circle cx="17" cy="6" r="2" />
        <path d="M17 8v2a5 5 0 0 0 5 5h0a5 5 0 0 1-5-5" />
        <circle cx="17" cy="16" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "bracelet",
    label: "Bracelets",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="4" r="1.5" fill="currentColor" />
        <circle cx="20" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="20" r="1.5" fill="currentColor" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

function App() {
  const [activeTab, setActiveTab] = useState("earrings");

  return (
    <div className="app-container">
      {/* Top Header & Variant Tabs Navigation */}
      <header className="app-header">
        <div className="brand-section">
          <span className="brand-badge">Bespoke Atelier</span>
          <h1 className="brand-logo">AURA FINE JEWELRY</h1>
        </div>

        {/* 3 Jewelry Variant Tabs */}
        <nav className="jewelry-nav-tabs" aria-label="Jewelry Categories">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`tab-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-text">{tab.label}</span>
                {isActive && <span className="tab-active-indicator" />}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Configurator Area: Keeping independent configurator instances to preserve designs */}
      <main className="main-content">
        {TABS.map((tab) => {
          const isCurrent = activeTab === tab.key;
          return (
            <div
              key={tab.key}
              className={`configurator-view-wrapper ${isCurrent ? "active-view" : "hidden-view"}`}
              style={{ display: isCurrent ? "block" : "none" }}
            >
              <JewelryConfigurator variantConfig={JEWELRY_VARIANTS[tab.key]} isActive={isCurrent} />
            </div>
          );
        })}
      </main>
    </div>
  );
}

export default App;
