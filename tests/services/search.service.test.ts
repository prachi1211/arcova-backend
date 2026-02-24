import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cache modules to prevent side effects
vi.mock('../../src/config/cache.js', () => ({
  searchCache: { get: vi.fn().mockReturnValue(undefined), set: vi.fn() },
  flightCache: { get: vi.fn().mockReturnValue(undefined), set: vi.fn() },
  carCache: { get: vi.fn().mockReturnValue(undefined), set: vi.fn() },
}));

// Mock supabase
const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock data generators
vi.mock('../../src/data/mock-hotels.js', () => ({
  generateMockHotels: vi.fn(() => [
    { id: 'mock-1', name: 'Mock Hotel', city: 'Paris', country: 'France', starRating: 4, pricePerNight: { amount: 150, currency: 'USD' }, amenities: ['wifi'], images: [], availableRooms: 5, source: 'mock', cancellationPolicy: 'free' },
  ]),
}));

vi.mock('../../src/data/mock-flights.js', () => ({
  generateMockFlights: vi.fn(() => [
    { id: 'fl-1', airline: 'TestAir', flightNumber: 'TA100', origin: 'NYC', destination: 'LAX', departureTime: '08:00', arrivalTime: '11:00', duration: '5h 0m', stops: 0, price: { amount: 250, currency: 'USD' }, cabinClass: 'economy', seatsAvailable: 10 },
    { id: 'fl-2', airline: 'TestAir', flightNumber: 'TA200', origin: 'NYC', destination: 'LAX', departureTime: '14:00', arrivalTime: '19:00', duration: '7h 0m', stops: 1, price: { amount: 180, currency: 'USD' }, cabinClass: 'economy', seatsAvailable: 5 },
  ]),
}));

vi.mock('../../src/data/mock-cars.js', () => ({
  generateMockCars: vi.fn(() => [
    { id: 'car-1', company: 'TestRental', vehicleType: 'sedan', vehicleName: 'Toyota Camry', city: 'Paris', country: 'France', pricePerDay: 45, features: ['AC'], availableUnits: 3, source: 'mock', passengerCapacity: 5 },
  ]),
}));

const { searchHotels, getHotelDetail, searchFlights, searchCars, getCarDetail } = await import(
  '../../src/services/search.service.js'
);

beforeEach(() => vi.clearAllMocks());

describe('searchHotels', () => {
  it('should return merged internal + mock results', async () => {
    // Mock supabase query for internal properties
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    };
    // Final await resolves
    (queryChain as any).then = (resolve: Function) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(queryChain);

    const result = await searchHotels({ page: 0, limit: 20 });
    expect(result.results).toBeDefined();
    expect(result.cacheHit).toBe(false);
    expect(result.pageSize).toBe(20);
  });

  it('should return from cache when available', async () => {
    const { searchCache } = await import('../../src/config/cache.js');
    const cached = { results: [], totalCount: 0, page: 0, pageSize: 20, hasNextPage: false, cacheHit: false };
    (searchCache.get as ReturnType<typeof vi.fn>).mockReturnValueOnce(cached);

    const result = await searchHotels({ page: 0, limit: 20 });
    expect(result.cacheHit).toBe(true);
  });

  it('should paginate results', async () => {
    const queryChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    (queryChain as any).then = (resolve: Function) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(queryChain);

    const result = await searchHotels({ page: 0, limit: 1 });
    expect(result.pageSize).toBe(1);
    expect(result.results.length).toBeLessThanOrEqual(1);
  });
});

describe('getHotelDetail', () => {
  it('should return mock hotel detail for mock-prefixed id', async () => {
    const result = await getHotelDetail('mock-1');
    expect(result.property.name).toBe('Mock Hotel');
    expect(result.roomTypes).toBeDefined();
    expect(result.availability).toBeDefined();
  });

  it('should throw for non-existent mock hotel', async () => {
    await expect(getHotelDetail('mock-nonexistent')).rejects.toThrow('Hotel not found');
  });

  it('should query supabase for non-mock id', async () => {
    const propChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'p1', name: 'Real Hotel', city: 'Paris', country: 'France', star_rating: 4, amenities: [], images: [] }, error: null }) };
    const rtChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    (rtChain as any).then = (resolve: Function) => resolve({ data: [{ id: 'rt1', name: 'Standard', max_guests: 2, base_price_cents: 15000, amenities: [], total_inventory: 10 }], error: null });
    const availChain = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    (availChain as any).then = (resolve: Function) => resolve({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') return propChain;
      if (table === 'room_types') return rtChain;
      if (table === 'availability') return availChain;
      return propChain;
    });

    const result = await getHotelDetail('real-uuid');
    expect(result.property.name).toBe('Real Hotel');
  });
});

describe('searchFlights', () => {
  it('should return paginated flight results', async () => {
    const result = await searchFlights({ page: 0, limit: 10 });
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.cacheHit).toBe(false);
  });

  it('should filter by stops', async () => {
    const result = await searchFlights({ stops: 0, page: 0, limit: 10 });
    for (const flight of result.results) {
      expect(flight.stops).toBe(0);
    }
  });

  it('should sort by price ascending by default', async () => {
    const result = await searchFlights({ page: 0, limit: 10 });
    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i].price.amount).toBeGreaterThanOrEqual(result.results[i - 1].price.amount);
    }
  });
});

describe('searchCars', () => {
  it('should return paginated car results', async () => {
    const result = await searchCars({ page: 0, limit: 10 });
    expect(result.results).toBeDefined();
    expect(result.cacheHit).toBe(false);
  });
});

describe('getCarDetail', () => {
  it('should return car for valid id', async () => {
    const result = await getCarDetail('car-1');
    expect(result.vehicleName).toBe('Toyota Camry');
  });

  it('should throw for non-existent car', async () => {
    await expect(getCarDetail('car-nonexistent')).rejects.toThrow('Car rental not found');
  });
});
