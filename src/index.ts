import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttpModule from 'pino-http';
const pinoHttp = pinoHttpModule.default ?? pinoHttpModule;
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import searchRoutes from './routes/search.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import propertyRoutes from './routes/property.routes.js';
import pricingRoutes from './routes/pricing.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import chatRoutes from './routes/chat.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reviewRoutes from './routes/review.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import itineraryRoutes from './routes/itinerary.routes.js';
import * as paymentService from './services/payment.service.js';

const app = express();

// 1. Security headers
app.use(helmet());

// 2. CORS — allow both production and local dev origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// 3. Stripe webhook — MUST be before express.json() (needs raw body for signature verification)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }
    await paymentService.handleWebhook(req.body as Buffer, signature);
    res.json({ received: true });
  } catch (err) {
    logger.error(err, 'Stripe webhook error');
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// 4. Body parsing
app.use(express.json());

// 5. Request logging
app.use(pinoHttp({ logger }));

// 6. Global rate limit
app.use(globalLimiter);

// 7. Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 8. API routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/itineraries', itineraryRoutes);

// 9. Global error handler — must be last
app.use(errorHandler);

// 10. Start server
const port = Number(env.PORT);
app.listen(port, () => {
  logger.info(`Arcova API running on port ${port} [${env.NODE_ENV}]`);
});
