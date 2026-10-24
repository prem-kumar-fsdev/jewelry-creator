import { useState } from 'react';
import JewelryConfigurator from './components/JewelryConfigurator';
import BraceletStudio from './components/BraceletStudio';
import { JEWELRY_VARIANTS } from './data/jewelryData';
import './shaista.css';

const TYPES = [{ key: 'necklace', label: 'Necklaces' }, { key: 'earrings', label: 'Earrings' }, { key: 'bracelet', label: 'Bracelets' }];
// A product-specific iframe can omit the category selector with ?type=necklace.
const requestedType = new URLSearchParams(window.location.search).get('type');
const embeddedType = TYPES.some(type => type.key === requestedType) ? requestedType : null;

export default function App() {
  const [activeType, setActiveType] = useState(embeddedType || 'necklace');
  return <main className="shaista-app sj-product-editor" aria-label="Jewelry customization">
    {!embeddedType && <div className="sj-editor-category"><label htmlFor="jewelry-type">Create your own</label><select id="jewelry-type" value={activeType} onChange={event => setActiveType(event.target.value)}>{TYPES.map(type => <option key={type.key} value={type.key}>{type.label}</option>)}</select></div>}
    {TYPES.map(type => <div key={type.key} hidden={activeType !== type.key}>
      {type.key === 'earrings'
        ? <JewelryConfigurator variantConfig={JEWELRY_VARIANTS.earrings} isActive={activeType === type.key} />
        : <BraceletStudio variant={type.key} isActive={activeType === type.key} />}
    </div>)}
  </main>;
}
