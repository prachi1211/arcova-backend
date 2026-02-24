import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as availabilityService from '../services/availability.service.js';

const router = Router();

// GET /api/availability
const getAvailabilitySchema = z.object({
  propertyId: z.string().uuid(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get(
  '/',
  authMiddleware,
  requireRole('host', 'admin'),
  validate(getAvailabilitySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof getAvailabilitySchema>;
      const result = await availabilityService.getAvailability(
        q.propertyId,
        q.start,
        q.end,
        req.user!.id,
        req.user!.role,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/availability/bulk
const bulkUpdateSchema = z.object({
  entries: z.array(
    z.object({
      room_type_id: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      available_rooms: z.number().int().min(0),
      is_closed: z.boolean().optional(),
    }),
  ),
});

router.put(
  '/bulk',
  authMiddleware,
  requireRole('host'),
  validate(bulkUpdateSchema),
  async (req, res, next) => {
    try {
      const result = await availabilityService.bulkUpdateAvailability(req.body.entries, req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
