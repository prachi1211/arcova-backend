import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as pricingService from '../services/pricing.service.js';

const router = Router();

// GET /api/pricing/rules
const listRulesSchema = z.object({
  roomTypeId: z.string().uuid(),
});

router.get(
  '/rules',
  authMiddleware,
  requireRole('host', 'admin'),
  validate(listRulesSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof listRulesSchema>;
      const rules = await pricingService.listRules(q.roomTypeId, req.user!.id, req.user!.role);
      res.json(rules);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/pricing/rules
const createRuleSchema = z.object({
  room_type_id: z.string().uuid(),
  name: z.string().min(1),
  rule_type: z.enum(['weekend', 'seasonal', 'last_minute', 'occupancy']),
  adjustment_type: z.enum(['percentage', 'fixed']),
  adjustment_value: z.number(),
  priority: z.number().int().min(1).default(1),
  days_of_week: z.array(z.number().int().min(1).max(7)).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  days_before_checkin: z.number().int().optional(),
  occupancy_threshold: z.number().optional(),
});

router.post(
  '/rules',
  authMiddleware,
  requireRole('host'),
  validate(createRuleSchema),
  async (req, res, next) => {
    try {
      const rule = await pricingService.createRule(req.body, req.user!.id);
      res.status(201).json(rule);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/pricing/rules/:id
const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  adjustment_type: z.enum(['percentage', 'fixed']).optional(),
  adjustment_value: z.number().optional(),
  priority: z.number().int().min(1).optional(),
  days_of_week: z.array(z.number().int().min(1).max(7)).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  days_before_checkin: z.number().int().optional(),
  occupancy_threshold: z.number().optional(),
  is_active: z.boolean().optional(),
});

router.put('/rules/:id', authMiddleware, requireRole('host'), validate(updateRuleSchema), async (req, res, next) => {
  try {
    const rule = await pricingService.updateRule(req.params.id as string, req.user!.id, req.body);
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/pricing/rules/:id
router.delete('/rules/:id', authMiddleware, requireRole('host'), async (req, res, next) => {
  try {
    await pricingService.deleteRule(req.params.id as string, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/pricing/preview
const previewSchema = z.object({
  room_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.post(
  '/preview',
  authMiddleware,
  requireRole('host', 'admin'),
  validate(previewSchema),
  async (req, res, next) => {
    try {
      const rates = await pricingService.previewRates(
        req.body.room_type_id,
        req.body.start_date,
        req.body.end_date,
        req.user!.id,
        req.user!.role,
      );
      res.json(rates);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
