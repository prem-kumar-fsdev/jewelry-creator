import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'save-seeded-thumbnails',
      configureServer(server) {
        server.middlewares.use('/api/save-seeded-images', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { larimar, keshi, baroque } = JSON.parse(body);
                const outDir = path.resolve('public/assets/earrings');
                if (!fs.existsSync(outDir)) {
                  fs.mkdirSync(outDir, { recursive: true });
                }
                if (larimar) fs.writeFileSync(path.join(outDir, 'seeded_larimar.png'), Buffer.from(larimar.split(',')[1], 'base64'));
                if (keshi) fs.writeFileSync(path.join(outDir, 'seeded_keshi.png'), Buffer.from(keshi.split(',')[1], 'base64'));
                if (baroque) fs.writeFileSync(path.join(outDir, 'seeded_baroque_coin.png'), Buffer.from(baroque.split(',')[1], 'base64'));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
              } catch (err) {
                res.statusCode = 500;
                res.end(err.message);
              }
            });
          } else {
            res.end();
          }
        });
      }
    }
  ],
  server: {
    host: true, // Exposes on local network IP (0.0.0.0)
    port: 5173,
    proxy: {
      '/api/create-checkout': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
