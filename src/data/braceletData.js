export const BRACELET_STONES = [
  { id: 'pearl', name: 'Freshwater pearl', detail: 'Soft ivory · organic', color: '#eee8da', price: 3000, radius: 15, kind: 'pearl' },
  { id: 'jade', name: 'Green jade', detail: 'Forest green · cabochon', color: '#4b7964', price: 5500, radius: 14, kind: 'gem' },
  { id: 'amethyst', name: 'Amethyst', detail: 'Violet · brilliant cut', color: '#89709e', price: 4500, radius: 14, kind: 'gem' },
  { id: '1st_stone', name: 'Silver baroque pearl', shortName: 'Baroque', detail: 'Original 01 · silver nacre', price: 2250, radius: 22, kind: 'photo', category: 'pearl', image: '/assets/stones/1st_stone.png', width: 48, height: 41.4, pivot: { x: .48, y: .04 }, mount: 'pin', mass: 1.1 },
  { id: '2nd_stone', name: 'Iridescent petal pearl', shortName: 'Petal', detail: 'Original 02 · warm iridescence', price: 2500, radius: 23, kind: 'photo', category: 'pearl', image: '/assets/stones/2nd_stone.png', width: 48, height: 44.5, pivot: { x: .29, y: .07 }, mount: 'pin', mass: 1.1 },
  { id: '3rd_stone', name: 'Champagne drop pearl', shortName: 'Champagne', detail: 'Original 03 · golden luster', price: 2750, radius: 21, kind: 'photo', category: 'pearl', image: '/assets/stones/3rd_stone.png', width: 43, height: 40.6, pivot: { x: .07, y: .75 }, mount: 'eyelet', mass: 1.05 },
  { id: '4th_stone', name: 'Pavé butterfly', shortName: 'Butterfly', detail: 'Original 04 · crystal wings', price: 3000, radius: 22, kind: 'photo', category: 'charm', image: '/assets/stones/4th_stone.png', width: 48, height: 43.6, pivot: { x: .14, y: .31 }, mount: 'eyelet', finish: 'gold', mass: .8 },
  { id: '5th_stone', name: 'Pavé ribbon bow', shortName: 'Bow', detail: 'Original 05 · crystal ribbon', price: 3250, radius: 24, kind: 'photo', category: 'charm', image: '/assets/stones/5th_stone.png', width: 50, height: 49, pivot: { x: .50, y: .18 }, mount: 'eyelet', finish: 'gold', mass: .9 },
  { id: '6th_stone', name: 'Scallop shell', shortName: 'Shell', detail: 'Original 06 · sculpted metal', price: 3500, radius: 22, kind: 'photo', category: 'charm', image: '/assets/stones/6th_stone.png', width: 48, height: 43.1, pivot: { x: .88, y: .85 }, mount: 'eyelet', finish: 'silver', mass: .9 },
  { id: '7th_stone', name: 'Terracotta round bead', shortName: 'Terracotta', detail: 'Original 07 · earthy red', price: 3750, radius: 17, kind: 'photo', category: 'bead', image: '/assets/stones/7th_stone.png', width: 34, height: 35.6, pivot: { x: .48, y: .07 }, mount: 'pin', mass: .8 },
  { id: '8th_stone', name: 'Ivory round bead', shortName: 'Ivory', detail: 'Original 08 · softly speckled', price: 4000, radius: 17, kind: 'photo', category: 'bead', image: '/assets/stones/8th_stone.png', width: 34, height: 34, pivot: { x: .53, y: .08 }, mount: 'pin', mass: .8 },
  { id: '9th_stone', name: 'Aurora freeform pearl', shortName: 'Aurora', detail: 'Original 09 · rainbow nacre', price: 4250, radius: 23, kind: 'photo', category: 'pearl', image: '/assets/stones/9th_stone.png', width: 45, height: 50, pivot: { x: .55, y: .06 }, mount: 'pin', mass: 1.2 },
];

export const PHOTO_STONES = BRACELET_STONES.filter(stone => stone.kind === 'photo');
export const charmScale = item => item.scale ?? 1;
export const charmRotation = item => item.rotation ?? 0;
// Rest orientation puts each original's eyelet above its center of mass.
export const charmRestRotation = item => {
  const stone = stoneById(item.id);
  return stone.kind === 'photo' ? Math.atan2((.5 - stone.pivot.x) * stone.width * (item.mirrored ? -1 : 1), (.5 - stone.pivot.y) * stone.height) : 0;
};
export const charmClearance = item => {
  const stone = stoneById(item.id);
  const rotation = charmRestRotation(item) + charmRotation(item);
  const rotatedWidth = stone.kind === 'photo'
    ? Math.abs(Math.cos(rotation)) * stone.width + Math.abs(Math.sin(rotation)) * stone.height
    : stone.radius * 2;
  return Math.max(.12, (rotatedWidth * charmScale(item) + 12) / 300);
};

