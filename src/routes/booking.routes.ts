import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as bookingService from '../services/booking.service.js';

const router = Router();

// POST /api/bookings
const createBookingSchema = z.object({
  property_id: z.string().uuid(),
  room_type_id: z.string().uuid(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  num_guests: z.number().int().min(1),
  num_rooms: z.number().int().min(1).default(1),
  special_requests: z.string().optional(),
});

router.post(
  '/',
  authMiddleware,
  requireRole('traveller'),
  validate(createBookingSchema),
  async (req, res, next) => {
    try {
      const booking = await bookingService.createBooking(req.body, req.user!.id);
      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/bookings
const listBookingsSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/',
  authMiddleware,
  validate(listBookingsSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof listBookingsSchema>;
      const result = await bookingService.getBookings(req.user!.id, req.user!.role, {
        status: q.status,
        page: q.page,
        limit: q.limit,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/bookings/summary — MUST be before /:id to avoid matching "summary" as an id
const summarySchema = z.object({
  propertyId: z.string().uuid().optional(),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

router.get(
  '/summary',
  authMiddleware,
  requireRole('host', 'admin'),
  validate(summarySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof summarySchema>;
      const result = await bookingService.getBookingSummary(req.user!.id, req.user!.role, {
        propertyId: q.propertyId,
        period: q.period,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/bookings/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const booking = await bookingService.getBooking(req.params.id as string, req.user!.id, req.user!.role);
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id/cancel
router.patch(
  '/:id/cancel',
  authMiddleware,
  requireRole('traveller'),
  async (req, res, next) => {
    try {
      const booking = await bookingService.cancelBooking(req.params.id as string, req.user!.id);
      res.json(booking);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
