/**
 * Review HTTP routes — list, create, and detail.
 */
import { Router } from 'express';
import type { Env } from '../../config/env.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  createReviewBodySchema,
  listMyReviewsQuerySchema,
  listReviewsQuerySchema,
  updateReviewBodySchema,
} from './reviews.schemas.js';
import {
  createReview,
  deleteReview,
  getReviewById,
  listReviews,
  listReviewsByUser,
  updateReview,
} from './reviews.service.js';

/** Mount at `/api/reviews`. */
export function createReviewsRouter(env: Env): Router {
  const router = Router();

  /** GET /api/reviews/me — current user's reviews (paginated) */
  router.get('/me', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const query = listMyReviewsQuerySchema.parse(req.query);
      const result = await listReviewsByUser(userId, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/reviews — public feed (`sort=latest|popular`, `page`, `limit`) */
  router.get('/', async (req, res, next) => {
    try {
      const query = listReviewsQuerySchema.parse(req.query);
      const result = await listReviews(query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/reviews/:id — public */
  router.get('/:id', async (req, res, next) => {
    try {
      const review = await getReviewById(req.params.id);
      if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
      }
      res.json({ review });
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/reviews — requires Bearer JWT */
  router.post('/', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const body = createReviewBodySchema.parse(req.body);
      const review = await createReview(userId, body);
      res.status(201).json({ review });
    } catch (err) {
      next(err);
    }
  });

  /** PATCH /api/reviews/:id — owner only */
  router.patch('/:id', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const body = updateReviewBodySchema.parse(req.body);
      const reviewId = String(req.params.id);
      const result = await updateReview(userId, reviewId, body);
      if (result === 'not_found') {
        res.status(404).json({ error: 'Review not found' });
        return;
      }
      if (result === 'forbidden') {
        res.status(403).json({ error: 'You can only edit your own reviews' });
        return;
      }
      res.json({ review: result });
    } catch (err) {
      next(err);
    }
  });

  /** DELETE /api/reviews/:id — owner only */
  router.delete('/:id', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const reviewId = String(req.params.id);
      const result = await deleteReview(userId, reviewId);
      if (result === 'not_found') {
        res.status(404).json({ error: 'Review not found' });
        return;
      }
      if (result === 'forbidden') {
        res.status(403).json({ error: 'You can only delete your own reviews' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
