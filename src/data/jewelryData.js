export const JEWELRY_VARIANTS = {
  necklace: {
    id: "base-necklace",
    type: "necklace",
    name: "Custom Gold Necklace",
    shortName: "Necklaces",
    basePrice: 7500,
    baseBeadImage: "/assets/base/gold_bead.png",
    dimensions: {
      width: 500,
      height: 500,
    },
    layout: {
      type: "necklace-curve", // U-curve / catenary hanging downward
      centerX: 250,
      centerY: 180,
      radiusX: 185,
      radiusY: 200,
      // Open necklace arc: from ~0.15*PI (left-down) to ~0.85*PI (right-down)
      startAngle: Math.PI * 0.15,
      endAngle: Math.PI * 0.85,
    },
    slotCount: 12,
    maxComponents: 14,
    instruction: "Click anywhere along the draped necklace chain to add beads or charms."
  },
  earrings: {
    id: "base-earrings",
    type: "earrings",
    name: "Custom Gold Earrings",
    shortName: "Earrings",
    basePrice: 6000,
    baseBeadImage: "/assets/base/gold_bead.png",
    dimensions: {
      width: 500,
      height: 500,
    },
    layout: {
      type: "dual-earring", // Left and Right hoop/drop earrings
      centerX: 250,
      centerY: 240,
      radiusX: 65,
      radiusY: 85,
      leftCenter: { x: 155, y: 250 },
      rightCenter: { x: 345, y: 250 },
      startAngle: 0,
      endAngle: Math.PI * 2,
    },
    slotCount: 8,
    maxComponents: 10,
    instruction: "Click on the left or right earring hoops to add your personalized stones."
  },
  bracelet: {
    id: "base-bracelet",
    type: "bracelet",
    name: "Custom Gold Bracelet",
    shortName: "Bracelets",
    basePrice: 5000,
    baseBeadImage: "/assets/base/gold_bead.png",
    dimensions: {
      width: 500,
      height: 500,
    },
    layout: {
      type: "ellipse",
      centerX: 250,
      centerY: 250,
      radiusX: 185,
      radiusY: 185,
      startAngle: -Math.PI / 2,
      endAngle: Math.PI * 1.5,
    },
    slotCount: 16,
    maxComponents: 16,
    instruction: "Click on the circular gold chain to add beads and stones."
  },
};

// Legacy fallback
export const BASE_CONFIG = JEWELRY_VARIANTS.necklace;

export const COMPONENTS = [
  {
    id: "tahitian_pearl",
    name: "Tahitian Peacock Pearl",
    image: "/assets/stones/tahitian_pearl.jpg",
    price: 6800,
    width: 55,
    height: 55,
    type: "pearl",
    subType: "tahitian",
    description: "Dark iridescent South Pacific pearl with vibrant peacock green and violet nacre sheen"
  },
  {
    id: "golden_pearl",
    name: "Golden South Sea Pearl",
    image: "/assets/stones/golden_pearl.jpg",
    price: 7500,
    width: 55,
    height: 55,
    type: "pearl",
    subType: "golden",
    description: "Rare Australian golden pearl exhibiting deep 24k warm champagne luster"
  },
  {
    id: "akoya_pearl",
    name: "Japanese Akoya Pearl",
    image: "/assets/stones/akoya_pearl.jpg",
    price: 5200,
    width: 55,
    height: 55,
    type: "pearl",
    subType: "akoya",
    description: "Flawless spherical Japanese pearl with brilliant mirror gloss and rose overtones"
  },
  {
    id: "pink_keshi_pearl",
    name: "Pink Keshi Pearl",
    image: "/assets/stones/pink_keshi_pearl.jpg",
    price: 4800,
    width: 55,
    height: 55,
    type: "pearl",
    subType: "pink",
    description: "Organic petal baroque keshi pearl radiating pastel blush pink luminescence"
  },
  {
    id: "pearl",
    name: "Freshwater Baroque Pearl",
    image: "/assets/stones/pearl.png",
    price: 3000,
    width: 55,
    height: 55,
    type: "pearl",
    subType: "freshwater",
    description: "Classic ivory freshwater keshi baroque drop pearl with silky natural luster"
  },
  {
    id: "ruby_briolette",
    name: "Pigeon Blood Ruby Drop",
    image: "/assets/stones/ruby_briolette.jpg",
    price: 8500,
    width: 55,
    height: 55,
    type: "gemstone",
    subType: "ruby",
    description: "Vivid crimson faceted teardrop ruby briolette with sparkling internal refraction"
  },
  {
    id: "amethyst",
    name: "Imperial Amethyst",
    image: "/assets/stones/amethyst.png",
    price: 4500,
    width: 55,
    height: 55,
    type: "gemstone",
    subType: "amethyst",
    description: "Deep Siberian purple faceted gemstone with high clarity"
  },
  {
    id: "jade",
    name: "Burmese Green Jade",
    image: "/assets/stones/jade.png",
    price: 5500,
    width: 55,
    height: 55,
    type: "gemstone",
    subType: "jade",
    description: "Translucent imperial green jadeite polished to a soft waxy sheen"
  },
  {
    id: "1st_stone",
    name: "1st Stone",
    image: "/assets/stones/1st_stone.png",
    price: 2250,
    width: 55,
    height: 55,
    type: "gemstone",
    subType: "diamond",
  },
  {
    id: "2nd_stone",
    name: "2nd Stone",
    image: "/assets/stones/2nd_stone.png",
    price: 2500,
    width: 55,
    height: 55,
  },
  {
    id: "3rd_stone",
    name: "3rd Stone",
    image: "/assets/stones/3rd_stone.png",
    price: 2750,
    width: 55,
    height: 55,
  },
  {
    id: "4th_stone",
    name: "4th Stone",
    image: "/assets/stones/4th_stone.png",
    price: 3000,
    width: 55,
    height: 55,
  },
  {
    id: "5th_stone",
    name: "5th Stone",
    image: "/assets/stones/5th_stone.png",
    price: 3250,
    width: 55,
    height: 55,
  },
  {
    id: "6th_stone",
    name: "6th Stone",
    image: "/assets/stones/6th_stone.png",
    price: 3500,
    width: 55,
    height: 55,
  },
  {
    id: "7th_stone",
    name: "7th Stone",
    image: "/assets/stones/7th_stone.png",
    price: 3750,
    width: 55,
    height: 55,
  },
  {
    id: "8th_stone",
    name: "8th Stone",
    image: "/assets/stones/8th_stone.png",
    price: 4000,
    width: 55,
    height: 55,
  },
  {
    id: "9th_stone",
    name: "9th Stone",
    image: "/assets/stones/9th_stone.png",
    price: 4250,
    width: 55,
    height: 55,
  },
];

