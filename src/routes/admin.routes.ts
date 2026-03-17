import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as adminService from '../services/admin.service.js';

const router = Router();

// GET /api/admin/users
const listUsersSchema = z.object({
  role: z.enum(['traveller', 'host', 'admin']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/users',
  authMiddleware,
  requireRole('admin'),
  validate(listUsersSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof listUsersSchema>;
      const result = await adminService.listUsers({
        role: q.role,
        search: q.search,
        page: q.page,
        limit: q.limit,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/users/:id/role
const updateRoleSchema = z.object({
  role: z.enum(['traveller', 'host', 'admin']),
});

router.patch(
  '/users/:id/role',
  authMiddleware,
  requireRole('admin'),
  validate(updateRoleSchema),
  async (req, res, next) => {
    try {
      const profile = await adminService.updateUserRole(req.params.id as string, req.body.role);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/properties
const listPropertiesSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending_review']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/properties',
  authMiddleware,
  requireRole('admin'),
  validate(listPropertiesSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof listPropertiesSchema>;
      const result = await adminService.listProperties({ status: q.status, page: q.page, limit: q.limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/properties/:id/status
const updatePropertyStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending_review']),
  rejection_reason: z.string().optional(),
});

router.patch(
  '/properties/:id/status',
  authMiddleware,
  requireRole('admin'),
  validate(updatePropertyStatusSchema),
  async (req, res, next) => {
    try {
      const property = await adminService.updatePropertyStatus(
        req.params.id as string,
        req.body.status,
        req.body.rejection_reason,
      );
      res.json(property);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/bookings
const listBookingsSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/bookings',
  authMiddleware,
  requireRole('admin'),
  validate(listBookingsSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof listBookingsSchema>;
      const result = await adminService.listAllBookings({ status: q.status, page: q.page, limit: q.limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/stats
router.get('/stats', authMiddleware, requireRole('admin'), async (_req, res, next) => {
  try {
    const stats = await adminService.getPlatformStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/revenue
const reportSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get('/reports/revenue', authMiddleware, requireRole('admin'), validate(reportSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof reportSchema>;
    const result = await adminService.getRevenueReport({ start: q.start, end: q.end });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/bookings
router.get('/reports/bookings', authMiddleware, requireRole('admin'), validate(reportSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof reportSchema>;
    const result = await adminService.getBookingReport({ start: q.start, end: q.end });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
