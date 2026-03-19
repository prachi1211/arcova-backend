import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as supportService from '../services/support.service.js';

const router = Router();

// POST /api/support — create a ticket (traveller or host)
const createSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

router.post(
  '/',
  authMiddleware,
  requireRole('traveller', 'host'),
  validate(createSchema),
  async (req, res, next) => {
    try {
      const ticket = await supportService.createTicket(
        req.body,
        req.user!.id,
        req.user!.role as 'traveller' | 'host',
      );
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/support — list own tickets (traveller or host)
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/',
  authMiddleware,
  requireRole('traveller', 'host'),
  validate(listQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof listQuerySchema>;
      const result = await supportService.getMyTickets(req.user!.id, {
        page: q.page,
        limit: q.limit,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/support/admin — all tickets (admin only)
const adminListSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/admin',
  authMiddleware,
  requireRole('admin'),
  validate(adminListSchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as z.infer<typeof adminListSchema>;
      const result = await supportService.getAllTickets({
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

// PATCH /api/support/admin/:id — update ticket status/notes (admin only)
const updateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  admin_notes: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

router.patch(
  '/admin/:id',
  authMiddleware,
  requireRole('admin'),
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const ticket = await supportService.updateTicket(req.params.id as string, req.body);
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
