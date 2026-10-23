import { useCallback, useEffect, useRef, useState } from 'react';
import BraceletStage from './BraceletStage';
import { METALS } from '../data/jewelryData';
import { BRACELET_CHAINS, BRACELET_PRESETS, BRACELET_SCENES, BRACELET_STONES, PHOTO_STONES, MAX_CHARMS, charmScale, charmRotation, formatPrice, fromPreset, migrateBraceletDraft, priceOf, stoneById } from '../data/braceletData';
import { freeAngle, normalizeAngle } from '../utils/braceletPhysics';
import './braceletStudio.css';

const STORAGE_KEY = 'aura-bracelet-studio-v1';

function Icon({ name, size = 18 }) {
  const paths = {
    undo: <><path d="M9 5 4 10l5 5M4 10h9a6 6 0 0 1 6 6v3" /></>,
    redo: <><path d="m15 5 5 5-5 5m5-5h-9a6 6 0 0 0-6 6v3" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    expand: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    reset: <><path d="M4 4v6h6M4 10a8 8 0 1 1 0 6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.plus}</svg>;
}

function StoneSwatch({ id }) {
  const stone = stoneById(id);
  return stone.image
    ? <img className="photo-swatch" src={stone.image} alt="" draggable={false} />
    : <span className={`stone-swatch stone-${id}`} aria-hidden="true" />;
}

function ChainSwatch({ type }) {
  return <span className={`chain-swatch chain-${type}`} aria-hidden="true">{Array.from({ length: type === 'paperclip' ? 4 : 7 }, (_, i) => <i key={i} />)}</span>;
}

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const design = migrateBraceletDraft(saved);
    if (design) {
      const corrected = design !== saved;
      if (corrected) localStorage.setItem(`${STORAGE_KEY}-before-catalog-correction`, JSON.stringify(saved));
      return { design, corrected };
    }
  } catch { /* A fresh design also works with storage disabled. */ }
  return { design: fromPreset(), corrected: false };
}

