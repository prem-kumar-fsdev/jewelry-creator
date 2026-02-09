export const BASE_CONFIG = {
  id: "base-bracelet",
  name: "Classic Gold Bracelet",
  // image: "/assets/base/bracelet.png", // Deprecated
  baseBeadImage: "/assets/base/gold_bead.png",
  dimensions: {
    width: 1000,
    height: 1000,
  },
  layout: {
    type: "ellipse",
    centerX: 500,
    centerY: 500,
    radiusX: 420,
    radiusY: 420,
    // 0 is right (3 o'clock), -PI/2 is top (12 o'clock).
    startAngle: -Math.PI / 2,
    endAngle: Math.PI * 1.5,
  },
  slotCount: 16, // Fixed number of beads/slots on the bracelet
  maxComponents: 16,
};

export const COMPONENTS = [
  {
    id: "amethyst",
    name: "Amethyst",
    image: "/assets/stones/amethyst.png",
    price: 4500,
    width: 55,
    height: 55,
  },
  {
    id: "pearl",
    name: "Freshwater Pearl",
    image: "/assets/stones/pearl.png",
    price: 3000,
    width: 55,
    height: 55,
  },
  {
    id: "jade",
    name: "Green Jade",
    image: "/assets/stones/jade.png",
    price: 5500,
    width: 55,
    height: 55,
  },
];
