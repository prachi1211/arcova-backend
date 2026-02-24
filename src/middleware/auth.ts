import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' });
  }

  const token = header.split(' ')[1];

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }

  // Fetch profile for role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ error: 'User profile not found', code: 'UNAUTHORIZED' });
  }

  req.user = {
    id: user.id,
    email: user.email!,
    role: profile.role as 'traveller' | 'host' | 'admin',
  };

  next();
}

// Same as authMiddleware but never rejects — populates req.user only when a valid token is present
export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  const token = header.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return next();

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile) {
    req.user = {
      id: user.id,
      email: user.email!,
      role: profile.role as 'traveller' | 'host' | 'admin',
    };
  }

  next();
}
