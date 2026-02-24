import { supabaseAdmin } from '../config/supabase.js';
import { searchCache, flightCache, carCache } from '../config/cache.js';
import { hashObject } from '../utils/helpers.js';
import { Errors } from '../utils/errors.js';
import { generateMockHotels } from '../data/mock-hotels.js';
import { generateMockFlights } from '../data/mock-flights.js';
import { generateMockCars } from '../data/mock-cars.js';
import type { HotelSearchResult, FlightSearchResult, CarRentalSearchResult, VehicleType, SearchResponse } from '../types/index.js';

export async function searchHotels(params: {
  city?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  amenities?: string;
  sort?: string;
  page: number;
  limit: number;
  userId?: string;
}): Promise<SearchResponse<HotelSearchResult>> {
  const cacheKey = `hotels:${hashObject(params as Record<string, unknown>)}`;
  const cached = searchCache.get<SearchResponse<HotelSearchResult>>(cacheKey);
  if (cached) return { ...cached, cacheHit: true };

  // Query internal properties from Supabase
  let internalHotels: HotelSearchResult[] = [];
  try {
    let query = supabaseAdmin
      .from('properties')
      .select('*, room_types(*)', { count: 'exact' })
      .eq('status', 'active');

    if (params.city) {
      query = query.ilike('city', `%${params.city}%`);
    }
    if (params.rating) {
      query = query.gte('star_rating', params.rating);
    }

    const { data: properties, error } = await query;
    if (error) throw error;

    internalHotels = (properties ?? []).map((p) => {
      const roomTypes = (p.room_types ?? []) as { base_price_cents: number; total_inventory: number; max_guests: number }[];
      const cheapestRoom = roomTypes.length > 0
        ? roomTypes.reduce((min, rt) => rt.base_price_cents < min.base_price_cents ? rt : min, roomTypes[0])
        : null;

      return {
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        starRating: p.star_rating ?? 3,
        pricePerNight: {
          amount: cheapestRoom ? cheapestRoom.base_price_cents / 100 : 0,
          currency: 'USD',
        },
        amenities: p.amenities ?? [],
        images: p.images ?? [],
        availableRooms: roomTypes.reduce((sum, rt) => sum + rt.total_inventory, 0),
        source: 'internal' as const,
        cancellationPolicy: 'free' as const,
      };
    });
  } catch {
    // If Supabase query fails, continue with mock data only
  }

  // Get mock hotels
  const mockResults = generateMockHotels({
    city: params.city,
    rating: params.rating,
  });

  // Merge internal + mock (avoid duplicates by city+name)
  const internalKeys = new Set(internalHotels.map((h) => `${h.city}:${h.name}`));
  const deduped = [...internalHotels, ...mockResults.filter((m) => !internalKeys.has(`${m.city}:${m.name}`))];

  // Apply filters on combined array
  let filtered = deduped;

  if (params.minPrice != null) {
    filtered = filtered.filter((h) => h.pricePerNight.amount >= params.minPrice!);
  }
  if (params.maxPrice != null) {
    filtered = filtered.filter((h) => h.pricePerNight.amount <= params.maxPrice!);
  }
  if (params.guests) {
    filtered = filtered.filter((h) => h.availableRooms > 0);
  }
  if (params.amenities) {
    const required = params.amenities.split(',').map((a) => a.trim().toLowerCase());
    filtered = filtered.filter((h) =>
      required.every((req) => h.amenities.some((a) => a.toLowerCase() === req)),
    );
  }

  // Sort
  switch (params.sort) {
    case 'price_asc':
      filtered.sort((a, b) => a.pricePerNight.amount - b.pricePerNight.amount);
      break;
    case 'price_desc':
      filtered.sort((a, b) => b.pricePerNight.amount - a.pricePerNight.amount);
      break;
    case 'rating':
      filtered.sort((a, b) => b.starRating - a.starRating);
      break;
    case 'relevance':
    default:
      // Internal results first, then by rating
      filtered.sort((a, b) => {
        if (a.source === 'internal' && b.source !== 'internal') return -1;
        if (a.source !== 'internal' && b.source === 'internal') return 1;
        return b.starRating - a.starRating;
      });
      break;
  }

  // Paginate
  const totalCount = filtered.length;
  const start = params.page * params.limit;
  const results = filtered.slice(start, start + params.limit);

  const response: SearchResponse<HotelSearchResult> = {
    results,
    totalCount,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: start + params.limit < totalCount,
    cacheHit: false,
  };

  searchCache.set(cacheKey, response);

  // Fire-and-forget: save search history
  if (params.userId) {
    Promise.resolve(
      supabaseAdmin
        .from('search_history')
        .insert({
          traveller_id: params.userId,
          destination: params.city ?? null,
          check_in: params.checkIn ?? null,
          check_out: params.checkOut ?? null,
          num_guests: params.guests ?? null,
          filters: {
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            rating: params.rating,
            amenities: params.amenities,
          },
          results_count: totalCount,
        }),
    ).catch(() => {});
  }

  return response;
}

