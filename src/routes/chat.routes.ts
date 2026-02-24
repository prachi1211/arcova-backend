import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import * as chatService from '../services/chat.service.js';

const router = Router();

// POST /api/chat/new
router.post(
  '/new',
  authMiddleware,
  requireRole('traveller', 'admin'),
  async (req, res, next) => {
    try {
      const result = await chatService.createConversation(req.user!.id);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/chat/message — SSE streaming
const messageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
});

router.post(
  '/message',
  authMiddleware,
  requireRole('traveller', 'admin'),
  chatLimiter,
  validate(messageSchema),
  async (req, res, next) => {
    try {
      await chatService.sendMessage(
        req.body.sessionId,
        req.body.message,
        req.user!.id,
        res,
      );
    } catch (err) {
      // If headers already sent, the SSE stream handled the error
      if (!res.headersSent) {
        next(err);
      }
    }
  },
);

// GET /api/chat/history/:sessionId
router.get(
  '/history/:sessionId',
  authMiddleware,
  requireRole('traveller', 'admin'),
  async (req, res, next) => {
    try {
      const conversation = await chatService.getHistory(req.params.sessionId as string, req.user!.id);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/chat/trip/:sessionId
router.get(
  '/trip/:sessionId',
  authMiddleware,
  requireRole('traveller', 'admin'),
  async (req, res, next) => {
    try {
      const tripPlan = await chatService.getTripPlan(req.params.sessionId as string, req.user!.id);
      res.json({ tripPlan });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
