import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import healthHandler from './api/health.ts';
import busHandler from './api/bus.js';
import feedHandler from './api/feed.js';

// Load environment variables (.env)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // Mount API Endpoints in /api
  app.get('/api/feed', feedHandler);
  app.get('/api/health', healthHandler);
  app.get(['/api/bus', '/api/nextbus', '/api/next-bus', '/api/next bus', '/api/next%20bus', '/api/BusArrival'], busHandler);

  // Fallback info for /api
  app.get('/api', (req, res) => {
    res.json({
      name: 'SMU Transit API - LTA DataMall v3 Integration',
      endpoints: ['/api/health', '/api/nextbus?BusStopCode=83139&ServiceNo=15'],
      refreshIntervalSeconds: 20,
    });
  });

  if (!isProduction) {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
