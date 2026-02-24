# Arcova API Endpoints

Base URL: `http://localhost:3001` (dev) or your deployed URL.

All authenticated endpoints require: `Authorization: Bearer <supabase_access_token>`

---

## Table of Contents

1. [Health Check](#health-check)
2. [Authentication](#authentication)
3. [Search](#search)
4. [Bookings](#bookings)
5. [Properties](#properties)
6. [Pricing Rules](#pricing-rules)
7. [Availability](#availability)
8. [Analytics](#analytics)
9. [AI Chat](#ai-chat)
10. [Reviews](#reviews)
11. [Payments](#payments)
12. [Itineraries](#itineraries)
13. [Admin](#admin)
14. [Webhooks](#webhooks)

---

## Health Check

### `GET /health`

**Auth:** None

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-22T12:00:00.000Z"
}
```

---

## Authentication

### `POST /api/auth/signup`

**Auth:** None

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepass",
  "full_name": "John Doe",
  "role": "traveller"          // "traveller" | "host", default: "traveller"
}
```

**Response (201):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "traveller" },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1700000000
  },
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "traveller",
    "avatar_url": null,
    "phone": null,
    "company_name": null,
    "company_verified": false,
    "preferences": {},
    "created_at": "2026-02-22T12:00:00.000Z",
    "updated_at": "2026-02-22T12:00:00.000Z"
  }
}
```

---

### `POST /api/auth/login`

**Auth:** None

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepass"
}
```

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "traveller" },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1700000000
  },
  "profile": { "..." }
}
```

---

### `POST /api/auth/forgot-password`

**Auth:** None

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

---

### `POST /api/auth/reset-password`

**Auth:** None

**Body:**
```json
{
  "access_token": "token-from-reset-link",
  "new_password": "newsecurepass",
  "confirm_password": "newsecurepass"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully."
}
```

---

### `GET /api/auth/me`

**Auth:** Required (any role)

**Response (200):** `Profile` object

---

### `PUT /api/auth/profile`

**Auth:** Required (any role)

**Body:**
```json
{
  "full_name": "Jane Doe",
  "phone": "+1234567890",
  "avatar_url": "https://example.com/avatar.jpg",
  "company_name": "Acme Hotels"
}
```
All fields optional.

**Response (200):** Updated `Profile` object

---

## Search

### `GET /api/search/hotels`

**Auth:** Optional (saves search history if authenticated)

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | Filter by city name (partial match) |
| `checkIn` | string | No | Check-in date (YYYY-MM-DD) |
| `checkOut` | string | No | Check-out date (YYYY-MM-DD) |
| `guests` | number | No | Number of guests |
| `minPrice` | number | No | Min price per night (USD) |
| `maxPrice` | number | No | Max price per night (USD) |
| `rating` | number | No | Minimum star rating (1-5) |
| `amenities` | string | No | Comma-separated amenities |
| `sort` | string | No | `price_asc`, `price_desc`, `rating`, `relevance` |
| `page` | number | No | Page number, 0-indexed (default: 0) |
| `limit` | number | No | Results per page, 1-50 (default: 20) |

**Response (200):**
```json
{
  "results": [
    {
      "id": "mock-1",
      "name": "Le Grand Paris Hotel",
      "city": "Paris",
      "country": "France",
      "starRating": 5,
      "pricePerNight": { "amount": 320, "currency": "USD" },
      "amenities": ["wifi", "spa", "restaurant"],
      "images": [],
      "availableRooms": 8,
      "source": "mock",
      "cancellationPolicy": "partial"
    }
  ],
  "totalCount": 27,
  "page": 0,
  "pageSize": 20,
  "hasNextPage": true,
  "cacheHit": false
}
```

---

### `GET /api/search/hotels/:id`

**Auth:** None

**Response (200):**
```json
{
  "property": { "...HotelSearchResult" },
  "roomTypes": [
    { "id": "uuid", "name": "Standard Room", "maxGuests": 2, "pricePerNight": 120, "amenities": ["wifi"] }
  ],
  "availability": [
    { "date": "2026-02-23", "availableRooms": 8, "rate": 120 }
  ]
}
```

---

### `GET /api/search/flights`

**Auth:** None

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `origin` | string | No | Origin city/airport |
| `dest` | string | No | Destination city/airport |
| `date` | string | No | Departure date (YYYY-MM-DD) |
| `return` | string | No | Return date (YYYY-MM-DD) |
| `pax` | number | No | Number of passengers |
| `cabin` | string | No | Cabin class |
| `stops` | number | No | Max stops (0 = direct only) |
| `sort` | string | No | `price_asc`, `price_desc`, `duration`, `departure` |
| `page` | number | No | Default: 0 |
| `limit` | number | No | Default: 20 |

**Response (200):**
```json
{
  "results": [
    {
      "id": "fl-1",
      "airline": "Air France",
      "flightNumber": "AF123",
      "origin": "Paris",
      "destination": "London",
      "departureTime": "2026-03-01T08:00:00Z",
      "arrivalTime": "2026-03-01T09:15:00Z",
      "duration": "1h 15m",
      "stops": 0,
      "price": { "amount": 150, "currency": "USD" },
      "cabinClass": "economy",
      "seatsAvailable": 42
    }
  ],
  "totalCount": 15,
  "page": 0,
  "pageSize": 20,
  "hasNextPage": false,
  "cacheHit": false
}
```

---

### `GET /api/search/cars`

**Auth:** None

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | Filter by city |
| `vehicleType` | string | No | `economy`, `compact`, `sedan`, `suv`, `luxury`, `van`, `convertible` |
| `pickupDate` | string | No | Pickup date (YYYY-MM-DD) |
| `dropoffDate` | string | No | Dropoff date (YYYY-MM-DD) |
| `minPrice` | number | No | Min price per day |
| `maxPrice` | number | No | Max price per day |
| `transmission` | string | No | `automatic` or `manual` |
| `sort` | string | No | `price_asc`, `price_desc`, `capacity` |
| `page` | number | No | Default: 0 |
| `limit` | number | No | Default: 20 |

**Response (200):**
```json
{
  "results": [
    {
      "id": "car-1",
      "company": "Europcar",
      "vehicleType": "economy",
      "vehicleName": "Renault Clio",
      "city": "Paris",
      "country": "France",
      "pricePerDay": 32,
      "features": ["air_conditioning", "bluetooth"],
      "availableUnits": 8,
      "source": "mock",
      "cancellationPolicy": "free",
      "passengerCapacity": 4,
      "transmission": "manual"
    }
  ],
  "totalCount": 27,
  "page": 0,
  "pageSize": 20,
  "hasNextPage": true,
  "cacheHit": false
}
```

---

### `GET /api/search/cars/:id`

**Auth:** None

**Response (200):** Single `CarRentalSearchResult` object

---

## Bookings

### `POST /api/bookings`

**Auth:** Required — `traveller`

**Body:**
```json
{
  "property_id": "uuid",
  "room_type_id": "uuid",
  "check_in": "2026-03-15",
  "check_out": "2026-03-18",
  "num_guests": 2,
  "num_rooms": 1,
  "special_requests": "Late check-in please"
}
```

**Response (201):** `Booking` object

---

### `GET /api/bookings`

**Auth:** Required (any role — scoped by role)
- Traveller: sees own bookings
- Host: sees bookings for own properties
- Admin: sees all bookings

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter: `confirmed`, `cancelled`, `completed`, `no_show` |
| `page` | number | No | Default: 0 |
| `limit` | number | No | Default: 20 |

**Response (200):**
```json
{
  "results": [ "...Booking objects with properties(name, city) and room_types(name) joins" ],
  "totalCount": 12,
  "page": 0,
  "pageSize": 20,
  "hasNextPage": false
}
```

---

### `GET /api/bookings/summary`

**Auth:** Required — `host` or `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | uuid | No | Filter to specific property |
| `period` | string | No | `7d`, `30d`, `90d` (default: `30d`) |

**Response (200):**
```json
{
  "totalBookings": 45,
  "confirmedCount": 30,
  "cancelledCount": 5,
  "completedCount": 10,
  "totalRevenueCents": 1250000,
  "netRevenueCents": 1062500,
  "avgBookingValueCents": 27778
}
```

---

### `GET /api/bookings/:id`

**Auth:** Required (any role — ownership/scope enforced)

**Response (200):** `Booking` object with property and room type joins

---

### `PATCH /api/bookings/:id/cancel`

**Auth:** Required — `traveller` (own bookings only)

**Response (200):** Updated `Booking` object with `status: "cancelled"`

---

## Properties

### `GET /api/properties`

**Auth:** Required — `host` or `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter: `active`, `inactive`, `pending_review` |
| `page` | number | No | Default: 0 |
| `limit` | number | No | Default: 20 |

**Response (200):**
```json
{
  "results": [ "...Property objects with room_types summary" ],
  "totalCount": 6,
  "page": 0,
  "pageSize": 20,
  "hasNextPage": false
}
```

---

### `POST /api/properties`

**Auth:** Required — `host`

**Body:**
```json
{
  "name": "Sunset Beach Resort",
  "description": "A beautiful beachfront resort",
  "city": "Bali",
  "country": "Indonesia",
  "address": "123 Beach Road",
  "latitude": -8.409518,
  "longitude": 115.188916,
  "star_rating": 4,
  "property_type": "resort",
  "amenities": ["wifi", "pool", "spa"],
  "images": ["https://example.com/img1.jpg"],
  "total_rooms": 50
}
```
Only `name`, `city`, `country` required. All others optional.

**Response (201):** `Property` object

---

### `GET /api/properties/:id`

**Auth:** Required (any role — host scoped to own)

**Response (200):** `Property` object with full `room_types[]` array

---

### `PUT /api/properties/:id`

**Auth:** Required — `host` (own properties only)

**Body:** Any subset of Property fields:
```json
{
  "name": "Updated Resort Name",
  "star_rating": 5,
  "amenities": ["wifi", "pool", "spa", "gym"],
  "status": "active"
}
```

**Response (200):** Updated `Property` object

---

### `POST /api/properties/:id/rooms`

**Auth:** Required — `host` (own properties only)

**Body:**
```json
{
  "name": "Deluxe Ocean Suite",
  "description": "Spacious suite with ocean view",
  "max_guests": 3,
  "bed_type": "king",
  "base_price_cents": 25000,
  "currency": "USD",
  "total_inventory": 10,
  "amenities": ["wifi", "minibar", "balcony"]
}
```
Only `name` and `base_price_cents` required.

**Response (201):** `RoomType` object

---

### `PUT /api/properties/:id/rooms/:roomId`

**Auth:** Required — `host` (own properties only)

**Body:** Any subset of RoomType fields:
```json
{
  "base_price_cents": 28000,
  "total_inventory": 12,
  "status": "active"
}
```

**Response (200):** Updated `RoomType` object

---

## Pricing Rules

### `GET /api/pricing/rules`

**Auth:** Required — `host` or `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `roomTypeId` | uuid | Yes | Room type to get rules for |

**Response (200):** `PricingRule[]` sorted by priority

---

### `POST /api/pricing/rules`

**Auth:** Required — `host` (must own the property chain)

**Body:**
```json
{
  "room_type_id": "uuid",
  "name": "Weekend Surcharge",
  "rule_type": "weekend",
  "adjustment_type": "percentage",
  "adjustment_value": 20,
  "priority": 1,
  "days_of_week": [5, 6]
}
```

`rule_type` options: `weekend`, `seasonal`, `last_minute`, `occupancy`
`adjustment_type` options: `percentage`, `fixed`

Additional fields per rule type:
- **weekend:** `days_of_week` (1=Mon, 7=Sun)
- **seasonal:** `date_from`, `date_to`
- **last_minute:** `days_before_checkin`
- **occupancy:** `occupancy_threshold`

**Response (201):** `PricingRule` object

---

### `PUT /api/pricing/rules/:id`

**Auth:** Required — `host`

**Body:** Any subset of PricingRule fields:
```json
{
  "adjustment_value": 25,
  "is_active": false
}
```

**Response (200):** Updated `PricingRule` object

---

### `DELETE /api/pricing/rules/:id`

**Auth:** Required — `host`

**Response (204):** No content

---

### `POST /api/pricing/preview`

**Auth:** Required — `host` or `admin`

**Body:**
```json
{
  "room_type_id": "uuid",
  "start_date": "2026-03-01",
  "end_date": "2026-03-07"
}
```

**Response (200):**
```json
[
  {
    "date": "2026-03-01",
    "basePrice": 15000,
    "effectivePrice": 18000,
    "appliedRules": [
      { "ruleId": "uuid", "ruleName": "Weekend Surcharge", "adjustment": 3000 }
    ]
  }
]
```

---

## Availability

### `GET /api/availability`

**Auth:** Required — `host` or `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | uuid | Yes | Property ID |
| `start` | string | Yes | Start date (YYYY-MM-DD) |
| `end` | string | Yes | End date (YYYY-MM-DD) |

**Response (200):**
```json
[
  {
    "roomTypeId": "uuid",
    "roomTypeName": "Standard Room",
    "availability": [
      { "id": "uuid", "room_type_id": "uuid", "date": "2026-03-01", "available_rooms": 5, "effective_rate_cents": null, "is_closed": false }
    ]
  }
]
```

---

### `PUT /api/availability/bulk`

**Auth:** Required — `host`

**Body:**
```json
{
  "entries": [
    { "room_type_id": "uuid", "date": "2026-03-01", "available_rooms": 5, "is_closed": false },
    { "room_type_id": "uuid", "date": "2026-03-02", "available_rooms": 0, "is_closed": true }
  ]
}
```

**Response (200):** `Availability[]` — upserted rows

---

## Analytics

### `GET /api/analytics/dashboard`

**Auth:** Required — `host` or `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | uuid | No | Filter to specific property |
| `period` | string | No | `7d`, `30d`, `90d` (default: `30d`) |

**Response (200):**
```json
{
  "totalRevenueCents": 5000000,
  "netRevenueCents": 4250000,
  "totalBookings": 120,
  "confirmedBookings": 95,
  "cancelledBookings": 10,
  "avgBookingValueCents": 41667,
  "occupancyRate": 72,
  "adr": 18500,
  "revpar": 13320
}
```

---

### `GET /api/analytics/revenue`

**Auth:** Required — `host` or `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | uuid | No | Filter to specific property |
| `start` | string | No | Start date (YYYY-MM-DD) |
| `end` | string | No | End date (YYYY-MM-DD) |
| `granularity` | string | No | `day`, `week`, `month` (default: `day`) |

**Response (200):**
```json
[
  { "date": "2026-02-01", "grossRevenueCents": 250000, "netRevenueCents": 212500, "bookingCount": 5 }
]
```

---

### `GET /api/analytics/occupancy`

**Auth:** Required — `host` or `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | uuid | No | Filter to specific property |
| `start` | string | No | Start date (YYYY-MM-DD) |
| `end` | string | No | End date (YYYY-MM-DD) |

**Response (200):**
```json
[
  { "date": "2026-02-01", "occupancyPercent": 75, "bookedRooms": 15, "totalRooms": 20 }
]
```

---

### `GET /api/analytics/channel-mix`

**Auth:** Required — `host` or `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | uuid | No | Filter to specific property |
| `period` | string | No | `7d`, `30d`, `90d` (default: `30d`) |

**Response (200):**
```json
[
  { "source": "platform", "bookingCount": 80, "revenueCents": 4000000, "percentage": 80 },
  { "source": "direct", "bookingCount": 20, "revenueCents": 1000000, "percentage": 20 }
]
```

---

### `GET /api/analytics/platform`

**Auth:** Required — `admin` only

**Response (200):**
```json
{
  "totalUsers": 500,
  "totalTravellers": 420,
  "totalHosts": 75,
  "totalProperties": 60,
  "activeProperties": 52,
  "totalBookings": 1200,
  "totalRevenueCents": 25000000,
  "totalCommissionCents": 3750000
}
```

---

## AI Chat

### `POST /api/chat/new`

**Auth:** Required — `traveller` or `admin`

**Body:** None

**Response (201):**
```json
{
  "sessionId": "uuid",
  "conversationId": "uuid"
}
```

---

### `POST /api/chat/message`

**Auth:** Required — `traveller` or `admin`
**Rate limit:** 10 requests/minute

**Body:**
```json
{
  "sessionId": "uuid",
  "message": "Plan a 5-day trip to Paris for two on a $3000 budget"
}
```

**Response:** Server-Sent Events (SSE) stream

Each event is `data: {...}\n\n` with types:
| Type | Payload | Description |
|------|---------|-------------|
| `token` | `{ "content": "text chunk" }` | Streamed text from Claude |
| `trip_plan` | `{ "plan": TripPlan }` | Complete structured trip plan |
| `error` | `{ "content": "error message" }` | Stream error |
| `done` | `{}` | Stream complete |

---

### `GET /api/chat/history/:sessionId`

**Auth:** Required — `traveller` or `admin`

**Response (200):** `Conversation` object with full message history

---

### `GET /api/chat/trip/:sessionId`

**Auth:** Required — `traveller` or `admin`

**Response (200):**
```json
{
  "tripPlan": {
    "destination": "Paris, France",
    "dates": { "start": "2026-04-01", "end": "2026-04-05" },
    "budget": { "total": 3000, "currency": "USD" },
    "itinerary": [
      {
        "day": 1,
        "date": "2026-04-01",
        "activities": [
          { "time": "09:00", "title": "Visit Eiffel Tower", "description": "...", "type": "activity", "estimatedCost": 30 }
        ]
      }
    ],
    "tips": ["Buy a Paris Museum Pass"]
  }
}
```

---

## Reviews

### `POST /api/reviews`

**Auth:** Required — `traveller`

**Body:**
```json
{
  "booking_id": "uuid",
  "rating": 5,
  "comment": "Amazing stay! Highly recommended."
}
```
Booking must be `completed` and owned by the traveller. One review per booking.

**Response (201):** `Review` object

---

### `GET /api/reviews`

**Auth:** None (public)

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | uuid | Yes | Property to get reviews for |
| `page` | number | No | Default: 0 |
| `limit` | number | No | Default: 20 |

**Response (200):**
```json
{
  "results": [
    {
      "id": "uuid",
      "booking_id": "uuid",
      "traveller_id": "uuid",
      "property_id": "uuid",
      "rating": 5,
      "comment": "Amazing stay!",
      "host_response": "Thank you for your kind words!",
      "host_responded_at": "2026-02-22T15:00:00.000Z",
      "created_at": "2026-02-22T12:00:00.000Z"
    }
  ],
  "totalCount": 8,
  "page": 0,
  "pageSize": 20,
  "hasNextPage": false
}
```

---

### `GET /api/reviews/:id`

**Auth:** None (public)

**Response (200):** Single `Review` object

---

### `PUT /api/reviews/:id`

**Auth:** Required — `traveller` (owner only)

**Body:**
```json
{
  "rating": 4,
  "comment": "Updated review text"
}
```
Both fields optional.

**Response (200):** Updated `Review` object

---

### `DELETE /api/reviews/:id`

**Auth:** Required — `traveller` (owner only)

**Response (204):** No content

---

### `PATCH /api/reviews/:id/response`

**Auth:** Required — `host` (must own the reviewed property)

**Body:**
```json
{
  "response": "Thank you for your feedback! We hope to see you again."
}
```

**Response (200):** Updated `Review` object with `host_response` and `host_responded_at`

---

## Payments

### `POST /api/payments/create-intent`

**Auth:** Required — `traveller`

**Body:**
```json
{
  "booking_id": "uuid"
}
```

Booking must be `confirmed` and owned by the traveller. Idempotent — returns existing pending payment if one exists.

**Response (201):**
```json
{
  "payment": {
    "id": "uuid",
    "booking_id": "uuid",
    "traveller_id": "uuid",
    "amount_cents": 96000,
    "currency": "usd",
    "status": "pending",
    "stripe_payment_intent_id": "pi_...",
    "stripe_client_secret": "pi_..._secret_...",
    "payment_method": null,
    "failure_reason": null,
    "refunded_at": null,
    "created_at": "2026-02-22T12:00:00.000Z",
    "updated_at": "2026-02-22T12:00:00.000Z"
  },
  "clientSecret": "pi_..._secret_..."
}
```

Returns `400` with message if Stripe is not configured.

---

### `POST /api/payments/confirm`

**Auth:** Required — `traveller`

**Body:**
```json
{
  "payment_id": "uuid"
}
```

Retrieves latest status from Stripe and updates local records.

**Response (200):** Updated `Payment` object

---

### `GET /api/payments/history`

**Auth:** Required — `traveller`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | No | Default: 0 |
| `limit` | number | No | Default: 20 |

**Response (200):**
```json
{
  "results": [ "...Payment objects" ],
  "totalCount": 5,
  "page": 0,
  "pageSize": 20,
  "hasNextPage": false
}
```

---

## Itineraries

All itinerary endpoints require `traveller` role.

### `POST /api/itineraries`

**Auth:** Required — `traveller`

**Body:**
```json
{
  "name": "Paris Spring Trip",
  "description": "5-day trip with my partner",
  "start_date": "2026-04-01",
  "end_date": "2026-04-05",
  "cover_image_url": "https://example.com/paris.jpg"
}
```
Only `name`, `start_date`, `end_date` required.

**Response (201):**
```json
{
  "id": "uuid",
  "traveller_id": "uuid",
  "name": "Paris Spring Trip",
  "description": "5-day trip with my partner",
  "start_date": "2026-04-01",
  "end_date": "2026-04-05",
  "cover_image_url": "https://example.com/paris.jpg",
  "total_estimated_cost_cents": 0,
  "items": [],
  "created_at": "2026-02-22T12:00:00.000Z",
  "updated_at": "2026-02-22T12:00:00.000Z"
}
```

---

### `GET /api/itineraries`

**Auth:** Required — `traveller`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | No | Default: 0 |
| `limit` | number | No | Default: 20 |

**Response (200):** `PaginatedResponse<Itinerary>` — each itinerary includes its `items[]`

---

### `POST /api/itineraries/from-trip-plan`

**Auth:** Required — `traveller`

Converts an AI-generated trip plan from a chat conversation into an itinerary.

**Body:**
```json
{
  "session_id": "uuid",
  "name": "My AI Trip Plan"
}
```
`name` is optional (defaults to "Trip to {destination}").

**Response (201):** `Itinerary` object with all items populated from the trip plan

---

### `GET /api/itineraries/:id`

**Auth:** Required — `traveller` (own itineraries only)

**Response (200):** `Itinerary` object with `items[]` sorted by `sort_order`

---

### `PUT /api/itineraries/:id`

**Auth:** Required — `traveller` (own itineraries only)

**Body:**
```json
{
  "name": "Updated Trip Name",
  "start_date": "2026-04-02",
  "end_date": "2026-04-07"
}
```
All fields optional.

**Response (200):** Updated `Itinerary` object with items

---

### `DELETE /api/itineraries/:id`

**Auth:** Required — `traveller` (own itineraries only)

Items are cascade-deleted.

**Response (204):** No content

---

### `POST /api/itineraries/:id/items`

**Auth:** Required — `traveller` (own itineraries only)

**Body:**
```json
{
  "type": "activity",
  "title": "Visit Eiffel Tower",
  "description": "Morning visit with skip-the-line tickets",
  "date": "2026-04-01",
  "time": "09:00",
  "end_time": "11:00",
  "location": "Champ de Mars, Paris",
  "notes": "Book tickets in advance",
  "estimated_cost_cents": 3000,
  "sort_order": 0
}
```

`type` options: `hotel`, `flight`, `car_rental`, `activity`, `meal`, `transport`

Only `type`, `title`, `date` required. `sort_order` auto-assigned if omitted.

**Response (201):** `ItineraryItem` object

---

### `DELETE /api/itineraries/:id/items/:itemId`

**Auth:** Required — `traveller` (own itineraries only)

Recalculates `total_estimated_cost_cents` after removal.

**Response (204):** No content

---

## Admin

All admin endpoints require `admin` role.

### `GET /api/admin/users`

**Auth:** Required — `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | No | Filter: `traveller`, `host`, `admin` |
| `search` | string | No | Search by email or name |
| `page` | number | No | Default: 0 |
| `limit` | number | No | Default: 20 |

**Response (200):** `PaginatedResponse<Profile>`

---

### `PATCH /api/admin/users/:id/role`

**Auth:** Required — `admin`

**Body:**
```json
{
  "role": "host"
}
```

**Response (200):** Updated `Profile` object

---

### `PATCH /api/admin/properties/:id/status`

**Auth:** Required — `admin`

**Body:**
```json
{
  "status": "active"
}
```
Options: `active`, `inactive`, `pending_review`

**Response (200):** Updated `Property` object

---

### `GET /api/admin/reports/revenue`

**Auth:** Required — `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | string | No | Start date (YYYY-MM-DD) |
| `end` | string | No | End date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "totalRevenueCents": 25000000,
  "totalCommissionCents": 3750000,
  "totalNetRevenueCents": 21250000,
  "bookingCount": 1200,
  "avgBookingValueCents": 20833,
  "byMonth": [
    { "month": "2026-01", "revenueCents": 8000000, "commissionCents": 1200000, "count": 400 }
  ]
}
```

---

### `GET /api/admin/reports/bookings`

**Auth:** Required — `admin`

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | string | No | Start date (YYYY-MM-DD) |
| `end` | string | No | End date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "totalBookings": 1200,
  "byStatus": [
    { "status": "confirmed", "count": 800 },
    { "status": "completed", "count": 300 },
    { "status": "cancelled", "count": 100 }
  ],
  "byMonth": [
    { "month": "2026-01", "total": 400, "confirmed": 280, "cancelled": 30, "completed": 90 }
  ]
}
```

---

## Webhooks

### `POST /api/webhooks/stripe`

**Auth:** Stripe signature verification (via `stripe-signature` header)

**Content-Type:** `application/json` (raw body — parsed before `express.json()`)

**Handled events:**
| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Updates payment status to `succeeded`, updates booking `payment_status` |
| `payment_intent.payment_failed` | Updates payment status to `failed` with `failure_reason`, updates booking |

**Response (200):**
```json
{
  "received": true
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Validation errors include details:
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

**Common error codes:**
| Status | Code | Meaning |
|--------|------|---------|
| 400 | `BAD_REQUEST` | Invalid input |
| 400 | `VALIDATION_ERROR` | Zod schema validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate or conflicting state |
| 429 | — | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Server error |
