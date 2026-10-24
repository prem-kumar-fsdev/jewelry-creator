import { BRACELET_STONES, isValidDesign } from '../src/data/braceletData.js';
import { isValidNecklace } from '../src/data/necklaceData.js';
import process from 'node:process';

export default async function handler(req, res) {
  // 1. CORS Headers (Optional but good for local dev/different domains)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { configuration, baseProductId } = req.body;

    if (!configuration || !Array.isArray(configuration)) {
      throw new Error("Invalid configuration data");
    }

    const isBracelet = req.body.jewelryType === 'bracelet';
    const isNecklace = req.body.jewelryType === 'necklace';
    if (isBracelet && !isValidDesign({ version: 1, name: req.body.designName, metal: req.body.metal, chain: req.body.chainStyle, size: req.body.braceletSize, items: configuration })) {
      return res.status(400).json({ error: 'Invalid bracelet design' });
    }
    if (isNecklace && !isValidNecklace({ version: 1, name: req.body.designName, metal: req.body.metal, chain: req.body.chainStyle, size: req.body.necklaceSize, items: configuration })) {
      return res.status(400).json({ error: 'Invalid necklace design' });
    }

    // ---------------------------------------------------------
    // 2. SERVER-SIDE PRICING LOGIC (The "Source of Truth")
    // ---------------------------------------------------------
    
    // Master Price List (Must match or override frontend data)
    const BASE_PRICE_PKR = isNecklace ? 7500 : 5000;
    const PRICING_TABLE = {
      "amethyst": 4500,
      "pearl": 3000,
      "jade": 5500,
      "1st_stone": 2250,
      "2nd_stone": 2500,
      "3rd_stone": 2750,
      "4th_stone": 3000,
      "5th_stone": 3250,
      "6th_stone": 3500,
      "7th_stone": 3750,
      "8th_stone": 4000,
      "9th_stone": 4250,
      // Fallback for unknown items
      "default": 1000 
    };
    
    // Calculate total price accurately
    // We sum the base price + price of every specific added component
    const gemCount = configuration.filter(item => item.id !== null).length; // Restored for metadata
    const componentsPrice = configuration.reduce((total, item) => {
        if (!item.id) return total; 
        const itemPrice = isBracelet || isNecklace ? BRACELET_STONES.find(stone => stone.id === item.id).price : PRICING_TABLE[item.id] || PRICING_TABLE["default"];
        return total + itemPrice;
    }, 0);

    const totalPrice = BASE_PRICE_PKR + componentsPrice;
    const totalPriceString = totalPrice.toString();

    console.log(`Calculating Price: Base(${BASE_PRICE_PKR}) + Components(${componentsPrice}) = PKR ${totalPriceString}`);

    // ---------------------------------------------------------
    // 3. SHOPIFY ADMIN API: CREATE DRAFT ORDER
    // ---------------------------------------------------------
    const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // e.g., "my-store.myshopify.com"
    const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN; 

    if (!SHOPIFY_DOMAIN || !ACCESS_TOKEN) {
      throw new Error("Missing Shopify Environment Variables in Vercel");
    }

    const payload = {
      draft_order: {
        currency: "PKR",
        line_items: [
          {
            title: "Custom Designed Jewelry",
            price: totalPriceString,
            quantity: 1,
            properties: [
                { name: "Base Model", value: baseProductId || "Standard Gold Chain" },
                { name: "Gem Count", value: gemCount.toString() },
                { name: "Design ID", value: `CFG-${Date.now()}` }, // Unique ID for reference
                ...(isBracelet || isNecklace ? [
                  { name: 'Design name', value: req.body.designName || 'Untitled bracelet' },
                  { name: 'Metal', value: req.body.metal },
                  { name: 'Chain style', value: req.body.chainStyle },
                  { name: isNecklace ? 'Necklace length' : 'Bracelet length', value: `${isNecklace ? req.body.necklaceSize : req.body.braceletSize} cm` },
                  { name: 'Charm arrangement', value: JSON.stringify(configuration.map(({ id, angle, rotation, scale, mirrored }) => ({ id, angle, ...(rotation !== undefined ? { rotation } : {}), ...(scale !== undefined ? { scale } : {}), ...(mirrored !== undefined ? { mirrored } : {}) }))) },
                ] : []),
                // You can verify this ID later to rebuild the visual in the admin panel if needed
            ]
          }
        ],
        use_customer_default_address: true
      }
    };

    const shopifyResponse = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/draft_orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const shopifyData = await shopifyResponse.json();

    if (!shopifyResponse.ok) {
      console.error("Shopify Error:", shopifyData);
      throw new Error(shopifyData.errors ? JSON.stringify(shopifyData.errors) : "Failed to create Draft Order");
    }

    // ---------------------------------------------------------
    // 4. RETURN CHECKOUT URL
    // ---------------------------------------------------------
    return res.status(200).json({ 
      success: true, 
      invoice_url: shopifyData.draft_order.invoice_url 
    });

  } catch (error) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