export async function getHotelDetail(
  propertyId: string,
): Promise<{
  property: HotelSearchResult;
  roomTypes: { id: string; name: string; maxGuests: number; pricePerNight: number; amenities: string[] }[];
  availability: { date: string; availableRooms: number; rate: number }[];
}> {
  // Mock hotel detail
  if (propertyId.startsWith('mock-')) {
    const mockHotels = generateMockHotels();
    const hotel = mockHotels.find((h) => h.id === propertyId);
    if (!hotel) throw Errors.notFound('Hotel');

    // Generate synthetic room types and availability for mock hotels
    const roomTypes = [
      { id: `${propertyId}-standard`, name: 'Standard Room', maxGuests: 2, pricePerNight: hotel.pricePerNight.amount, amenities: ['wifi'] },
      { id: `${propertyId}-deluxe`, name: 'Deluxe Room', maxGuests: 3, pricePerNight: Math.round(hotel.pricePerNight.amount * 1.5), amenities: ['wifi', 'room_service'] },
    ];

    const availability: { date: string; availableRooms: number; rate: number }[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      availability.push({
        date: d.toISOString().split('T')[0],
        availableRooms: hotel.availableRooms,
        rate: hotel.pricePerNight.amount,
      });
    }

    return { property: hotel, roomTypes, availability };
  }

  // Internal property from Supabase
  const { data: property, error: propError } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (propError || !property) throw Errors.notFound('Property');

  const { data: roomTypes, error: rtError } = await supabaseAdmin
    .from('room_types')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', 'active');

  if (rtError) throw Errors.internal(rtError.message);

  // Next 30 days of availability
  const today = new Date().toISOString().split('T')[0];
  const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const rtIds = (roomTypes ?? []).map((rt) => rt.id);
  const { data: avail } = await supabaseAdmin
    .from('availability')
    .select('*')
    .in('room_type_id', rtIds.length > 0 ? rtIds : ['none'])
    .gte('date', today)
    .lte('date', thirtyDays)
    .eq('is_closed', false);

  const cheapestRoom = (roomTypes ?? []).length > 0
    ? (roomTypes ?? []).reduce((min, rt) => rt.base_price_cents < min.base_price_cents ? rt : min, roomTypes![0])
    : null;

  const hotelResult: HotelSearchResult = {
    id: property.id,
    name: property.name,
    city: property.city,
    country: property.country,
    starRating: property.star_rating ?? 3,
    pricePerNight: {
      amount: cheapestRoom ? cheapestRoom.base_price_cents / 100 : 0,
      currency: 'USD',
    },
    amenities: property.amenities ?? [],
    images: property.images ?? [],
    availableRooms: (roomTypes ?? []).reduce((sum, rt) => sum + rt.total_inventory, 0),
    source: 'internal',
    cancellationPolicy: 'free',
  };

  return {
    property: hotelResult,
    roomTypes: (roomTypes ?? []).map((rt) => ({
      id: rt.id,
      name: rt.name,
      maxGuests: rt.max_guests,
      pricePerNight: rt.base_price_cents / 100,
      amenities: rt.amenities ?? [],
    })),
    availability: (avail ?? []).map((a) => ({
      date: a.date,
      availableRooms: a.available_rooms,
      rate: a.effective_rate_cents ? a.effective_rate_cents / 100 : (cheapestRoom ? cheapestRoom.base_price_cents / 100 : 0),
    })),
  };
}

