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

// PATCH /api/admin/properties/:id/status
const updatePropertyStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending_review']),
});

router.patch(
  '/properties/:id/status',
  authMiddleware,
  requireRole('admin'),
  validate(updatePropertyStatusSchema),
  async (req, res, next) => {
    try {
      const property = await adminService.updatePropertyStatus(req.params.id as string, req.body.status);
      res.json(property);
    } catch (err) {
      next(err);
    }
  },
);

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
