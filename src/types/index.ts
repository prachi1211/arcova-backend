// ============================================================
// AUTH
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  role: 'traveller' | 'host' | 'admin';
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'traveller' | 'host' | 'admin';
  avatar_url: string | null;
  phone: string | null;
  company_name: string | null;
  company_verified: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// PROPERTIES
// ============================================================

export type PropertyType = 'hotel' | 'resort' | 'vacation_rental' | 'hostel' | 'boutique';
export type PropertyStatus = 'active' | 'inactive' | 'pending_review';

export interface Property {
  id: string;
  host_id: string;
  name: string;
  description: string | null;
  city: string;
  country: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  star_rating: number | null;
  property_type: PropertyType | null;
  amenities: string[];
  images: string[];
  total_rooms: number;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  description: string | null;
  max_guests: number;
  bed_type: string | null;
  base_price_cents: number;
  currency: string;
  total_inventory: number;
  amenities: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ============================================================
// BOOKINGS
// ============================================================

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  traveller_id: string;
  property_id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  num_rooms: number;
  total_price_cents: number;
  commission_rate: number;
  net_revenue_cents: number;
  status: BookingStatus;
  booking_source: string;
  special_requests: string | null;
  payment_status: PaymentStatus | null;
  payment_id: string | null;
  booked_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface CreateBookingInput {
  property_id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  num_rooms: number;
  special_requests?: string;
}

// ============================================================
// PRICING
// ============================================================

export type PricingRuleType = 'weekend' | 'seasonal' | 'last_minute' | 'occupancy';
export type AdjustmentType = 'percentage' | 'fixed';

export interface PricingRule {
  id: string;
  room_type_id: string;
  name: string;
  rule_type: PricingRuleType;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  priority: number;
  days_of_week: number[] | null;
  date_from: string | null;
  date_to: string | null;
  days_before_checkin: number | null;
  occupancy_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingResult {
  date: string;
  basePrice: number;
  effectivePrice: number;
  appliedRules: { ruleId: string; ruleName: string; adjustment: number }[];
}

// ============================================================
// AVAILABILITY
// ============================================================

export interface Availability {
  id: string;
  room_type_id: string;
  date: string;
  available_rooms: number;
  effective_rate_cents: number | null;
  is_closed: boolean;
}

// ============================================================
// CONVERSATIONS & AI
// ============================================================

export interface Conversation {
  id: string;
  session_id: string;
  traveller_id: string;
  messages: ConversationMessage[];
  preferences: Record<string, unknown>;
  trip_plan: TripPlan | null;
  suggested_flights: unknown[];
  suggested_hotels: unknown[];
  suggested_places: unknown[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TripPlan {
  destination: string;
  dates: { start: string; end: string };
  budget: { total: number; currency: string };
  itinerary: TripDay[];
  tips: string[];
}

export interface TripDay {
  day: number;
  date: string;
  activities: TripActivity[];
}

export interface TripActivity {
  time: string;
  title: string;
  description: string;
  type: 'activity' | 'meal' | 'transport' | 'accommodation';
  estimatedCost: number;
}

// ============================================================
// SEARCH
// ============================================================

export interface HotelSearchResult {
  id: string;
  name: string;
  city: string;
  country: string;
  starRating: number;
  pricePerNight: { amount: number; currency: string };
  amenities: string[];
  images: string[];
  availableRooms: number;
  source: 'internal' | 'amadeus' | 'mock';
  cancellationPolicy: 'free' | 'partial' | 'non_refundable';
}

export interface FlightSearchResult {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: { amount: number; currency: string };
  cabinClass: string;
  seatsAvailable: number;
}

// ============================================================
// REVIEWS
// ============================================================

export interface Review {
  id: string;
  booking_id: string;
  traveller_id: string;
  property_id: string;
  rating: number;
  comment: string | null;
  host_response: string | null;
  host_responded_at: string | null;
  created_at: string;
}

export interface CreateReviewInput {
  booking_id: string;
  rating: number;
  comment?: string;
}

// ============================================================
// SEARCH HISTORY
// ============================================================

export interface SearchHistory {
  id: string;
  traveller_id: string | null;
  destination: string | null;
  check_in: string | null;
  check_out: string | null;
  num_guests: number | null;
  filters: Record<string, unknown>;
  results_count: number | null;
  searched_at: string;
}

// ============================================================
// CAR RENTALS
// ============================================================

export type VehicleType = 'economy' | 'compact' | 'sedan' | 'suv' | 'luxury' | 'van' | 'convertible';

export interface CarRentalSearchResult {
  id: string;
  company: string;
  vehicleType: VehicleType;
  vehicleName: string;
  city: string;
  country: string;
  pricePerDay: number;
  features: string[];
  availableUnits: number;
  source: 'mock';
  cancellationPolicy: 'free' | 'partial' | 'non_refundable';
  passengerCapacity: number;
  transmission: 'automatic' | 'manual';
}

// ============================================================
// PAYMENTS
// ============================================================

export interface Payment {
  id: string;
  booking_id: string;
  traveller_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  stripe_client_secret: string | null;
  payment_method: string | null;
  failure_reason: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ITINERARIES
// ============================================================

export type ItineraryItemType = 'hotel' | 'flight' | 'car_rental' | 'activity' | 'meal' | 'transport';

export interface ItineraryItem {
  id: string;
  itinerary_id: string;
  type: ItineraryItemType;
  booking_id: string | null;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  estimated_cost_cents: number | null;
  sort_order: number;
  created_at: string;
}

export interface Itinerary {
  id: string;
  traveller_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  total_estimated_cost_cents: number;
  items: ItineraryItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateItineraryInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  cover_image_url?: string;
}

export interface CreateItineraryItemInput {
  type: ItineraryItemType;
  booking_id?: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
  estimated_cost_cents?: number;
  sort_order?: number;
}

// ============================================================
// GENERIC RESPONSE TYPES
// ============================================================

export interface SearchResponse<T> {
  results: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  cacheHit: boolean;
}

export interface PaginatedResponse<T> {
  results: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ============================================================
// EXPRESS AUGMENTATION
// ============================================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