export async function searchFlights(params: {
  origin?: string;
  dest?: string;
  date?: string;
  returnDate?: string;
  pax?: number;
  cabin?: string;
  stops?: number;
  sort?: string;
  page: number;
  limit: number;
}): Promise<SearchResponse<FlightSearchResult>> {
  const cacheKey = `flights:${hashObject(params as Record<string, unknown>)}`;
  const cached = flightCache.get<SearchResponse<FlightSearchResult>>(cacheKey);
  if (cached) return { ...cached, cacheHit: true };

  let flights = generateMockFlights({
    origin: params.origin,
    dest: params.dest,
    date: params.date,
    returnDate: params.returnDate,
    pax: params.pax,
    cabin: params.cabin,
  });

  // Filter by stops
  if (params.stops != null) {
    flights = flights.filter((f) => f.stops <= params.stops!);
  }

  // Sort
  switch (params.sort) {
    case 'price_asc':
      flights.sort((a, b) => a.price.amount - b.price.amount);
      break;
    case 'price_desc':
      flights.sort((a, b) => b.price.amount - a.price.amount);
      break;
    case 'duration': {
      const parseDuration = (d: string) => {
        const match = d.match(/(\d+)h\s*(\d+)m/);
        return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
      };
      flights.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
      break;
    }
    case 'departure':
      flights.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
      break;
    default:
      flights.sort((a, b) => a.price.amount - b.price.amount);
      break;
  }

  // Paginate
  const totalCount = flights.length;
  const start = params.page * params.limit;
  const results = flights.slice(start, start + params.limit);

  const response: SearchResponse<FlightSearchResult> = {
    results,
    totalCount,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: start + params.limit < totalCount,
    cacheHit: false,
  };

  flightCache.set(cacheKey, response);
  return response;
}

export async function searchCars(params: {
  city?: string;
  vehicleType?: VehicleType;
  pickupDate?: string;
  dropoffDate?: string;
  minPrice?: number;
  maxPrice?: number;
  transmission?: 'automatic' | 'manual';
  sort?: string;
  page: number;
  limit: number;
}): Promise<SearchResponse<CarRentalSearchResult>> {
  const cacheKey = `cars:${hashObject(params as Record<string, unknown>)}`;
  const cached = carCache.get<SearchResponse<CarRentalSearchResult>>(cacheKey);
  if (cached) return { ...cached, cacheHit: true };

  const cars = generateMockCars({
    city: params.city,
    vehicleType: params.vehicleType,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    transmission: params.transmission,
  });

  // Sort
  switch (params.sort) {
    case 'price_asc':
      cars.sort((a, b) => a.pricePerDay - b.pricePerDay);
      break;
    case 'price_desc':
      cars.sort((a, b) => b.pricePerDay - a.pricePerDay);
      break;
    case 'capacity':
      cars.sort((a, b) => b.passengerCapacity - a.passengerCapacity);
      break;
    default:
      cars.sort((a, b) => a.pricePerDay - b.pricePerDay);
      break;
  }

  // Paginate
  const totalCount = cars.length;
  const start = params.page * params.limit;
  const results = cars.slice(start, start + params.limit);

  const response: SearchResponse<CarRentalSearchResult> = {
    results,
    totalCount,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: start + params.limit < totalCount,
    cacheHit: false,
  };

  carCache.set(cacheKey, response);
  return response;
}

export async function getCarDetail(carId: string): Promise<CarRentalSearchResult> {
  const allCars = generateMockCars();
  const car = allCars.find((c) => c.id === carId);
  if (!car) throw Errors.notFound('Car rental');
  return car;
}
