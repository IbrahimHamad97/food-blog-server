/**
 * Upload signing routes — client uploads directly to Cloudinary with a short-lived signature.
 */
import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import { createUploadSignature } from '../../lib/cloudinary.js';

/** Mount at `/api/uploads`. */
export function createUploadsRouter(env: Env): Router {
  const router = Router();

  /** POST /api/uploads/sign — JWT required; returns Cloudinary upload credentials */
  router.post('/sign', requireAuth(env), (_req, res) => {
    res.json(createUploadSignature(env));
  });

  return router;
}
