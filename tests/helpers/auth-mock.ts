import type { Request, Response, NextFunction } from 'express';

export const testUsers = {
  traveller: { id: 'trav-001', email: 'traveller@test.com', role: 'traveller' as const },
  host: { id: 'host-001', email: 'host@test.com', role: 'host' as const },
  admin: { id: 'admin-001', email: 'admin@test.com', role: 'admin' as const },
};

/**
 * Creates a mock authMiddleware that injects the given user into req.user.
 * Pass `null` to simulate an unauthenticated request (returns 401).
 */
export function mockAuthMiddleware(user: typeof testUsers.traveller | null) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!user) {
      return res.status(401).json({ error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' });
    }
    req.user = user;
    next();
  };
}
