/**
 * Public user profile routes.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { optionalAuth } from '../../middleware/auth.js';
import { listReviewsByUser } from '../reviews/reviews.service.js';
import { getPublicUserById } from './users.service.js';

const userIdParamSchema = z.object({
  id: z.string().min(1),
});

const listUserReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/** Mount at `/api/users`. */
export function createUsersRouter(env: Env): Router {
  const router = Router();

  /** GET /api/users/:id — public profile (no email) */
  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = userIdParamSchema.parse(req.params);
      const user = await getPublicUserById(id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/users/:id/reviews — that user's published reviews */
  router.get('/:id/reviews', optionalAuth(env), async (req, res, next) => {
    try {
      const { id } = userIdParamSchema.parse(req.params);
      const user = await getPublicUserById(id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const query = listUserReviewsQuerySchema.parse(req.query);
      const viewerId = (req as AuthenticatedRequest).auth?.userId ?? null;
      const result = await listReviewsByUser(id, query, viewerId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