export const BRACELET_CHAINS = [
  { id: 'paperclip', name: 'Paperclip', detail: 'Sculptural & modern' },
  { id: 'cable', name: 'Fine cable', detail: 'Delicate & timeless' },
  { id: 'rope', name: 'Twisted rope', detail: 'Rich & textured' },
];

export const BRACELET_SCENES = [
  { id: 'white', name: 'Studio white', color: '#ffffff', light: '#ffffff', dark: '#ffffff', ink: '#111111' },
  { id: 'sage', name: 'Sage atelier', color: '#dce2d7', light: '#edf0e8', dark: '#c9d1c3', ink: '#435245' },
  { id: 'ivory', name: 'Warm ivory', color: '#ece5d9', light: '#f8f4eb', dark: '#dbd0bd', ink: '#685c4b' },
  { id: 'midnight', name: 'Midnight', color: '#252e2c', light: '#3e4943', dark: '#17211e', ink: '#dddace' },
];

export const BRACELET_PRESETS = [
  { name: 'The Heirloom', note: 'Pearls, with a little green.', chain: 'paperclip', metal: 'gold', stones: ['pearl', 'jade', 'pearl', 'jade', 'pearl'] },
  { name: 'Violet Hour', note: 'Amethyst & iridescent pearls.', chain: 'cable', metal: 'silver', stones: ['1st_stone', 'amethyst', '1st_stone'] },
  { name: 'Golden Solstice', note: 'Warm metal. One perfect pearl.', chain: 'rope', metal: 'roseGold', stones: ['pearl'] },
  { name: 'The Keepsake Edit', note: 'Pearls, ribbons & little treasures.', chain: 'paperclip', metal: 'gold', stones: ['2nd_stone', '4th_stone', '1st_stone', '5th_stone', '9th_stone'] },
];

export const MAX_CHARMS = 12;
export const stoneById = (id) => BRACELET_STONES.find(stone => stone.id === id) || BRACELET_STONES[0];
export const priceOf = (design) => 5000 + design.items.reduce((sum, item) => sum + stoneById(item.id).price, 0);
export const formatPrice = (value) => `Rs. ${value.toLocaleString('en-PK')}`;

export function fromPreset(index = 0) {
  const preset = BRACELET_PRESETS[index];
  return {
    version: 1, name: preset.name, chain: preset.chain, metal: preset.metal, size: 18,
    items: preset.stones.map((id, i) => ({ uuid: crypto.randomUUID(), id, angle: Math.PI / 2 + (i - (preset.stones.length - 1) / 2) * 0.4 })),
  };
}

// Retire only the mistakenly included earring pieces; preserve the rest of a draft.
export function migrateBraceletDraft(value) {
  if (isValidDesign(value)) return value;
  if (!Array.isArray(value?.items)) return null;
  const retired = new Set(['image_1', 'image_2', 'image_3', 'image_4']);
  const next = { ...value, items: value.items.filter(item => !retired.has(item?.id)) };
  return isValidDesign(next) ? next : null;
}

export function isValidDesign(value) {
  return value?.version === 1 && typeof value.name === 'string' && value.name.length <= 60 &&
    ['gold', 'silver', 'roseGold'].includes(value.metal) && BRACELET_CHAINS.some(c => c.id === value.chain) &&
    [16, 17, 18, 19, 20, 21].includes(value.size) && Array.isArray(value.items) && value.items.length <= MAX_CHARMS &&
    new Set(value.items.map(item => item?.uuid)).size === value.items.length &&
    value.items.every(item => typeof item?.uuid === 'string' && BRACELET_STONES.some(s => s.id === item.id) && Number.isFinite(item.angle) &&
      (item.rotation === undefined || (Number.isFinite(item.rotation) && Math.abs(item.rotation) <= Math.PI)) &&
      (item.scale === undefined || (Number.isFinite(item.scale) && item.scale >= .75 && item.scale <= 1.25)) &&
      (item.mirrored === undefined || typeof item.mirrored === 'boolean'));
}
