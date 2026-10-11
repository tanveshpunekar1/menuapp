import 'dotenv/config';
import express from 'express';
import { apiRouter } from './routes';

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount API router at both /api and / so Vercel rewrites match regardless of path prefix handling
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
