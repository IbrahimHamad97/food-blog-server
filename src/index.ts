/**
 * Express API entry point — mounts `/api` routes and global middleware.
 */
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { loadEnv } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createReviewsRouter } from './modules/reviews/reviews.routes.js';
import { createUploadsRouter } from './modules/uploads/uploads.routes.js';
import { prisma } from './lib/prisma.js';

const env = loadEnv();
const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

/** GET /api/health — smoke test for deploy and local dev */
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'food-blog-server' });
  } catch {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

app.use('/api/auth', createAuthRouter(env));
app.use('/api/reviews', createReviewsRouter(env));
app.use('/api/uploads', createUploadsRouter(env));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`food-blog-server listening on http://localhost:${env.PORT}`);
});
