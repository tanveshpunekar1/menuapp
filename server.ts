import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Ensure uploads directory exists safely
  const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
  import('fs').then(fs => {
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    } catch {
      // Read-only filesystem fallback
    }
  });
  app.use('/api/uploads', express.static(uploadsDir));

  // Mount API router
  app.use('/api', apiRouter);

  const distPath = path.resolve(__dirname, 'dist');
  const fs = await import('fs');
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE) || fs.existsSync(path.join(distPath, 'index.html')) && process.env.NODE_ENV !== 'development';

  // Serve Vite in development / SPA in production
  if (!isProd && process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RestoQR SaaS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
