import React, { useState } from "react";
import JewelryConfigurator from "./components/JewelryConfigurator";
import BraceletStudio from "./components/BraceletStudio";
import { JEWELRY_VARIANTS } from "./data/jewelryData";

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
  const [activeTab, setActiveTab] = useState("bracelet");

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f5f2] font-sans antialiased text-[#222222]">
      {/* Top Header & Variant Tabs Navigation */}
      <header className="sticky top-0 z-50 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 lg:px-10 py-2 sm:py-3.5 bg-white border-b border-[#e6e3dc] shadow-[0_2px_8px_rgba(0,0,0,0.05)] gap-2 sm:gap-4">
        <div className="flex sm:flex-col items-center sm:items-start justify-between w-full sm:w-auto">
          <div className="flex flex-col gap-0.5 text-center sm:text-left w-full sm:w-auto">
            <span className="text-[8.5px] sm:text-[10px] font-bold tracking-[1.5px] sm:tracking-[2px] text-[#c9a962] uppercase">Bespoke Atelier</span>
            <h1 className="m-0 font-serif text-[1.15rem] sm:text-[1.35rem] font-semibold tracking-[1px] sm:tracking-[2px] text-[#222222]">
              AURA FINE JEWELRY
            </h1>
          </div>
        </div>

        {/* 3 Jewelry Variant Tabs (Perfect 3-way split on mobile) */}
        <nav className="grid grid-cols-3 w-full sm:flex sm:w-auto gap-1 sm:gap-2 bg-[#f7f5f2] p-1 sm:p-1.5 rounded-full border border-[#e6e3dc]" aria-label="Jewelry Categories">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-white text-[#1a5f5a] font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                    : "text-[#666666] hover:text-[#222222] hover:bg-white/60"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className={`flex items-center justify-center shrink-0 transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-4 sm:[&>svg]:h-4 ${isActive ? "text-[#c9a962]" : "text-current"}`}>
                  {tab.icon}
                </span>
                <span className="tracking-[0.2px] truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Configurator Area: Keeping independent configurator instances to preserve designs */}
      <main className="flex-1 flex flex-col">
        {TABS.map((tab) => {
          const isCurrent = activeTab === tab.key;
          return (
            <div
              key={tab.key}
              className={`w-full h-full ${isCurrent ? "block" : "hidden"}`}
              style={{ display: isCurrent ? "block" : "none" }}
            >
              {tab.key === 'bracelet'
                ? <BraceletStudio isActive={isCurrent} />
                : <JewelryConfigurator variantConfig={JEWELRY_VARIANTS[tab.key]} isActive={isCurrent} />}
            </div>
          );
        })}
      </main>
    </div>
  );
}

export default App;
