/**
 * Auth HTTP routes: Google sign-in, current user, profile update, logout.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env.js';
import {
  BLOCKED_LANGUAGE_MESSAGE,
  findBlockedTerm,
} from '../../lib/content-filter.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { getUserById, loginWithGoogle, updateDisplayName } from './auth.service.js';

const googleBodySchema = z.object({
  idToken: z.string().min(10),
});

const updateProfileBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Display name must be at least 2 characters')
      .max(40, 'Display name must be at most 40 characters'),
  })
  .superRefine((data, ctx) => {
    if (findBlockedTerm(data.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: BLOCKED_LANGUAGE_MESSAGE,
        path: ['name'],
      });
    }
  });

/** Mount at `/api/auth`. */
export function createAuthRouter(env: Env): Router {
  const router = Router();

  /** POST /api/auth/google — body: { idToken } from Google Identity Services */
  router.post('/google', async (req, res, next) => {
    try {
      const { idToken } = googleBodySchema.parse(req.body);
      const result = await loginWithGoogle(env, idToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/auth/me — requires Bearer JWT */
  router.get('/me', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const user = await getUserById(userId);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  /** PATCH /api/auth/me — update display name (requires Bearer JWT) */
  router.patch('/me', requireAuth(env), async (req, res, next) => {
    try {
      const { userId } = (req as AuthenticatedRequest).auth!;
      const { name } = updateProfileBodySchema.parse(req.body);
      const user = await updateDisplayName(userId, name);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/auth/logout — stateless JWT; client clears token */
  router.post('/logout', requireAuth(env), (_req, res) => {
    res.json({ ok: true });
  });

  return router;
}
