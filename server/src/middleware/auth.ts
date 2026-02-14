import { Request, Response, NextFunction } from 'express';

/**
 * API key authentication middleware for hook endpoints.
 * If API_KEY env var is not set, authentication is skipped (dev mode).
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const validKey = process.env.API_KEY;

  if (!validKey) {
    // Dev mode: no auth required
    return next();
  }

  if (apiKey !== validKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
