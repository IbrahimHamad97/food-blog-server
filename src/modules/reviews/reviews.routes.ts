/**
 * Review HTTP routes — list, create, and detail.
 */
import { Router } from 'express';
import type { Env } from '../../config/env.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import {
  createReviewBodySchema,
  listMyLikedReviewsQuerySchema,
  listMyReviewsQuerySchema,
  listReviewsQuerySchema,
  updateReviewBodySchema,
} from './reviews.schemas.js';
import {
  bookmarkReview,
  createReview,
  deleteReview,
  getReviewById,
  getUserReviewStats,
  likeReview,
  listBookmarkedReviewsByUser,
  listLikedReviewsByUser,
  listReviews,
  listReviewsByUser,
  unbookmarkReview,
  unlikeReview,
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
      const result = await listReviewsByUser(userId, query, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/reviews/me/likes — reviews the current user has liked */
  router.get('/me/likes', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const query = listMyLikedReviewsQuerySchema.parse(req.query);
      const result = await listLikedReviewsByUser(userId, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/reviews/me/bookmarks — reviews the current user has saved */
  router.get('/me/bookmarks', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const query = listMyLikedReviewsQuerySchema.parse(req.query);
      const result = await listBookmarkedReviewsByUser(userId, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/reviews/me/stats — dashboard counters */
  router.get('/me/stats', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const stats = await getUserReviewStats(userId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/reviews — public feed (`sort=latest|popular`, `page`, `limit`) */
  router.get('/', optionalAuth(env), async (req, res, next) => {
    try {
      const viewerId = (req as AuthenticatedRequest).auth?.userId;
      const query = listReviewsQuerySchema.parse(req.query);
      const result = await listReviews(query, viewerId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/reviews/:id — public */
  router.get('/:id', optionalAuth(env), async (req, res, next) => {
    try {
      const viewerId = (req as AuthenticatedRequest).auth?.userId;
      const review = await getReviewById(String(req.params.id), viewerId);
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

  /** POST /api/reviews/:id/like — like a review (requires Bearer JWT) */
  router.post('/:id/like', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const result = await likeReview(userId, String(req.params.id));
      if (result === 'not_found') {
        res.status(404).json({ error: 'Review not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** DELETE /api/reviews/:id/like — remove a like (requires Bearer JWT) */
  router.delete('/:id/like', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const result = await unlikeReview(userId, String(req.params.id));
      if (result === 'not_found') {
        res.status(404).json({ error: 'Review not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/reviews/:id/bookmark — save a review (requires Bearer JWT) */
  router.post('/:id/bookmark', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const result = await bookmarkReview(userId, String(req.params.id));
      if (result === 'not_found') {
        res.status(404).json({ error: 'Review not found' });
        return;
      }
      if (result === 'forbidden') {
        res.status(403).json({ error: 'You cannot bookmark your own review' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** DELETE /api/reviews/:id/bookmark — remove a bookmark (requires Bearer JWT) */
  router.delete('/:id/bookmark', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const result = await unbookmarkReview(userId, String(req.params.id));
      if (result === 'not_found') {
        res.status(404).json({ error: 'Review not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
