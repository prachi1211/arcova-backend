import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../types/index.js';

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
    }
    next();
  };
}
