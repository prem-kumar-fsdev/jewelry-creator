import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import checkoutHandler from './api/create-checkout.js';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Wrapper to adapt Vercel function signature (req, res) to Express
app.all('/api/create-checkout', async (req, res) => {
    console.log(`[Local API] Received ${req.method} request to /api/create-checkout`);
    try {
        await checkoutHandler(req, res);
    } catch (err) {
        console.error("Local API Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`
    ✅ Local API Server running on http://localhost:${PORT}
    👉 Handling requests to /api/create-checkout
    `);
});
