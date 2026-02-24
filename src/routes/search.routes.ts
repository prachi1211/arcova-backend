import { Router } from 'express';
import { z } from 'zod';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as searchService from '../services/search.service.js';

const router = Router();

// GET /api/search/hotels
const hotelSearchSchema = z.object({
  city: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.coerce.number().int().min(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  amenities: z.string().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating', 'relevance']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/hotels', optionalAuthMiddleware, validate(hotelSearchSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof hotelSearchSchema>;
    const result = await searchService.searchHotels({
      city: q.city,
      checkIn: q.checkIn,
      checkOut: q.checkOut,
      guests: q.guests,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      rating: q.rating,
      amenities: q.amenities,
      sort: q.sort,
      page: q.page,
      limit: q.limit,
      userId: req.user?.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/hotels/:id
router.get('/hotels/:id', async (req, res, next) => {
  try {
    const result = await searchService.getHotelDetail(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/flights
const flightSearchSchema = z.object({
  origin: z.string().optional(),
  dest: z.string().optional(),
  date: z.string().optional(),
  return: z.string().optional(),
  pax: z.coerce.number().int().min(1).optional(),
  cabin: z.string().optional(),
  stops: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'duration', 'departure']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/flights', validate(flightSearchSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof flightSearchSchema>;
    const result = await searchService.searchFlights({
      origin: q.origin,
      dest: q.dest,
      date: q.date,
      returnDate: q.return,
      pax: q.pax,
      cabin: q.cabin,
      stops: q.stops,
      sort: q.sort,
      page: q.page,
      limit: q.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/cars
const carSearchSchema = z.object({
  city: z.string().optional(),
  vehicleType: z.enum(['economy', 'compact', 'sedan', 'suv', 'luxury', 'van', 'convertible']).optional(),
  pickupDate: z.string().optional(),
  dropoffDate: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  transmission: z.enum(['automatic', 'manual']).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'capacity']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/cars', validate(carSearchSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof carSearchSchema>;
    const result = await searchService.searchCars({
      city: q.city,
      vehicleType: q.vehicleType,
      pickupDate: q.pickupDate,
      dropoffDate: q.dropoffDate,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      transmission: q.transmission,
      sort: q.sort,
      page: q.page,
      limit: q.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/cars/:id
router.get('/cars/:id', async (req, res, next) => {
  try {
    const result = await searchService.getCarDetail(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
