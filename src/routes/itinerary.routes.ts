import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as itineraryService from '../services/itinerary.service.js';

const router = Router();

// All itinerary routes require authenticated traveller
router.use(authMiddleware, requireRole('traveller'));

// POST /api/itineraries — create a new itinerary
const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cover_image_url: z.string().url().optional(),
});

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const itinerary = await itineraryService.createItinerary(req.body, req.user!.id);
    res.status(201).json(itinerary);
  } catch (err) {
    next(err);
  }
});

// GET /api/itineraries — list traveller's itineraries
const listSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/', validate(listSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof listSchema>;
    const result = await itineraryService.getItineraries(req.user!.id, {
      page: q.page,
      limit: q.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/itineraries/from-trip-plan — convert AI trip plan to itinerary (BEFORE /:id routes)
const fromTripPlanSchema = z.object({
  session_id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
});

router.post('/from-trip-plan', validate(fromTripPlanSchema), async (req, res, next) => {
  try {
    const { session_id, name } = req.body;
    const itinerary = await itineraryService.createFromTripPlanBySession(req.user!.id, session_id, name);
    res.status(201).json(itinerary);
  } catch (err) {
    next(err);
  }
});

// GET /api/itineraries/:id — get itinerary with items
router.get('/:id', async (req, res, next) => {
  try {
    const itinerary = await itineraryService.getItinerary(req.params.id as string, req.user!.id);
    res.json(itinerary);
  } catch (err) {
    next(err);
  }
});

// PUT /api/itineraries/:id — update itinerary metadata
const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cover_image_url: z.string().url().optional(),
});

router.put('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const itinerary = await itineraryService.updateItinerary(req.params.id as string, req.user!.id, req.body);
    res.json(itinerary);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/itineraries/:id — delete itinerary
router.delete('/:id', async (req, res, next) => {
  try {
    await itineraryService.deleteItinerary(req.params.id as string, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/itineraries/:id/items — add item to itinerary
const addItemSchema = z.object({
  type: z.enum(['hotel', 'flight', 'car_rental', 'activity', 'meal', 'transport']),
  booking_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  estimated_cost_cents: z.number().int().min(0).optional(),
  sort_order: z.number().int().min(0).optional(),
});

router.post('/:id/items', validate(addItemSchema), async (req, res, next) => {
  try {
    const item = await itineraryService.addItem(req.params.id as string, req.user!.id, req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/itineraries/:id/items/:itemId — remove item from itinerary
router.delete('/:id/items/:itemId', async (req, res, next) => {
  try {
    await itineraryService.removeItem(req.params.id as string, req.params.itemId as string, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
