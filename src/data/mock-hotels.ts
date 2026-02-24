import type { HotelSearchResult } from '../types/index.js';

const mockHotels: HotelSearchResult[] = [
  // Paris
  { id: 'mock-1', name: 'Le Grand Paris Hotel', city: 'Paris', country: 'France', starRating: 5, pricePerNight: { amount: 320, currency: 'USD' }, amenities: ['wifi', 'spa', 'restaurant', 'room_service', 'bar', 'gym'], images: [], availableRooms: 8, source: 'mock', cancellationPolicy: 'partial' },
  { id: 'mock-2', name: 'Hotel Montmartre Charm', city: 'Paris', country: 'France', starRating: 3, pricePerNight: { amount: 120, currency: 'USD' }, amenities: ['wifi', 'breakfast'], images: [], availableRooms: 12, source: 'mock', cancellationPolicy: 'free' },
  { id: 'mock-3', name: 'Seine River Boutique', city: 'Paris', country: 'France', starRating: 4, pricePerNight: { amount: 210, currency: 'USD' }, amenities: ['wifi', 'restaurant', 'bar', 'room_service'], images: [], availableRooms: 5, source: 'mock', cancellationPolicy: 'free' },

  // London
  { id: 'mock-4', name: 'The Westminster Grand', city: 'London', country: 'United Kingdom', starRating: 5, pricePerNight: { amount: 380, currency: 'USD' }, amenities: ['wifi', 'spa', 'gym', 'restaurant', 'bar', 'room_service', 'parking'], images: [], availableRooms: 6, source: 'mock', cancellationPolicy: 'partial' },
  { id: 'mock-5', name: 'Camden Town Inn', city: 'London', country: 'United Kingdom', starRating: 3, pricePerNight: { amount: 110, currency: 'USD' }, amenities: ['wifi', 'breakfast'], images: [], availableRooms: 15, source: 'mock', cancellationPolicy: 'free' },

  // Tokyo
  { id: 'mock-6', name: 'Shinjuku Skyline Hotel', city: 'Tokyo', country: 'Japan', starRating: 4, pricePerNight: { amount: 180, currency: 'USD' }, amenities: ['wifi', 'restaurant', 'gym', 'room_service'], images: [], availableRooms: 10, source: 'mock', cancellationPolicy: 'free' },
  { id: 'mock-7', name: 'Tokyo Imperial Palace Hotel', city: 'Tokyo', country: 'Japan', starRating: 5, pricePerNight: { amount: 420, currency: 'USD' }, amenities: ['wifi', 'spa', 'pool', 'restaurant', 'bar', 'gym', 'room_service', 'parking'], images: [], availableRooms: 4, source: 'mock', cancellationPolicy: 'non_refundable' },
  { id: 'mock-8', name: 'Asakusa Budget Stay', city: 'Tokyo', country: 'Japan', starRating: 3, pricePerNight: { amount: 85, currency: 'USD' }, amenities: ['wifi'], images: [], availableRooms: 20, source: 'mock', cancellationPolicy: 'free' },

  // Bali
  { id: 'mock-9', name: 'Ubud Jungle Resort', city: 'Bali', country: 'Indonesia', starRating: 5, pricePerNight: { amount: 280, currency: 'USD' }, amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym'], images: [], availableRooms: 7, source: 'mock', cancellationPolicy: 'partial' },
  { id: 'mock-10', name: 'Seminyak Beach Hotel', city: 'Bali', country: 'Indonesia', starRating: 4, pricePerNight: { amount: 150, currency: 'USD' }, amenities: ['wifi', 'pool', 'restaurant', 'bar', 'airport_shuttle'], images: [], availableRooms: 14, source: 'mock', cancellationPolicy: 'free' },
  { id: 'mock-11', name: 'Kuta Backpacker Lodge', city: 'Bali', country: 'Indonesia', starRating: 3, pricePerNight: { amount: 35, currency: 'USD' }, amenities: ['wifi', 'pool'], images: [], availableRooms: 25, source: 'mock', cancellationPolicy: 'free' },

  // New York
  { id: 'mock-12', name: 'Manhattan Luxury Suites', city: 'New York', country: 'United States', starRating: 5, pricePerNight: { amount: 500, currency: 'USD' }, amenities: ['wifi', 'spa', 'gym', 'restaurant', 'bar', 'room_service', 'parking'], images: [], availableRooms: 3, source: 'mock', cancellationPolicy: 'non_refundable' },
  { id: 'mock-13', name: 'Times Square Central', city: 'New York', country: 'United States', starRating: 4, pricePerNight: { amount: 250, currency: 'USD' }, amenities: ['wifi', 'gym', 'restaurant'], images: [], availableRooms: 9, source: 'mock', cancellationPolicy: 'partial' },
  { id: 'mock-14', name: 'Brooklyn Heights B&B', city: 'New York', country: 'United States', starRating: 3, pricePerNight: { amount: 140, currency: 'USD' }, amenities: ['wifi', 'breakfast'], images: [], availableRooms: 8, source: 'mock', cancellationPolicy: 'free' },

  // Dubai
  { id: 'mock-15', name: 'Palm Jumeirah Grand Resort', city: 'Dubai', country: 'United Arab Emirates', starRating: 5, pricePerNight: { amount: 450, currency: 'USD' }, amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'room_service', 'parking', 'airport_shuttle', 'breakfast'], images: [], availableRooms: 5, source: 'mock', cancellationPolicy: 'partial' },
  { id: 'mock-16', name: 'Dubai Marina Hotel', city: 'Dubai', country: 'United Arab Emirates', starRating: 4, pricePerNight: { amount: 200, currency: 'USD' }, amenities: ['wifi', 'pool', 'gym', 'restaurant', 'parking'], images: [], availableRooms: 11, source: 'mock', cancellationPolicy: 'free' },

  // Barcelona
  { id: 'mock-17', name: 'Gothic Quarter Boutique', city: 'Barcelona', country: 'Spain', starRating: 4, pricePerNight: { amount: 170, currency: 'USD' }, amenities: ['wifi', 'restaurant', 'bar', 'breakfast'], images: [], availableRooms: 7, source: 'mock', cancellationPolicy: 'free' },
  { id: 'mock-18', name: 'Barceloneta Beach Resort', city: 'Barcelona', country: 'Spain', starRating: 5, pricePerNight: { amount: 310, currency: 'USD' }, amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'room_service'], images: [], availableRooms: 4, source: 'mock', cancellationPolicy: 'partial' },

  // Bangkok
  { id: 'mock-19', name: 'Riverside Bangkok Hotel', city: 'Bangkok', country: 'Thailand', starRating: 4, pricePerNight: { amount: 95, currency: 'USD' }, amenities: ['wifi', 'pool', 'restaurant', 'bar', 'spa'], images: [], availableRooms: 18, source: 'mock', cancellationPolicy: 'free' },
  { id: 'mock-20', name: 'Sukhumvit Budget Inn', city: 'Bangkok', country: 'Thailand', starRating: 3, pricePerNight: { amount: 30, currency: 'USD' }, amenities: ['wifi'], images: [], availableRooms: 30, source: 'mock', cancellationPolicy: 'free' },
  { id: 'mock-21', name: 'Siam Luxury Collection', city: 'Bangkok', country: 'Thailand', starRating: 5, pricePerNight: { amount: 220, currency: 'USD' }, amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'room_service', 'airport_shuttle'], images: [], availableRooms: 6, source: 'mock', cancellationPolicy: 'partial' },

  // Rome
  { id: 'mock-22', name: 'Colosseum View Hotel', city: 'Rome', country: 'Italy', starRating: 4, pricePerNight: { amount: 190, currency: 'USD' }, amenities: ['wifi', 'restaurant', 'bar', 'breakfast'], images: [], availableRooms: 8, source: 'mock', cancellationPolicy: 'free' },
  { id: 'mock-23', name: 'Trastevere Charme B&B', city: 'Rome', country: 'Italy', starRating: 3, pricePerNight: { amount: 95, currency: 'USD' }, amenities: ['wifi', 'breakfast'], images: [], availableRooms: 6, source: 'mock', cancellationPolicy: 'free' },

  // Sydney
  { id: 'mock-24', name: 'Harbour Bridge Suites', city: 'Sydney', country: 'Australia', starRating: 5, pricePerNight: { amount: 350, currency: 'USD' }, amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'room_service'], images: [], availableRooms: 4, source: 'mock', cancellationPolicy: 'partial' },
  { id: 'mock-25', name: 'Bondi Beach Hotel', city: 'Sydney', country: 'Australia', starRating: 4, pricePerNight: { amount: 180, currency: 'USD' }, amenities: ['wifi', 'pool', 'restaurant', 'bar'], images: [], availableRooms: 10, source: 'mock', cancellationPolicy: 'free' },

  // Singapore
  { id: 'mock-26', name: 'Marina Bay Sands View', city: 'Singapore', country: 'Singapore', starRating: 5, pricePerNight: { amount: 400, currency: 'USD' }, amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'room_service'], images: [], availableRooms: 3, source: 'mock', cancellationPolicy: 'non_refundable' },
  { id: 'mock-27', name: 'Chinatown Heritage Inn', city: 'Singapore', country: 'Singapore', starRating: 3, pricePerNight: { amount: 100, currency: 'USD' }, amenities: ['wifi', 'breakfast'], images: [], availableRooms: 12, source: 'mock', cancellationPolicy: 'free' },
];

export function generateMockHotels(params?: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
}): HotelSearchResult[] {
  let results = [...mockHotels];

  if (params?.city) {
    const city = params.city.toLowerCase();
    results = results.filter((h) => h.city.toLowerCase().includes(city));
  }
  if (params?.rating) {
    results = results.filter((h) => h.starRating >= params.rating!);
  }
  if (params?.minPrice != null) {
    results = results.filter((h) => h.pricePerNight.amount >= params.minPrice!);
  }
  if (params?.maxPrice != null) {
    results = results.filter((h) => h.pricePerNight.amount <= params.maxPrice!);
  }

  return results;
}