export default function BraceletStudio({ isActive }) {
  const [history, setHistory] = useState(() => { const loaded = loadDraft(); return { past: [], present: loaded.design, future: [], catalogCorrected: loaded.corrected }; });
  const design = history.present;
  const [selected, setSelected] = useState(null);
  const [panel, setPanel] = useState('design');
  const [collection, setCollection] = useState('photos');
  const [scene, setScene] = useState('sage');
  const [view, setView] = useState('flat');
  const [zoom, setZoom] = useState(1);
  const [presenting, setPresenting] = useState(false);
  const [message, setMessage] = useState(history.catalogCorrected ? 'Earring-only pieces removed from this bracelet. Your previous draft is backed up on this device.' : '');
  const [saved, setSaved] = useState('Saving draft…');
  const [review, setReview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [exportCard, setExportCard] = useState(null);
  const [exporting, setExporting] = useState(false);
  const stageRef = useRef(null);
  const dialogRef = useRef(null);
  const exportDialogRef = useRef(null);
  const selectedItem = design.items.find(item => item.uuid === selected);
  const selectedDegrees = selectedItem ? Math.round(normalizeAngle(selectedItem.angle) * 180 / Math.PI) % 360 : 0;

  const commit = useCallback((update) => {
    setHistory(current => {
      const next = typeof update === 'function' ? update(current.present) : update;
      if (JSON.stringify(next) === JSON.stringify(current.present)) return current;
      return { past: [...current.past.slice(-49), current.present], present: next, future: [] };
    });
  }, []);
  const undo = useCallback(() => setHistory(h => h.past.length ? { past: h.past.slice(0, -1), present: h.past.at(-1), future: [h.present, ...h.future] } : h), []);
  const redo = useCallback(() => setHistory(h => h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h), []);
  const remove = useCallback(() => { if (selected) { commit(d => ({ ...d, items: d.items.filter(i => i.uuid !== selected) })); setSelected(null); } }, [commit, selected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(design)); setSaved('Draft saved on this device'); }
      catch { setSaved('Draft could not be saved on this device'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [design]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (review) dialogRef.current.showModal();
    else dialogRef.current.close();
  }, [review]);
  useEffect(() => {
    if (exportCard) exportDialogRef.current.showModal();
    else exportDialogRef.current.close();
  }, [exportCard]);
  useEffect(() => {
    const keydown = event => {
      if (!isActive || review || exportCard || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { if (selectedItem && !presenting) { event.preventDefault(); remove(); } }
      else if (event.key === 'Escape') { setPresenting(false); setSelected(null); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [isActive, review, exportCard, undo, redo, selectedItem, presenting, remove]);

  const addStone = (id, desired = Math.PI / 2) => {
    if (!BRACELET_STONES.some(stone => stone.id === id)) return;
    if (design.items.length >= MAX_CHARMS) { setMessage('Your bracelet holds up to 12 charms. Remove one to make room.'); return; }
    const angle = freeAngle(design.items, desired, undefined, { id });
    if (angle === null) { setMessage('Move a charm to make a little more room.'); return; }
    const uuid = crypto.randomUUID();
    commit(d => ({ ...d, items: [...d.items, { uuid, id, angle }] })); setSelected(uuid);
    setMessage(`${stoneById(id).name} added`);
  };
  const moveStone = (uuid, angle) => commit(d => ({ ...d, items: d.items.map(item => item.uuid === uuid ? { ...item, angle } : item) }));
  const customize = patch => {
    if (!selectedItem) return;
    const updated = { ...selectedItem, ...patch };
    const items = design.items.map(item => item.uuid === selected ? updated : item);
    const angle = freeAngle(items, updated.angle, selected);
    if (angle === null) { setMessage('Move a neighboring charm to make room for this adjustment.'); return; }
    commit(d => ({ ...d, items: d.items.map(item => item.uuid === selected ? { ...updated, angle } : item) }));
  };
  const duplicate = () => {
    if (!selectedItem || design.items.length >= MAX_CHARMS) return;
    const angle = freeAngle(design.items, selectedItem.angle + .4, undefined, selectedItem);
    if (angle === null) { setMessage('Move a charm to make room for a duplicate.'); return; }
    const uuid = crypto.randomUUID();
    commit(d => ({ ...d, items: [...d.items, { ...selectedItem, uuid, angle }] })); setSelected(uuid);
  };
  const applyPreset = index => { commit(fromPreset(index)); setSelected(null); setMessage(`${BRACELET_PRESETS[index].name} is ready to make your own. Undo to restore your previous design.`); };
  const exportImage = async () => {
    setExporting(true);
    try { setExportCard(await stageRef.current.exportImage()); }
    catch (error) { setMessage(error.message || 'The design card could not be prepared. Please try again.'); }
    finally { setExporting(false); }
  };
  const checkout = async () => {
    setProcessing(true); setCheckoutError('');
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseProductId: 'base-bracelet', jewelryType: 'bracelet', metal: design.metal, chainStyle: design.chain, braceletSize: design.size, designName: design.name, configuration: design.items }),
      });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Checkout is unavailable right now. Your design is still saved; please try again later.');
      const result = await response.json();
      if (!response.ok || !result.invoice_url) throw new Error('Checkout is unavailable right now. Your design is still saved; please try again later.');
      const url = new URL(result.invoice_url);
      if (url.protocol !== 'https:') throw new Error('The checkout link could not be opened. Please try again later.');
      window.location.assign(url.href);
    } catch (error) { setCheckoutError(error.message); }
    finally { setProcessing(false); }
  };

  return <section className={`bracelet-studio ${presenting ? 'is-presenting' : ''}`} aria-label="Bracelet design studio">
    <div className="studio-heading">
      <div><div className="studio-eyebrow">THE PERSONAL COLLECTION <span>/</span> BRACELET NO. 01</div><h1>{presenting ? 'A piece of your own.' : 'Little details. Entirely you.'}</h1><p>{presenting ? 'Your design, in its best light.' : 'Choose a chain. Add a little meaning. Make it yours.'}</p></div>
      <div className="heading-actions"><span className="draft-status"><span />{saved}</span><button className="studio-button secondary" onClick={() => setPresenting(!presenting)}><Icon name={presenting ? 'close' : 'expand'} />{presenting ? 'Back to editor' : 'Present design'}</button></div>
    </div>

    <div className="studio-workspace">
      <div className="studio-main">
        <div className={`product-stage scene-${scene}`}>
          <div className="stage-top"><span className="stage-label">AURA <span> / </span> ATELIER</span><div className="view-switch" aria-label="Bracelet arrangement"><button aria-pressed={view === 'flat'} onClick={() => setView('flat')}>Flat lay</button><button aria-pressed={view === 'drape'} onClick={() => setView('drape')}>Soft drape</button></div></div>
          <BraceletStage ref={stageRef} design={design} scene={scene} zoom={zoom} view={view} selected={selected} onSelect={setSelected} onMove={moveStone} onAdd={addStone} onAssetError={setMessage} active={isActive} presenting={presenting} />
          <div className="stage-caption"><span className="studio-eyebrow">{presenting ? 'DESIGNED BY YOU' : 'YOUR ONE-OF-A-KIND'}</span><h2>{design.name || 'Untitled bracelet'}</h2><p>{METALS[design.metal].shortName} <span>·</span> {BRACELET_CHAINS.find(c => c.id === design.chain).name} <span>·</span> {design.size} cm</p></div>
          {!presenting && <div className="stage-tools"><div className="tool-group"><button title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!history.past.length} onClick={undo}><Icon name="undo" /></button><button title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!history.future.length} onClick={redo}><Icon name="redo" /></button></div><div className="tool-group"><button aria-label="Zoom out" disabled={zoom <= .8} onClick={() => setZoom(z => Math.max(.8, +(z - .1).toFixed(1)))}>−</button><button className="zoom-label" aria-label="Reset zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button aria-label="Zoom in" disabled={zoom >= 1.3} onClick={() => setZoom(z => Math.min(1.3, +(z + .1).toFixed(1)))}>+</button></div></div>}
          <div className="scene-quick" aria-label="Presentation background">{BRACELET_SCENES.map(s => <button key={s.id} title={s.name} aria-label={s.name} aria-pressed={scene === s.id} onClick={() => setScene(s.id)} style={{ background: s.color }} />)}</div>
        </div>
        <div className="stage-footnote"><span><span className="live-dot" />{presenting ? 'THE AURA PERSONAL COLLECTION' : 'Drag a charm to arrange · Gently pull the chain to play'}</span><button onClick={exportImage} disabled={exporting}><Icon name="download" size={14} />{exporting ? 'Preparing image…' : presenting ? 'Download presentation' : 'Save image'}</button></div>
        {!presenting && <div className="preset-strip"><div className="preset-intro"><span className="studio-eyebrow">A LITTLE INSPIRATION</span><h3>Start with a feeling.</h3></div>{BRACELET_PRESETS.slice(0, 3).map((preset, index) => <button className="preset-card" key={preset.name} onClick={() => applyPreset(index)}><span className={`mini-bracelet mini-${index}`} aria-hidden="true"><i /><i /><i /></span><span><strong>{preset.name}</strong><small>{preset.note}</small></span><Icon name="arrow" size={15} /></button>)}</div>}
      </div>

      {!presenting && <aside className="design-panel" aria-label="Bracelet controls">
        <div className="panel-title"><h2>Make it yours</h2><span>01 — 03</span></div>
        <div className="panel-tabs" role="tablist" aria-label="Editor sections">{[['design', 'Design'], ['charms', 'Charms'], ['details', 'Details']].map(([id, label]) => <button key={id} role="tab" id={`tab-${id}`} aria-selected={panel === id} aria-controls={`panel-${id}`} onClick={() => setPanel(id)}>{label}{id === 'charms' && <span>{design.items.length}</span>}</button>)}</div>
        <div className="panel-content" role="tabpanel" id={`panel-${panel}`} aria-labelledby={`tab-${panel}`}>
          {panel === 'design' && <>
            <div className="control-section"><div className="section-label"><h3><span>01</span> The metal</h3><span>{METALS[design.metal].shortName}</span></div><div className="metal-options">{Object.values(METALS).map(metal => <button key={metal.id} aria-pressed={design.metal === metal.id} onClick={() => commit(d => ({ ...d, metal: metal.id }))}><span className="metal-swatch" style={{ background: metal.swatch }}>{design.metal === metal.id && <Icon name="check" size={16} />}</span><span>{metal.id === 'silver' ? 'Platinum' : metal.id === 'gold' ? 'Yellow gold' : 'Rose gold'}</span></button>)}</div></div>
            <div className="control-section"><div className="section-label"><h3><span>02</span> The foundation</h3></div><div className="chain-options">{BRACELET_CHAINS.map(chain => <button key={chain.id} aria-pressed={design.chain === chain.id} onClick={() => commit(d => ({ ...d, chain: chain.id }))}><ChainSwatch type={chain.id} /><span><strong>{chain.name}</strong><small>{chain.detail}</small></span><span className="radio-mark" /></button>)}</div></div>
            <div className="control-section"><div className="section-label"><h3><span>03</span> From your photographs</h3><button onClick={() => { setCollection('photos'); setPanel('charms'); }}>View all <span aria-hidden="true">↗</span></button></div><p className="section-description">Your real stones. Every beautiful irregularity.</p><div className="quick-charms">{PHOTO_STONES.filter(stone => ["1st_stone", "4th_stone", "5th_stone", "6th_stone"].includes(stone.id)).map(stone => <button key={stone.id} onClick={() => addStone(stone.id)} aria-label={`Add ${stone.name}`} disabled={design.items.length >= MAX_CHARMS}><StoneSwatch id={stone.id} /><span>{stone.shortName}</span><span className="tiny-plus">+</span></button>)}</div><button className="photo-collection-link" onClick={() => { applyPreset(3); setPanel('charms'); setCollection('photos'); }}>Try the photo collection <Icon name="arrow" size={14} /></button></div>
            <div className="studio-note"><span>✧</span><p>Made to feel like you.<br /><span>Every detail is yours to change.</span></p></div>
          </>}
          {panel === 'charms' && <>
            <div className="section-label"><h3>Your little treasures</h3><span>{design.items.length} / {MAX_CHARMS}</span></div><p className="section-description">Click to add, or drag a stone onto your bracelet.</p>
            <div className="collection-switch" aria-label="Stone collection"><button aria-pressed={collection === 'photos'} onClick={() => setCollection('photos')}>Your photographs <span>{PHOTO_STONES.length}</span></button><button aria-pressed={collection === 'classics'} onClick={() => setCollection('classics')}>Studio classics</button></div>
            {collection === 'photos' && <div className="photo-collection-note"><p>Nine originals. Yours to arrange.<br /><span>Your pearls, beads and charms, with their original shapes and colors.</span></p><button onClick={() => applyPreset(3)}>Try a curated mix <Icon name="arrow" size={13} /></button></div>}
            <div className="stone-library">{BRACELET_STONES.filter(stone => collection === 'photos' ? stone.kind === 'photo' : stone.kind !== 'photo').map(stone => <button key={stone.id} draggable={design.items.length < MAX_CHARMS} onDragStart={e => e.dataTransfer.setData('application/aura-stone', stone.id)} onClick={() => addStone(stone.id)} disabled={design.items.length >= MAX_CHARMS}><span className="library-stone"><StoneSwatch id={stone.id} /><Icon name="plus" size={14} /></span><strong>{stone.name}</strong><small>{stone.detail}</small><span className="stone-price">+ {formatPrice(stone.price)}</span></button>)}</div>
            <div className="section-label arrangement-heading"><h3>On your bracelet</h3><button disabled={!design.items.length} onClick={() => { commit(d => ({ ...d, items: [] })); setSelected(null); }}>Clear all</button></div>
            {design.items.length ? <div className="charm-sequence">{design.items.map((item, i) => <button key={item.uuid} aria-label={`Select charm ${i + 1}: ${stoneById(item.id).name}`} aria-pressed={item.uuid === selected} onClick={() => setSelected(item.uuid)}><StoneSwatch id={item.id} /><span>{i + 1}</span></button>)}</div> : <p className="empty-charms">A fresh start. Add your first charm above.</p>}
          </>}
          {panel === 'details' && <>
            <div className="control-section"><label className="section-label" htmlFor="bracelet-name"><h3>Give it a name</h3></label><input id="bracelet-name" maxLength={60} value={design.name} onChange={e => commit(d => ({ ...d, name: e.target.value }))} /></div>
            <div className="control-section"><div className="section-label"><h3>Bracelet length</h3><span>{design.size} cm</span></div><div className="size-options">{[16, 17, 18, 19, 20, 21].map(size => <button key={size} aria-pressed={design.size === size} onClick={() => commit(d => ({ ...d, size }))}>{size}</button>)}</div><p className="section-description">Measure your wrist and allow a little room for your preferred fit. Preview is illustrative.</p></div>
            <div className="control-section"><div className="section-label"><h3>Set the scene</h3></div><div className="backdrop-options">{BRACELET_SCENES.map(s => <button key={s.id} aria-pressed={scene === s.id} onClick={() => setScene(s.id)}><span style={{ background: s.color }} />{s.name}{scene === s.id && <Icon name="check" size={14} />}</button>)}</div></div>
            <button className="studio-button secondary full-width" onClick={exportImage} disabled={exporting}><Icon name="download" />{exporting ? 'Preparing image…' : 'Download design card'}</button><p className="section-description">A 1800 × 1600 PNG with your design and its details.</p>
          </>}
          {selectedItem && <div className="selected-charm"><div className="section-label"><h3>{stoneById(selectedItem.id).name}</h3><button aria-label="Deselect charm" onClick={() => setSelected(null)}><Icon name="close" size={14} /></button></div><label htmlFor="charm-position">Position <span>{selectedDegrees}°</span></label><input id="charm-position" type="range" min="0" max="359" value={selectedDegrees} onChange={e => { const a = freeAngle(design.items, Number(e.target.value) * Math.PI / 180, selected); if (a !== null) moveStone(selected, a); }} />
            <label htmlFor="charm-rotation">Rotation <span>{Math.round(charmRotation(selectedItem) * 180 / Math.PI)}°</span></label><input id="charm-rotation" type="range" min="-180" max="180" step="5" value={Math.round(charmRotation(selectedItem) * 180 / Math.PI)} onChange={e => customize({ rotation: Number(e.target.value) * Math.PI / 180 })} />
            <label htmlFor="charm-scale">Preview scale <span>{Math.round(charmScale(selectedItem) * 100)}%</span></label><input id="charm-scale" type="range" min="75" max="125" step="5" value={Math.round(charmScale(selectedItem) * 100)} onChange={e => customize({ scale: Number(e.target.value) / 100 })} />
            <p className="scale-note">Visual adjustment only; product size and price stay the same.</p>
            <div className="charm-actions"><button aria-pressed={!!selectedItem.mirrored} onClick={() => customize({ mirrored: !selectedItem.mirrored })}>Flip</button><button onClick={duplicate} disabled={design.items.length >= MAX_CHARMS}>Duplicate</button><button onClick={() => customize({ rotation: 0, scale: 1, mirrored: false })}>Reset look</button></div><button className="remove-charm" onClick={remove}><Icon name="trash" size={13} />Remove charm</button></div>}
        </div>
        <div className="design-total"><div><span>Your creation</span><strong>{formatPrice(priceOf(design))}</strong></div><p>Chain + {design.items.length} {design.items.length === 1 ? 'charm' : 'charms'} <span>Shipping calculated at checkout</span></p><button className="studio-button primary" onClick={() => { setReview(true); setCheckoutError(''); }}>Review your bracelet <Icon name="arrow" /></button></div>
      </aside>}
    </div>
    {presenting && <div className="presentation-footer"><span>THE ART OF MAKING IT PERSONAL.</span><button className="studio-button primary" onClick={exportImage} disabled={exporting}><Icon name="download" />{exporting ? 'Preparing image…' : 'Download design card'}</button></div>}
    <div className={`studio-toast ${message ? 'visible' : ''}`} role="status" aria-live="polite">{message}</div>

    <dialog ref={exportDialogRef} className="review-dialog export-dialog" aria-labelledby="export-title" onCancel={() => setExportCard(null)}><div className="review-top"><span className="studio-eyebrow">READY FOR ITS CLOSE-UP</span><button aria-label="Close export preview" onClick={() => setExportCard(null)}><Icon name="close" /></button></div><h2 id="export-title">A keepsake of your creation.</h2><p>Your design card · 1800 × 1600 pixels</p>{exportCard && <><img src={exportCard.url} alt="Your finished AURA bracelet presentation card" /><a className="studio-button primary full-width" href={exportCard.url} download={exportCard.filename}><Icon name="download" />Download PNG</a></>}</dialog>

    <dialog ref={dialogRef} className="review-dialog" onCancel={() => setReview(false)}><div className="review-top"><span className="studio-eyebrow">YOUR PERSONAL COLLECTION</span><button aria-label="Close review" onClick={() => setReview(false)}><Icon name="close" /></button></div><h2>{design.name || 'Untitled bracelet'}</h2><p>A final look at the little details.</p><dl><div><dt>Metal</dt><dd>{METALS[design.metal].name}</dd></div><div><dt>Chain</dt><dd>{BRACELET_CHAINS.find(c => c.id === design.chain).name}</dd></div><div><dt>Length</dt><dd>{design.size} cm</dd></div><div><dt>Base bracelet</dt><dd>{formatPrice(5000)}</dd></div>{BRACELET_STONES.filter(s => design.items.some(i => i.id === s.id)).map(stone => { const count = design.items.filter(i => i.id === stone.id).length; return <div key={stone.id}><dt>{stone.name} × {count}</dt><dd>{formatPrice(stone.price * count)}</dd></div>; })}<div className="review-total"><dt>Subtotal</dt><dd>{formatPrice(priceOf(design))}</dd></div></dl><p className="section-description">Shipping calculated at checkout. Your draft stays saved on this device.</p>{checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}<button disabled={processing} className="studio-button primary full-width" onClick={checkout}>{processing ? 'Opening checkout…' : 'Continue to checkout'}<Icon name="arrow" /></button><button className="review-back" onClick={() => setReview(false)}>Keep creating</button></dialog>
  </section>;
}
