/**
 * Central Express error handler — returns JSON instead of HTML stack traces.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }

  if (err instanceof Error && err.message.includes('Google token')) {
    res.status(401).json({ error: 'Google sign-in failed' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
