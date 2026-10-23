import { useEffect, useImperativeHandle, useRef } from 'react';
import { createBraceletPhysics, createNecklacePhysics, freeAngle, nearestAngle, stepBracelet, TAU } from '../utils/braceletPhysics';
import { NECKLACE_MIN_ANGLE, NECKLACE_MAX_ANGLE } from '../data/necklaceData';
import { drawBracelet } from '../utils/braceletRenderer';
import { BRACELET_SCENES, stoneById, charmScale } from '../data/braceletData';
import { METALS } from '../data/jewelryData';
import { loadPhotoTextures } from '../utils/braceletPhotoAssets';
import { charmGeometry, hitCharm } from '../utils/braceletCharms';

export default function BraceletStage({ ref, design, scene, zoom, view, selected, onSelect, onMove, onAdd, onAssetError, active, presenting, variant = 'bracelet' }) {
  const canvasRef = useRef(null);
  const runtime = useRef({ model: null, drag: null, layout: null, design, dirty: true });

  useImperativeHandle(ref, () => ({
    async exportImage() {
      await loadPhotoTextures(design.items, design.metal);
      const canvas = document.createElement('canvas');
      canvas.width = 1800; canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      const model = (variant === 'necklace' ? createNecklacePhysics : createBraceletPhysics)(design.size, view === 'drape');
      drawBracelet(ctx, 1800, 1440, model, design, { scene, view });
      const palette = BRACELET_SCENES.find(s => s.id === scene);
      ctx.fillStyle = '#f8f6f0'; ctx.fillRect(0, 1440, 1800, 160);
      ctx.fillStyle = '#2d3c33'; ctx.font = '40px Georgia'; ctx.fillText(design.name || `Untitled ${variant}`, 80, 1505, 1380);
      ctx.font = '19px sans-serif'; ctx.fillStyle = '#77796e';
      ctx.fillText(`${METALS[design.metal].shortName}  /  ${design.size} cm  /  ${design.items.length} charms  /  ${palette.name}`, 80, 1550);
      ctx.textAlign = 'right'; ctx.font = '27px Georgia'; ctx.fillStyle = '#2d3c33'; ctx.fillText('A U R A', 1720, 1510);
      ctx.font = '13px sans-serif'; ctx.fillText('A PIECE OF YOUR OWN', 1720, 1544);
      return {
        filename: `${(design.name || variant).replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-aura.png`,
        url: canvas.toDataURL('image/png'),
      };
    },
    previewImage() { return canvasRef.current?.toDataURL('image/png'); },
  }), [design, scene, view, variant]);

  useEffect(() => {
    const state = runtime.current;
    state.model = (variant === 'necklace' ? createNecklacePhysics : createBraceletPhysics)(design.size, view === 'drape');
    state.dirty = true;
    state.drag = null;
  }, [design.size, view, variant]);

  useEffect(() => {
    const state = runtime.current;
    state.design = design;
    state.dirty = true;
    const ids = new Set(design.items.map(item => item.uuid));
    for (const id of state.model.charms.keys()) if (!ids.has(id)) state.model.charms.delete(id);
    design.items.forEach(item => {
      if (!state.model.charms.has(item.uuid)) state.model.charms.set(item.uuid, { swing: .15, velocity: 0 });
      const charm = state.model.charms.get(item.uuid);
      charm.mass = (stoneById(item.id).mass || 1) * charmScale(item) ** 2;
      charm.length = charmGeometry(item, { x: 0, y: 0 }).length;
    });
  }, [design, view]);

  useEffect(() => {
    let cancelled = false;
    loadPhotoTextures(design.items, design.metal).then(() => {
      if (!cancelled) runtime.current.dirty = true;
    }).catch(error => { if (!cancelled) onAssetError(error.message); });
    return () => { cancelled = true; };
  }, [design.items, design.metal, onAssetError]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = runtime.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame, previous = 0, idleFrames = 0;
    let w = 800, h = 640;
    const render = (time) => {
      const elapsed = previous ? (time - previous) / 1000 : 1 / 60;
      previous = time;
      if (document.hidden) { frame = requestAnimationFrame(render); return; }
      const moving = state.drag || state.dirty || idleFrames < 180;
      if (moving) {
        if (state.dirty || state.drag) idleFrames = 0;
        state.dirty = false;
        stepBracelet(state.model, elapsed, state.drag, motion.matches);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        state.layout = drawBracelet(ctx, w, h, state.model, state.design, { scene, zoom, selected: presenting ? null : selected, guide: !presenting, view });
        idleFrames++;
      }
      frame = requestAnimationFrame(render);
    };
    const resize = new ResizeObserver(([entry]) => {
      w = entry.contentRect.width; h = entry.contentRect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (w > 0 && h > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        state.layout = drawBracelet(ctx, w, h, state.model, state.design, { scene, zoom, selected: presenting ? null : selected, guide: !presenting, view });
      }
      state.dirty = true;
    });
    resize.observe(canvas);
    state.dirty = true;
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  }, [active, scene, zoom, selected, presenting, view]);

  const coordinates = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const layout = runtime.current.layout;
    if (!layout) return null;
    return { x: (event.clientX - rect.left - layout.offsetX) / layout.scale, y: (event.clientY - rect.top - layout.offsetY) / layout.scale };
  };
  const down = (event) => {
    if (presenting || event.button !== 0) return;
    const point = coordinates(event); if (!point) return;
    const state = runtime.current;
    const hit = [...state.layout.hits].reverse().find(p => hitCharm(p, point));
    if (hit) {
      onSelect(hit.uuid);
      state.drag = { type: 'charm', uuid: hit.uuid, start: state.design, x: point.x, y: point.y, offsetX: point.x - hit.anchor.x, offsetY: point.y - hit.anchor.y };
    } else {
      const near = nearestAngle(state.model, point.x, point.y);
      onSelect(null);
      if (near.distance < 23) state.drag = { type: 'chain', index: state.model.open ? Math.round(near.angle / Math.PI * (state.model.nodes.length - 1)) : Math.round(near.angle / TAU * state.model.nodes.length) % state.model.nodes.length, ...point };
    }
    if (state.drag) canvasRef.current.setPointerCapture(event.pointerId);
  };
  const move = (event) => {
    const point = coordinates(event); if (!point) return;
    const state = runtime.current;
    if (!state.drag) {
      const hit = state.layout.hits.some(p => hitCharm(p, point));
      canvasRef.current.style.cursor = !presenting && (hit || nearestAngle(state.model, point.x, point.y).distance < 23) ? 'grab' : 'default';
      return;
    }
    canvasRef.current.style.cursor = 'grabbing';
    if (state.drag.type === 'charm') {
      const angle = freeAngle(state.design.items, nearestAngle(state.model, point.x - state.drag.offsetX, point.y - state.drag.offsetY).angle, state.drag.uuid, {}, state.model.open ? [NECKLACE_MIN_ANGLE, NECKLACE_MAX_ANGLE] : null);
      if (angle !== null) {
        state.design = { ...state.design, items: state.design.items.map(item => item.uuid === state.drag.uuid ? { ...item, angle } : item) };
        const charm = state.model.charms.get(state.drag.uuid);
        if (charm) charm.velocity = Math.max(-7, Math.min(7, (point.x - state.drag.x) * -.07));
      }
    }
    state.drag.x = point.x; state.drag.y = point.y; state.dirty = true;
  };
  const release = (event, cancelled = false) => {
    const state = runtime.current;
    if (state.drag?.type === 'charm') {
      if (cancelled) state.design = state.drag.start;
      else {
        const item = state.design.items.find(i => i.uuid === state.drag.uuid);
        if (item) onMove(item.uuid, item.angle);
      }
    }
    state.drag = null; state.dirty = true;
    if (canvasRef.current.hasPointerCapture(event.pointerId)) canvasRef.current.releasePointerCapture(event.pointerId);
    canvasRef.current.style.cursor = 'grab';
  };

  return <canvas ref={canvasRef} className="bracelet-canvas" aria-label={`Interactive ${variant} preview. Drag a charm to reposition it, or pull the chain to feel its movement. Use the selected charm controls for keyboard editing.`}
    onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={event => release(event, true)}
    onLostPointerCapture={event => { if (runtime.current.drag) release(event, true); }}
    onDragOver={event => { if (!presenting) event.preventDefault(); }}
    onDrop={event => {
      event.preventDefault(); if (presenting) return;
      const point = coordinates(event); if (!point) return;
      onAdd(event.dataTransfer.getData('application/aura-stone'), nearestAngle(runtime.current.model, point.x, point.y).angle);
    }} />;
}
