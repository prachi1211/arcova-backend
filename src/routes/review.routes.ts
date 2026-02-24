import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as reviewService from '../services/review.service.js';

const router = Router();

// POST /api/reviews — create a review (traveller only)
const createReviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

router.post('/', authMiddleware, requireRole('traveller'), validate(createReviewSchema), async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.body, req.user!.id);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews — list reviews for a property (public)
const listReviewsSchema = z.object({
  propertyId: z.string().uuid(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/', validate(listReviewsSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof listReviewsSchema>;
    const result = await reviewService.getPropertyReviews(q.propertyId, {
      page: q.page,
      limit: q.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/:id — get a single review (public)
router.get('/:id', async (req, res, next) => {
  try {
    const review = await reviewService.getReview(req.params.id as string);
    res.json(review);
  } catch (err) {
    next(err);
  }
});

// PUT /api/reviews/:id — update a review (traveller only, owner)
const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
});

router.put('/:id', authMiddleware, requireRole('traveller'), validate(updateReviewSchema), async (req, res, next) => {
  try {
    const review = await reviewService.updateReview(req.params.id as string, req.user!.id, req.body);
    res.json(review);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reviews/:id — delete a review (traveller only, owner)
router.delete('/:id', authMiddleware, requireRole('traveller'), async (req, res, next) => {
  try {
    await reviewService.deleteReview(req.params.id as string, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reviews/:id/response — add host response (host only)
const hostResponseSchema = z.object({
  response: z.string().min(1),
});

router.patch('/:id/response', authMiddleware, requireRole('host'), validate(hostResponseSchema), async (req, res, next) => {
  try {
    const review = await reviewService.addHostResponse(req.params.id as string, req.user!.id, req.body.response);
    res.json(review);
  } catch (err) {
    next(err);
  }
});

export default router;
