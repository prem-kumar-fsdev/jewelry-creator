import { isValidDesign, stoneById } from './braceletData.js';

export const NECKLACE_SIZES = [38, 40, 45, 50, 55, 60];
export const NECKLACE_MIN_ANGLE = .18;
export const NECKLACE_MAX_ANGLE = Math.PI - .18;
export const NECKLACE_PRESETS = [
  { name: 'The Luminous Thread', note: 'Three pearls. Quietly luminous.', chain: 'cable', metal: 'gold', stones: ['2nd_stone', '1st_stone', '9th_stone'] },
  { name: 'The Secret Garden', note: 'A butterfly among the pearls.', chain: 'paperclip', metal: 'gold', stones: ['8th_stone', '2nd_stone', '4th_stone', '9th_stone', '8th_stone'] },
  { name: 'A Little Tide', note: 'One shell. A little sunlight.', chain: 'rope', metal: 'silver', stones: ['3rd_stone', '6th_stone', '3rd_stone'] },
  { name: 'The Keepsake Necklace', note: 'Pearls and ribbons, collected by you.', chain: 'paperclip', metal: 'gold', stones: ['2nd_stone', '4th_stone', '1st_stone', '5th_stone', '9th_stone'] },
];

export function necklaceFromPreset(index = 0) {
  const preset = NECKLACE_PRESETS[index];
  return {
    version: 1, name: preset.name, chain: preset.chain, metal: preset.metal, size: 45,
    items: preset.stones.map((id, i) => ({ uuid: crypto.randomUUID(), id, angle: Math.PI / 2 + (i - (preset.stones.length - 1) / 2) * .52 })),
  };
}

export const necklacePrice = design => 7500 + design.items.reduce((sum, item) => sum + stoneById(item.id).price, 0);
export const isValidNecklace = value => NECKLACE_SIZES.includes(value?.size) && isValidDesign({ ...value, size: 18 }) &&
  value.items.every(item => item.angle >= NECKLACE_MIN_ANGLE && item.angle <= NECKLACE_MAX_ANGLE);
