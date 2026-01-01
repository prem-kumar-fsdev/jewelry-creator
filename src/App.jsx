import React from "react";
import JewelryConfigurator from "./components/JewelryConfigurator";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>LUMIÈRE</h1>
        <p>Custom Jewelry Atelier</p>
      </header>
      <main>
        <JewelryConfigurator />
      </main>
    </div>
  );
}

export default App;