export const METALS = {
  gold: {
    id: "gold",
    name: "18k Yellow Gold",
    shortName: "Yellow Gold",
    swatch: "linear-gradient(135deg, #FFE28A 0%, #D4AF37 50%, #996515 100%)",
    baseBeadImage: "/assets/base/gold_bead.png",
    palette: {
      highlight: "#FFFDF0",
      specular: "#FFF2A8",
      primary: "#E6BE44",
      secondary: "#CA9E27",
      shadow: "#6B4908",
      deepShadow: "#3D2702",
      ambient: "#A87D18",
      glow: "rgba(255, 220, 100, 0.45)"
    }
  },
  roseGold: {
    id: "roseGold",
    name: "18k Rose Gold",
    shortName: "Rose Gold",
    swatch: "linear-gradient(135deg, #FFD8CF 0%, #E69D8E 50%, #8A483B 100%)",
    baseBeadImage: "/assets/base/gold_bead.png",
    palette: {
      highlight: "#FFF5F2",
      specular: "#FED2C9",
      primary: "#E89B8C",
      secondary: "#CA796B",
      shadow: "#6E352B",
      deepShadow: "#421C15",
      ambient: "#A65C4F",
      glow: "rgba(255, 185, 175, 0.45)"
    }
  },
  silver: {
    id: "silver",
    name: "Platinum White Gold",
    shortName: "Platinum",
    swatch: "linear-gradient(135deg, #FFFFFF 0%, #D8DFE6 50%, #68727D 100%)",
    baseBeadImage: "/assets/base/silver_bead.png",
    palette: {
      highlight: "#FFFFFF",
      specular: "#F0F5FA",
      primary: "#D4DCE4",
      secondary: "#A8B4C0",
      shadow: "#4C5662",
      deepShadow: "#252B33",
      ambient: "#768392",
      glow: "rgba(220, 235, 255, 0.45)"
    }
  }
};

export const CHAIN_STYLES = {
  cable: {
    id: "cable",
    name: "Luxury Cable",
    description: "Classic interlocking oval links with beveled edges",
    linkLength: 10,
    linkWidth: 4.2,
    wireRadius: 1.2
  },
  cuban: {
    id: "cuban",
    name: "Diamond Cuban",
    description: "Flattened curb links with precision diamond-cut facets",
    linkLength: 11,
    linkWidth: 5.5,
    wireRadius: 1.5
  },
  rope: {
    id: "rope",
    name: "Twisted Rope",
    description: "Intricately spiraled dual-strand rope chain",
    linkLength: 8,
    linkWidth: 4.8,
    wireRadius: 1.3
  },
  paperclip: {
    id: "paperclip",
    name: "Elongated Clip",
    description: "Modern elongated rectangular links with rounded corners",
    linkLength: 16,
    linkWidth: 4.0,
    wireRadius: 1.1
  }
};

export const BACKDROPS = {
  "velvet-emerald": {
    id: "velvet-emerald",
    name: "Emerald Velvet",
    tagline: "Royal Atelier Bust",
    swatch: "#09241b",
    background: "#081f18",
    gradient: "radial-gradient(circle at 50% 38%, #154536 0%, #0c2b21 55%, #05140f 100%)"
  },
  "velvet-charcoal": {
    id: "velvet-charcoal",
    name: "Charcoal Velvet",
    tagline: "Midnight Luxury Pad",
    swatch: "#1b1e23",
    background: "#121418",
    gradient: "radial-gradient(circle at 50% 38%, #282e37 0%, #171b20 60%, #0d0f13 100%)"
  },
  "atelier-champagne": {
    id: "atelier-champagne",
    name: "Champagne Silk",
    tagline: "Warm Boutique Studio",
    swatch: "#e8dfd1",
    background: "#f0eae0",
    gradient: "radial-gradient(circle at 50% 38%, #fbf7ef 0%, #ece4d6 60%, #d8ccb8 100%)"
  },
  "studio-white": {
    id: "studio-white",
    name: "Studio White",
    tagline: "High-Key Catalog",
    swatch: "#f8f9fa",
    background: "#ffffff",
    gradient: "radial-gradient(circle at 50% 38%, #ffffff 0%, #f4f6f8 65%, #e1e6eb 100%)"
  }
};

