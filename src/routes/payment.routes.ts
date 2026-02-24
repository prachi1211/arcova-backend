import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as paymentService from '../services/payment.service.js';

const router = Router();

// POST /api/payments/create-intent — create a Stripe PaymentIntent (traveller only)
const createIntentSchema = z.object({
  booking_id: z.string().uuid(),
});

router.post('/create-intent', authMiddleware, requireRole('traveller'), validate(createIntentSchema), async (req, res, next) => {
  try {
    const result = await paymentService.createPaymentIntent(req.body.booking_id, req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/confirm — check/confirm payment status (traveller only)
const confirmSchema = z.object({
  payment_id: z.string().uuid(),
});

router.post('/confirm', authMiddleware, requireRole('traveller'), validate(confirmSchema), async (req, res, next) => {
  try {
    const payment = await paymentService.confirmPayment(req.body.payment_id, req.user!.id);
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/history — payment history (traveller only)
const historySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/history', authMiddleware, requireRole('traveller'), validate(historySchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof historySchema>;
    const result = await paymentService.getPaymentHistory(req.user!.id, {
      page: q.page,
      limit: q.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
