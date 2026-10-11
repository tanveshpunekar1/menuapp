import 'dotenv/config';
import express from 'express';
import { apiRouter } from './routes.ts';

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Normalize pre-parsed or stringified request bodies on Vercel Serverless
app.use((req, _res, next) => {
  if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // ignore parse error
    }
  } else if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf-8'));
    } catch {
      // ignore parse error
    }
  }
  next();
});

// Mount API router at both /api and / so Vercel rewrites match regardless of path prefix handling
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;

