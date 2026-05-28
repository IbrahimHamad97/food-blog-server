/**
 * Parses `Authorization: Bearer <jwt>` and attaches `req.auth` for protected routes.
 */
import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { verifySessionToken } from '../lib/jwt.js';

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string; email: string };
}

/** Rejects requests without a valid session JWT. */
export function requireAuth(env: Env) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    try {
      const token = header.slice('Bearer '.length);
      req.auth = verifySessionToken(env, token);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired session' });
    }
  };
}

/** Optional auth — sets req.auth when Bearer token is valid; continues either way. */
export function optionalAuth(env: Env) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        req.auth = verifySessionToken(env, header.slice('Bearer '.length));
      } catch {
        // ignore invalid token for optional routes
      }
    }
    next();
  };
}
