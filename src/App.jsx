import React from "react";
import JewelryConfigurator from "./components/JewelryConfigurator";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <a href="#" className="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Store
        </a>
        <h1>LUMIÈRE</h1>
        <div style={{ width: '100px' }}></div> {/* Spacer for centering */}
      </header>
      <main>
        <JewelryConfigurator />
      </main>
    </div>
  );
}

export default App;
