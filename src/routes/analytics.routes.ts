import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as analyticsService from '../services/analytics.service.js';

const router = Router();

// GET /api/analytics/dashboard
const dashboardSchema = z.object({
  propertyId: z.string().uuid().optional(),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

router.get(
  '/dashboard',
  authMiddleware,
  requireRole('host', 'admin'),
  validate(dashboardSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof dashboardSchema>;
      const result = await analyticsService.getDashboardKPIs(req.user!.id, req.user!.role, {
        propertyId: q.propertyId,
        period: q.period,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/analytics/revenue
const revenueSchema = z.object({
  propertyId: z.string().uuid().optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
});

router.get(
  '/revenue',
  authMiddleware,
  requireRole('host', 'admin'),
  validate(revenueSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof revenueSchema>;
      const result = await analyticsService.getRevenueTimeSeries(req.user!.id, req.user!.role, {
        propertyId: q.propertyId,
        start: q.start,
        end: q.end,
        granularity: q.granularity,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/analytics/occupancy
const occupancySchema = z.object({
  propertyId: z.string().uuid().optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get(
  '/occupancy',
  authMiddleware,
  requireRole('host', 'admin'),
  validate(occupancySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof occupancySchema>;
      const result = await analyticsService.getOccupancyTimeSeries(req.user!.id, req.user!.role, {
        propertyId: q.propertyId,
        start: q.start,
        end: q.end,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/analytics/channel-mix
const channelMixSchema = z.object({
  propertyId: z.string().uuid().optional(),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

router.get(
  '/channel-mix',
  authMiddleware,
  requireRole('host', 'admin'),
  validate(channelMixSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof channelMixSchema>;
      const result = await analyticsService.getChannelMix(req.user!.id, req.user!.role, {
        propertyId: q.propertyId,
        period: q.period,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/analytics/platform — admin only
router.get(
  '/platform',
  authMiddleware,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const result = await analyticsService.getPlatformMetrics();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
