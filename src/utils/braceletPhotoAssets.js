import { stoneById } from '../data/braceletData.js';

const sources = new Map();
const textures = new Map();

// Only warm, saturated gold pixels participate in the material preview.
// Pearl whites, blue larimar, transparency and photographic detail are retained.
export function previewMetalPixel(r, g, b, metal) {
  if (metal === 'gold') return [r, g, b];
  const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, r, g, b);
  const amount = Math.max(0, Math.min(1, (r - b - 24) / 32)) * Math.max(0, Math.min(1, (saturation - .17) / .18));
  if (r < g || g < b || !amount) return [r, g, b];
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  const target = metal === 'silver' ? [luminance * .98, luminance * 1.02, luminance * 1.06] : [luminance * 1.14, luminance * .91, luminance * .83];
  return [r, g, b].map((channel, i) => Math.round(Math.min(255, channel + (target[i] - channel) * amount)));
}

export function previewStonePixel(stone, r, g, b, metal) {
  // Natural pearl and bead colors never follow the metal selector.
  if (!stone.finish || stone.finish === metal) return [r, g, b];
  if (stone.finish === 'gold') return previewMetalPixel(r, g, b, metal);
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  const tint = metal === 'gold' ? [1.15, 1, .65] : [1.14, .91, .83];
  return tint.map(channel => Math.round(Math.min(255, luminance * channel)));
}

function loadSource(stone) {
  if (!sources.has(stone.id)) {
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { sources.delete(stone.id); reject(new Error(`Could not load ${stone.name}. Please try again.`)); };
      image.src = stone.image;
    });
    sources.set(stone.id, promise);
  }
  return sources.get(stone.id);
}

export function photoTexture(id, metal = 'gold') { return textures.get(`${id}:${metal}`); }

export async function loadPhotoTextures(items, metal = 'gold') {
  const stones = [...new Set(items.map(item => item.id))].map(stoneById).filter(stone => stone.kind === 'photo');
  await Promise.all(stones.map(async stone => {
    const key = `${stone.id}:${metal}`;
    if (textures.has(key)) return;
    const source = await loadSource(stone);
    if (!stone.finish || metal === stone.finish) { textures.set(key, source); return; }
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (!pixels.data[i + 3]) continue;
      const color = previewStonePixel(stone, pixels.data[i], pixels.data[i + 1], pixels.data[i + 2], metal);
      pixels.data[i] = color[0]; pixels.data[i + 1] = color[1]; pixels.data[i + 2] = color[2];
    }
    context.putImageData(pixels, 0, 0);
    textures.set(key, canvas);
  }));
}
