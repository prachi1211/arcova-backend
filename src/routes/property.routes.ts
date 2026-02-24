import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as propertyService from '../services/property.service.js';

const router = Router();

// GET /api/properties
const listPropertiesSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/', authMiddleware, requireRole('host', 'admin'), validate(listPropertiesSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof listPropertiesSchema>;
    const result = await propertyService.listProperties(req.user!.id, req.user!.role, {
      status: q.status,
      page: q.page,
      limit: q.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/properties
const createPropertySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  city: z.string().min(1),
  country: z.string().min(1),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  star_rating: z.number().min(1).max(5).optional(),
  property_type: z.enum(['hotel', 'resort', 'vacation_rental', 'hostel', 'boutique']).optional(),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  total_rooms: z.number().int().min(1).default(1),
});

router.post(
  '/',
  authMiddleware,
  requireRole('host'),
  validate(createPropertySchema),
  async (req, res, next) => {
    try {
      const property = await propertyService.createProperty(req.body, req.user!.id);
      res.status(201).json(property);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/properties/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const property = await propertyService.getProperty(req.params.id as string, req.user!.id, req.user!.role);
    res.json(property);
  } catch (err) {
    next(err);
  }
});

// PUT /api/properties/:id
const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  star_rating: z.number().min(1).max(5).optional(),
  property_type: z.enum(['hotel', 'resort', 'vacation_rental', 'hostel', 'boutique']).optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  total_rooms: z.number().int().min(1).optional(),
  // status intentionally excluded — only admin can change property status via /api/admin/properties/:id/status
});

router.put('/:id', authMiddleware, requireRole('host'), validate(updatePropertySchema), async (req, res, next) => {
  try {
    const property = await propertyService.updateProperty(req.params.id as string, req.user!.id, req.body);
    res.json(property);
  } catch (err) {
    next(err);
  }
});

// POST /api/properties/:id/rooms
const createRoomTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  max_guests: z.number().int().min(1).default(2),
  bed_type: z.string().optional(),
  base_price_cents: z.number().int().min(0),
  currency: z.string().default('USD'),
  total_inventory: z.number().int().min(1).default(1),
  amenities: z.array(z.string()).default([]),
});

router.post(
  '/:id/rooms',
  authMiddleware,
  requireRole('host'),
  validate(createRoomTypeSchema),
  async (req, res, next) => {
    try {
      const roomType = await propertyService.createRoomType(req.params.id as string, req.user!.id, req.body);
      res.status(201).json(roomType);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/properties/:id/rooms/:roomId
const updateRoomTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  max_guests: z.number().int().min(1).optional(),
  bed_type: z.string().optional(),
  base_price_cents: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  total_inventory: z.number().int().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

router.put('/:id/rooms/:roomId', authMiddleware, requireRole('host'), validate(updateRoomTypeSchema), async (req, res, next) => {
  try {
    const roomType = await propertyService.updateRoomType(
      req.params.id as string,
      req.params.roomId as string,
      req.user!.id,
      req.body,
    );
    res.json(roomType);
  } catch (err) {
    next(err);
  }
});

export default router;
