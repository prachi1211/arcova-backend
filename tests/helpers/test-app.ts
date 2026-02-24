import express from 'express';
import { errorHandler } from '../../src/middleware/errorHandler.js';

/**
 * Creates a minimal Express app for supertest route testing.
 * Includes JSON parsing and the global error handler, but no auth/rate-limiting.
 * Routes are mounted by the caller.
 */
export function createTestApp() {
  const app = express();
  app.use(express.json());
  return app;
}

/**
 * Attaches the global error handler. Call AFTER mounting routes.
 */
export function attachErrorHandler(app: express.Express) {
  app.use(errorHandler);
  return app;
}
