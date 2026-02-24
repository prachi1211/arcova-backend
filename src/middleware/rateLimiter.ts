import rateLimit from 'express-rate-limit';

// Global rate limit — 100 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
});

// Chat-specific rate limit — 10 requests per minute (Claude API calls are expensive)
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat requests, please slow down', code: 'RATE_LIMITED' },
});
