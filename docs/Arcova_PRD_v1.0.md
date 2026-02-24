# PRODUCT REQUIREMENTS DOCUMENT

## **Arcova**

### Unified Travel Platform

**Search · Book · Manage · AI-Powered**

| | |
|---|---|
| **Version** | 1.0 — MVP |
| **Timeline** | 2 Days (16 Hours) |
| **Stack** | React + Node.js + Supabase |
| **Architecture** | Separate Frontend & Backend Repos |
| **Date** | February 2026 |

---

## Table of Contents

> This document covers the complete architecture, data models, API contracts, frontend components, database schema, and implementation timeline for the Arcova unified platform.

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema (Supabase)](#4-database-schema-supabase-postgresql)
5. [Role-Based Access Control](#5-role-based-access-control)
6. [Backend API Design (Node.js)](#6-backend-api-design-nodejs--express)
7. [Frontend Architecture (React)](#7-frontend-architecture-react)
8. [Design System — "Deep & Luxe"](#8-design-system--deep--luxe)
9. [Module 1: Travel Search & Booking](#9-module-1-travel-search--booking)
10. [Module 2: AI Travel Assistant](#10-module-2-ai-travel-assistant)
11. [Module 3: Host Portal](#11-module-3-host-portal)
12. [Module 4: Admin Dashboard](#12-module-4-admin-dashboard)
13. [Day 1 Implementation Plan](#13-day-1-implementation-plan-8-hours)
14. [Day 2 Implementation Plan](#14-day-2-implementation-plan-8-hours)
15. [Environment & Deployment](#15-environment--deployment)
16. [Success Criteria](#16-success-criteria)
17. [Future Roadmap](#17-future-roadmap)

---

## 1. Executive Summary

Arcova is a unified full-stack travel platform that consolidates three previously separate projects into a single, cohesive application. The platform serves three distinct user roles through a single React frontend and one Node.js backend, powered by Supabase for data persistence, auth, and real-time capabilities.

### The Core Idea

One codebase. Three user experiences. A traveller searches and books travel. A host manages properties and pricing. An admin oversees the entire marketplace. All powered by the same API and database, differentiated only by role-based access.

### What We Are Building

This platform unifies three modules that were originally designed as standalone projects:

| Module | Origin PRD | User Role | Core Capability |
|--------|-----------|-----------|-----------------|
| Travel Search & Booking Engine | TravelAggregator API | Traveller | Search flights/hotels, filter, sort, book |
| AI Travel Assistant | TripMind | Traveller | Conversational trip planning with LLM |
| Host Portal | PartnerHub | Host | Property mgmt, pricing, analytics |
| Admin Dashboard | New (derived) | Admin | Platform oversight, user mgmt, reports |

### Why Unify?

- **Shared data layer:** Hotels created by hosts are the same hotels travellers search. One database, one truth.
- **Single auth system:** Supabase Auth with role-based access eliminates duplicate auth infrastructure.
- **Faster development:** Shared React component library, shared API client, shared types.
- **Realistic marketplace:** Data flows naturally: host creates hotel → traveller finds it → admin monitors it.
- **Deployment simplicity:** Two repos (frontend + backend), one database, one deploy pipeline.

---

## 2. System Architecture

The system follows a clean three-tier architecture with clear separation of concerns. The frontend and backend are completely independent repositories that communicate exclusively via REST APIs and Server-Sent Events (SSE).

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARCOVA PLATFORM                            │
│                                                                 │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐│
│  │  FRONTEND (React SPA)       │  │  BACKEND (Node.js/Express) ││
│  │                             │  │                            ││
│  │  Traveller Dashboard         │  │  /api/auth/*               ││
│  │  Host Dashboard   REST  │  │  /api/search/*             ││
│  │  Admin Dashboard     <───>  │  │  /api/bookings/*           ││
│  │                       SSE   │  │  /api/properties/*         ││
│  │  Role-Based Routing         │  │  /api/analytics/*          ││
│  │  Shared Component Library   │  │  /api/pricing/*            ││
│  │                             │  │  /api/chat/*  (AI/SSE)     ││
│  └─────────────────────────────┘  │  /api/admin/*              ││
│                                   │                            ││
│                                   └──────────┬─────────────────┘│
│                                              │                  │
│                                   ┌──────────┴─────────────────┐│
│                                   │       SUPABASE             ││
│                                   │  PostgreSQL  |  Auth       ││
│                                   │  Storage     |  Realtime   ││
│                                   │  Edge Functions            ││
│                                   └────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### External Service Integrations

| Service | Purpose | Fallback |
|---------|---------|----------|
| Anthropic Claude API | AI travel assistant chat & trip planning | Mock responses with static trip data |
| Amadeus API (sandbox) | Real flight & hotel search data | Mock data provider with realistic patterns |
| Supabase Auth | JWT authentication, role management | N/A (core dependency) |
| Supabase Storage | Property images, user avatars | Local file storage |
| Supabase Realtime | Live booking notifications | Polling fallback |

### Repository Structure

Two completely independent Git repositories:

| Repository | Stack | Port | Deploy Target |
|-----------|-------|------|---------------|
| `arcova-frontend` | React 18 + Vite + TypeScript + Tailwind | 5173 (dev) | https://witharcova.vercel.app |
| `arcova-backend` | Node.js + Express + TypeScript + Supabase SDK | 3001 (dev) | Railway / Render / Fly.io |

---

## 3. Tech Stack

### Frontend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | React 18 + TypeScript | Industry standard, type safety, rich ecosystem |
| Build Tool | Vite | Instant HMR, fast builds, ESM-native |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, professional components, rapid prototyping |
| State (Server) | TanStack Query v5 | Cache management, optimistic updates, refetch strategies |
| State (Client) | Zustand | Lightweight global state for auth, UI preferences |
| Routing | React Router v6 | Nested layouts, protected routes, role-based redirects |
| Charts | Recharts | React-native, composable, lightweight |
| Forms | React Hook Form + Zod | Performant forms with schema validation |
| HTTP Client | Axios | Interceptors for auth tokens, error handling |
| Icons | Lucide React | Consistent, tree-shakable icon set |
| Dates | date-fns | Modular, immutable, lightweight |
| Class Utils | clsx + tailwind-merge | Conditional classes + Tailwind conflict resolution |

### Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 20 LTS | Non-blocking I/O, same language as frontend |
| Framework | Express.js + TypeScript | Minimal, flexible, massive ecosystem |
| Database | Supabase (PostgreSQL 15) | Managed Postgres, instant APIs, auth, realtime, storage |
| ORM | Supabase JS Client + raw SQL | Direct Supabase SDK for queries, raw SQL for complex joins |
| Auth | Supabase Auth + JWT middleware | Built-in RBAC, email/password, OAuth ready |
| AI/LLM | Anthropic SDK (`@anthropic-ai/sdk`) | Claude API for travel assistant |
| Validation | Zod | Runtime type validation, shared with frontend |
| Rate Limiting | express-rate-limit | Per-endpoint rate limiting |
| Caching | node-cache (in-memory) | Simple TTL cache for search results |
| Logging | Pino + pino-pretty | Structured JSON logging, fast |
| Testing | Vitest + Supertest | Fast, ESM-native, API integration tests |

### Infrastructure

| Component | Choice | Notes |
|-----------|--------|-------|
| Database | Supabase PostgreSQL | Free tier: 500MB, 2 projects |
| Auth Provider | Supabase Auth | Email/password + future OAuth |
| File Storage | Supabase Storage | Property images, avatars |
| Realtime | Supabase Realtime | WebSocket-based, Postgres changes |
| Containerization | Docker + docker-compose | Local dev parity |
| CI/CD | GitHub Actions | Lint, test, build, deploy |

---

## 4. Database Schema (Supabase PostgreSQL)

All tables live in a single Supabase PostgreSQL instance. Row Level Security (RLS) policies enforce access control at the database level, ensuring hosts can only see their own data, travellers can only see their own bookings, and admins have full read access.

### Core Tables

#### `profiles`

Extends Supabase `auth.users` with app-specific data.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'traveller'
    CHECK (role IN ('traveller', 'host', 'admin')),
  avatar_url TEXT,
  phone TEXT,
  company_name TEXT,          -- hosts only
  company_verified BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `properties`

Hotels/resorts managed by hosts, searchable by travellers.

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  star_rating DECIMAL(2,1) CHECK (star_rating BETWEEN 1 AND 5),
  property_type TEXT CHECK (property_type IN
    ('hotel','resort','vacation_rental','hostel','boutique')),
  amenities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  total_rooms INT NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','inactive','pending_review')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `room_types`

```sql
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_guests INT NOT NULL DEFAULT 2,
  bed_type TEXT,
  base_price_cents INT NOT NULL,   -- store money as cents
  currency TEXT DEFAULT 'USD',
  total_inventory INT NOT NULL DEFAULT 1,
  amenities JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `bookings`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id UUID NOT NULL REFERENCES profiles(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  room_type_id UUID NOT NULL REFERENCES room_types(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  num_guests INT NOT NULL DEFAULT 1,
  num_rooms INT NOT NULL DEFAULT 1,
  total_price_cents INT NOT NULL,
  commission_rate DECIMAL(4,2) DEFAULT 15.00,
  net_revenue_cents INT GENERATED ALWAYS AS (
    ROUND(total_price_cents - (total_price_cents * commission_rate / 100.0))
  ) STORED,
  status TEXT DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  booking_source TEXT DEFAULT 'arcova',
  special_requests TEXT,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);
```

> **MVP notes:** `daily_metrics` dropped — analytics computed on the fly from `bookings`. Admin approval flow (`pending_review`) is post-MVP; properties default to `active`.

#### `pricing_rules`

```sql
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('weekend','seasonal','last_minute','occupancy')),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage','fixed')),
  adjustment_value DECIMAL(10,2) NOT NULL,  -- positive = surcharge, negative = discount
  priority INT NOT NULL DEFAULT 1,
  days_of_week INT[],                       -- weekend: [6,7] (1=Mon)
  date_from DATE,                           -- seasonal: range start
  date_to DATE,                             -- seasonal: range end
  days_before_checkin INT,                  -- last_minute: e.g. 3
  occupancy_threshold DECIMAL(5,2),         -- occupancy: e.g. 80.00
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `availability`

```sql
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_rooms INT NOT NULL,
  effective_rate_cents INT,  -- base price + applied pricing rules
  is_closed BOOLEAN DEFAULT FALSE,
  UNIQUE(room_type_id, date)
);
```

#### `search_history`

```sql
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  destination TEXT,
  check_in DATE,
  check_out DATE,
  num_guests INT,
  filters JSONB DEFAULT '{}',  -- price_range, star_rating, amenities, etc.
  results_count INT,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `conversations`

Stores full AI assistant session state — messages, preferences, trip plan, and AI-surfaced suggestions.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  traveller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',           -- [{role, content, timestamp}]
  preferences JSONB DEFAULT '{}',        -- budget, travel_style, interests, group_size, dates
  trip_plan JSONB,                       -- structured day-by-day itinerary
  suggested_flights JSONB DEFAULT '[]',  -- flight options surfaced by AI
  suggested_hotels JSONB DEFAULT '[]',   -- hotel options surfaced by AI
  suggested_places JSONB DEFAULT '[]',   -- POIs, restaurants, activities
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `reviews`

One review per booking enforced by unique constraint.

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  traveller_id UUID NOT NULL REFERENCES profiles(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  host_response TEXT,
  host_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);
```

### Row Level Security (RLS) Policies

```sql
-- Hosts: only see their own properties
CREATE POLICY host_properties ON properties
  FOR ALL USING (host_id = auth.uid());

-- Travellers: only see their own bookings
CREATE POLICY traveller_bookings ON bookings
  FOR SELECT USING (traveller_id = auth.uid());

-- Admins: read everything
CREATE POLICY admin_read_all ON properties
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Public: anyone can search active properties
CREATE POLICY public_search ON properties
  FOR SELECT USING (status = 'active');
```

---

## 5. Role-Based Access Control

The same React frontend serves all three user roles. After login, the app reads the user's role from their profile and renders the appropriate dashboard layout, navigation, and routes. The backend enforces access at both the middleware level (JWT role check) and the database level (RLS).

### Role Matrix

| Capability | Traveller | Host | Admin |
|-----------|----------|----------|-------|
| Search hotels & flights | ✓ | — | ✓ |
| Book hotels | ✓ | — | — |
| AI trip planning chat | ✓ | — | ✓ |
| View own bookings | ✓ | — | ✓ (all) |
| Manage properties | — | ✓ (own) | ✓ (all) |
| Manage room types & pricing | — | ✓ (own) | ✓ (all) |
| View booking analytics | — | ✓ (own) | ✓ (all) |
| Manage availability calendar | — | ✓ (own) | ✓ (all) |
| View platform-wide metrics | — | — | ✓ |
| Manage users & roles | — | — | ✓ |
| Approve/reject properties | — | — | ✓ |
| System configuration | — | — | ✓ |

### Auth Flow

1. User signs up via Supabase Auth (email + password). A Supabase trigger auto-creates a `profiles` row with `role = 'traveller'` (default).
2. Admin can promote users to `'host'` or `'admin'` via the admin dashboard.
3. On login, the frontend fetches the user's profile including role.
4. React Router renders role-specific layouts: `TravellerLayout`, `HostLayout`, or `AdminLayout`.
5. Every API request includes the Supabase JWT. Backend middleware validates the token and extracts the role.
6. Unauthorized access returns `403` with a clear error message.

### Frontend Route Structure

```
/                           → Landing page (public)
/auth/login                 → Login (public)
/auth/signup                → Sign up with role selection (public)

/traveller/                  → Traveller dashboard (search, recent)
/traveller/search            → Search results (hotels + flights)
/traveller/hotel/:id         → Hotel detail + booking
/traveller/bookings          → My bookings list
/traveller/assistant         → AI travel planner chat

/host/                  → Host dashboard (KPIs, charts)
/host/properties        → My properties list
/host/properties/:id    → Property detail + room types
/host/bookings          → Incoming bookings table
/host/analytics         → Revenue & occupancy charts
/host/pricing           → Pricing rules manager
/host/availability      → Availability calendar grid

/admin/                     → Admin dashboard (platform metrics)
/admin/users                → User management table
/admin/properties           → All properties (approve/reject)
/admin/bookings             → All bookings (platform-wide)
```

> **Note:** Routes like `/traveller/trip/:id`, `/admin/analytics`, and `/admin/settings` are deferred to post-MVP. The above routes align with the CLAUDE.md routing definitions.

---

## 6. Backend API Design (Node.js + Express)

The backend is a single Express server organized into modular route groups. Each route group maps to a domain entity and enforces role-based access via middleware.

### Project Structure

```
arcova-backend/
├── src/
│   ├── index.ts                        # Express app entry point
│   ├── config/
│   │   ├── supabase.ts                 # Supabase client init (admin + user clients)
│   │   ├── env.ts                      # Env validation (Zod) — crashes on bad config
│   │   └── cache.ts                    # In-memory cache config (node-cache)
│   ├── middleware/
│   │   ├── auth.ts                     # JWT validation + role extraction → req.user
│   │   ├── rbac.ts                     # requireRole('host','admin') factory
│   │   ├── validate.ts                 # validate(zodSchema, 'body'|'query'|'params')
│   │   ├── rateLimiter.ts              # Per-endpoint rate limits
│   │   └── errorHandler.ts             # Global error handler
│   ├── routes/
│   │   ├── auth.routes.ts              # signup, login, me, profile update
│   │   ├── search.routes.ts            # hotel/flight search
│   │   ├── booking.routes.ts           # CRUD bookings
│   │   ├── property.routes.ts          # host property + room type mgmt
│   │   ├── pricing.routes.ts           # pricing rules engine
│   │   ├── availability.routes.ts      # availability calendar
│   │   ├── analytics.routes.ts         # metrics & reports
│   │   ├── chat.routes.ts              # AI assistant (SSE)
│   │   └── admin.routes.ts             # admin-only endpoints
│   ├── services/
│   │   ├── auth.service.ts             # Supabase auth + profile creation
│   │   ├── search.service.ts           # Aggregation + filtering + caching
│   │   ├── booking.service.ts          # Price calc, availability check, lifecycle
│   │   ├── property.service.ts         # Property + room type CRUD
│   │   ├── pricing.service.ts          # Rule engine, delegates to pricing-engine
│   │   ├── analytics.service.ts        # Metric aggregation, period comparisons
│   │   ├── chat.service.ts             # LLM orchestration, conversation memory
│   │   └── tripPlanner.service.ts      # Structured trip generation
│   ├── types/
│   │   └── index.ts                    # ALL TypeScript types — source of truth
│   ├── utils/
│   │   ├── errors.ts                   # AppError class + Errors factory
│   │   ├── pricing-engine.ts           # calculateEffectiveRate() — pure function
│   │   ├── helpers.ts                  # hashObject(), parseDateRange(), formatCurrency()
│   │   └── seed.ts                     # Database seeder script
│   └── data/
│       ├── mock-hotels.ts              # Realistic mock hotel data
│       ├── mock-flights.ts             # Realistic mock flight data
│       └── mock-destinations.ts        # 50+ destinations dataset
├── tests/
│   ├── services/                       # Unit tests — business logic
│   └── routes/                         # Integration tests — HTTP cycle
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── package.json
├── package-lock.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

> **Key differences from the original TravelX structure:**
> - Mock data lives under `src/data/` (not `services/mock/`)
> - `middleware/validate.ts` is included (Zod request validation factory)
> - `utils/helpers.ts` is included (shared utility functions)
> - `services/auth.service.ts` is included (Supabase auth wrapper)

### API Endpoints Summary

#### Authentication

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/signup` | Public | Register new user (traveller/host) |
| `POST` | `/api/auth/login` | Public | Login, returns JWT + profile |
| `GET` | `/api/auth/me` | Any | Get current user profile |
| `PUT` | `/api/auth/profile` | Any | Update profile |

#### Search (Traveller)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search/hotels?city=&checkIn=&checkOut=&guests=&minPrice=&maxPrice=&rating=&amenities=&sort=&page=&limit=` | Search hotels with filters, pagination, sorting |
| `GET` | `/api/search/flights?origin=&dest=&date=&return=&pax=&cabin=&stops=&sort=` | Search flights with filters |
| `GET` | `/api/search/hotels/:id` | Get hotel detail with rooms and availability |
| `GET` | `/api/search/trip?dest=&checkIn=&checkOut=&guests=` | Combined hotel+flight search |

#### Bookings

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/bookings` | Traveller | Create a booking |
| `GET` | `/api/bookings` | Traveller/Host | List bookings (filtered by role) |
| `GET` | `/api/bookings/:id` | Owner | Get booking detail |
| `PATCH` | `/api/bookings/:id/cancel` | Traveller | Cancel a booking |
| `GET` | `/api/bookings/summary?propertyId=&period=` | Host | Booking summary stats |

#### Properties (Host)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/properties` | List host's properties |
| `POST` | `/api/properties` | Create new property |
| `GET` | `/api/properties/:id` | Get property with rooms |
| `PUT` | `/api/properties/:id` | Update property details |
| `POST` | `/api/properties/:id/rooms` | Add room type |
| `PUT` | `/api/properties/:id/rooms/:roomId` | Update room type |
| `GET` | `/api/properties/:id/availability?start=&end=` | Get availability grid |
| `PUT` | `/api/properties/:id/availability` | Bulk update availability |

#### Pricing (Host)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/pricing/rules?roomTypeId=` | List pricing rules |
| `POST` | `/api/pricing/rules` | Create pricing rule |
| `PUT` | `/api/pricing/rules/:id` | Update pricing rule |
| `DELETE` | `/api/pricing/rules/:id` | Delete pricing rule |
| `POST` | `/api/pricing/preview` | Preview effective rates for date range |

#### AI Chat (Traveller)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat/new` | Start new conversation, returns sessionId |
| `POST` | `/api/chat/message` (SSE) | Send message, stream AI response via SSE |
| `GET` | `/api/chat/history/:sessionId` | Get conversation history |
| `GET` | `/api/chat/trip/:sessionId` | Get generated trip plan |
| `PUT` | `/api/chat/trip/:sessionId/budget` | Adjust trip budget |

#### Analytics (Host + Admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/dashboard?propertyId=&period=` | KPI cards data |
| `GET` | `/api/analytics/revenue?propertyId=&start=&end=&granularity=` | Revenue time series |
| `GET` | `/api/analytics/occupancy?propertyId=&start=&end=` | Occupancy time series |
| `GET` | `/api/analytics/channel-mix?propertyId=&period=` | Revenue by booking source |
| `GET` | `/api/analytics/platform` (admin only) | Platform-wide aggregate metrics |

#### Admin

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users?role=&search=&page=` | List all users with filters |
| `PATCH` | `/api/admin/users/:id/role` | Change user role |
| `PATCH` | `/api/admin/properties/:id/status` | Approve/reject property listing |
| `GET` | `/api/admin/reports/revenue?period=` | Platform revenue report |
| `GET` | `/api/admin/reports/bookings?period=` | Booking volume report |

---

## 7. Frontend Architecture (React)

### Project Structure

```
arcova-frontend/
├── src/
│   ├── App.tsx                              # Providers (QueryClient, Router). NO UI here.
│   ├── main.tsx                             # ReactDOM.createRoot. Nothing else.
│   ├── index.css                            # @tailwind directives + CSS variables + font imports
│   │
│   ├── lib/                                 # App-wide config. Imported everywhere.
│   │   ├── api.ts                           # Axios instance + auth interceptor + 401 handler
│   │   ├── supabase.ts                      # Supabase anon client (auth only, not data)
│   │   ├── utils.ts                         # cn(), formatCurrency(), formatDate(), formatPercent()
│   │   └── constants.ts                     # Nav items per role, status colors, sort options
│   │
│   ├── stores/                              # Zustand. CLIENT state only. Never server data.
│   │   ├── authStore.ts                     # user, token, role, setAuth(), logout()
│   │   └── uiStore.ts                       # sidebarOpen, theme (light/dark)
│   │
│   ├── types/
│   │   └── index.ts                         # Mirrors backend types. Manually synced.
│   │
│   ├── hooks/                               # TanStack Query hooks. One file per domain.
│   │   ├── useAuth.ts                       # login(), signup(), logout()
│   │   ├── useSearch.ts                     # useSearchHotels(), useSearchFlights(), useHotelDetail()
│   │   ├── useBookings.ts                   # useBookings(), useCreateBooking(), useCancelBooking()
│   │   ├── useProperties.ts                 # useProperties(), useProperty(), useCreateProperty()
│   │   ├── useAnalytics.ts                  # useDashboardMetrics(), useRevenue(), useOccupancy()
│   │   ├── usePricing.ts                    # usePricingRules(), useCreateRule(), usePricingPreview()
│   │   ├── useAvailability.ts               # useAvailability(), useBulkUpdate()
│   │   ├── useAdmin.ts                      # useUsers(), useUpdateRole(), usePlatformMetrics()
│   │   └── useChat.ts                       # SSE streaming: sendMessage(), messages, isStreaming, tripPlan
│   │
│   ├── components/
│   │   ├── ui/                              # shadcn/ui — NEVER edit directly
│   │   ├── shared/                          # Cross-role components (used by 2+ roles)
│   │   │   ├── Sidebar.tsx                  # Role-aware nav
│   │   │   ├── Header.tsx                   # Breadcrumbs, user menu, mobile toggle
│   │   │   ├── KPICard.tsx                  # Value, label, trend, sparkline
│   │   │   ├── DataTable.tsx                # Sortable/filterable/paginated table
│   │   │   ├── ChartWrapper.tsx             # Recharts container + loading/empty
│   │   │   ├── StatusBadge.tsx              # Status → color mapping
│   │   │   ├── EmptyState.tsx               # Icon + title + desc + CTA
│   │   │   ├── LoadingSkeleton.tsx          # table/cards/chart variants
│   │   │   ├── ConfirmDialog.tsx            # "Are you sure?" dialog
│   │   │   ├── ProtectedRoute.tsx           # Auth + role guard → <Outlet /> or redirect
│   │   │   ├── DateRangePicker.tsx          # Start/end date selection
│   │   │   └── PageHeader.tsx               # h1 + desc + action buttons
│   │   ├── landing/                         # Public landing page components
│   │   │   ├── Hero.tsx                     # Headline, subtext, CTA, hero image
│   │   │   ├── Features.tsx                 # Feature cards grid
│   │   │   ├── HowItWorks.tsx               # Step-by-step flow
│   │   │   ├── Testimonials.tsx             # Social proof
│   │   │   ├── Pricing.tsx                  # Plan comparison (if applicable)
│   │   │   ├── CTA.tsx                      # Bottom call-to-action section
│   │   │   ├── Navbar.tsx                   # Public nav: logo, links, Login/Signup
│   │   │   └── Footer.tsx                   # Links, social, copyright
│   │   ├── traveller/                        # Traveller-specific
│   │   │   ├── SearchBar.tsx
│   │   │   ├── HotelCard.tsx
│   │   │   ├── FlightCard.tsx
│   │   │   ├── BookingForm.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── TripPlanCard.tsx
│   │   │   ├── BudgetTracker.tsx
│   │   │   └── ItineraryTimeline.tsx
│   │   ├── host/                        # Host-specific
│   │   │   ├── PropertyManager.tsx
│   │   │   ├── RoomTypeEditor.tsx
│   │   │   ├── PricingRuleForm.tsx
│   │   │   ├── PricingPreview.tsx
│   │   │   ├── AvailabilityCalendar.tsx
│   │   │   └── BookingTable.tsx
│   │   └── admin/                           # Admin-specific
│   │       ├── UserManagement.tsx
│   │       ├── PropertyApproval.tsx
│   │       └── PlatformMetrics.tsx
│   │
│   ├── layouts/
│   │   ├── PublicLayout.tsx                 # Navbar + Footer for landing/public pages
│   │   ├── AuthLayout.tsx                   # Centered card on gradient background
│   │   ├── TravellerLayout.tsx               # Traveller sidebar + header + <Outlet />
│   │   ├── HostLayout.tsx               # Host sidebar + header + <Outlet />
│   │   └── AdminLayout.tsx                  # Admin sidebar + header + <Outlet />
│   │
│   └── pages/                               # Route-level components (thin, <100 lines)
│       ├── Landing.tsx                      # Public landing page
│       ├── auth/
│       │   ├── Login.tsx
│       │   └── Signup.tsx
│       ├── traveller/
│       │   ├── Dashboard.tsx
│       │   ├── Search.tsx
│       │   ├── HotelDetail.tsx
│       │   ├── Bookings.tsx
│       │   └── Assistant.tsx
│       ├── host/
│       │   ├── Dashboard.tsx
│       │   ├── Properties.tsx
│       │   ├── PropertyDetail.tsx
│       │   ├── Bookings.tsx
│       │   ├── Analytics.tsx
│       │   ├── Pricing.tsx
│       │   └── Availability.tsx
│       └── admin/
│           ├── Dashboard.tsx
│           ├── Users.tsx
│           ├── Properties.tsx
│           └── Bookings.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── Dockerfile
```

> **Key differences from the original TravelX frontend structure:**
> - `landing/` components folder added (Hero, Features, HowItWorks, Testimonials, Pricing, CTA, Navbar, Footer)
> - `PublicLayout.tsx` and `AuthLayout.tsx` added to layouts
> - `shared/` expanded with: StatusBadge, EmptyState, LoadingSkeleton, ConfirmDialog, ProtectedRoute, DateRangePicker, PageHeader
> - Pages organized into role-based subdirectories

### Role-Based Routing Pattern

```tsx
// App.tsx
function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
      </Route>

      {/* Traveller */}
      <Route element={<ProtectedRoute roles={['traveller']} />}>
        <Route element={<TravellerLayout />}>
          <Route path="/traveller" element={<Dashboard />} />
          <Route path="/traveller/search" element={<Search />} />
          <Route path="/traveller/hotel/:id" element={<HotelDetail />} />
          <Route path="/traveller/bookings" element={<Bookings />} />
          <Route path="/traveller/assistant" element={<Assistant />} />
        </Route>
      </Route>

      {/* Host */}
      <Route element={<ProtectedRoute roles={['host']} />}>
        <Route element={<HostLayout />}>
          <Route path="/host" element={<Dashboard />} />
          <Route path="/host/properties" element={<Properties />} />
          <Route path="/host/properties/:id" element={<PropertyDetail />} />
          <Route path="/host/bookings" element={<Bookings />} />
          <Route path="/host/analytics" element={<Analytics />} />
          <Route path="/host/pricing" element={<Pricing />} />
          <Route path="/host/availability" element={<Availability />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/properties" element={<Properties />} />
          <Route path="/admin/bookings" element={<Bookings />} />
        </Route>
      </Route>
    </Routes>
  );
}
```

---

## 8. Design System — "Deep & Luxe"

Arcova's visual identity draws from premium travel and luxury hospitality. The aesthetic of a first-class airline lounge meets a modern SaaS dashboard. Rich, warm, confident, with quiet sophistication.

### Design Principles

- **Warmth through depth** — deep navys and warm golds create a sense of richness
- **Editorial typography** — serif headings convey authority and premium positioning
- **Generous whitespace** — luxury breathes; never crowd the interface
- **Subtle contrast** — avoid harsh black-on-white; use warm neutrals
- **Restrained gold** — gold is an accent, not a primary. Overuse cheapens it.

### Color Palette

#### Primary — Navy

| Token | Hex | Usage |
|-------|-----|-------|
| Navy 950 | `#0A0F1E` | Darkest — headers, text in light mode |
| Navy 900 | `#0F172A` | Dark backgrounds, sidebar (dark mode) |
| Navy 800 | `#1E293B` | Sidebar dark mode |
| Navy 700 | `#334155` | Secondary text |
| Navy 600 | `#475569` | Muted text |
| Navy 100 | `#F1F5F9` | Light background tint |
| Navy 50 | `#F8FAFC` | Page background (light mode) |

#### Accent — Gold

| Token | Hex | Usage |
|-------|-----|-------|
| Gold 600 | `#B8923F` | Pressed state, darker accent |
| Gold 500 | `#D4A853` | Primary accent — CTAs, active states, highlights |
| Gold 400 | `#E2BC6A` | Hover state |
| Gold 300 | `#EDCF8C` | Subtle highlights, badge backgrounds |
| Gold 200 | `#F5E0B0` | Light accent backgrounds |
| Gold 100 | `#FBF3E0` | Very subtle tint |

#### Neutrals — Warm Slate (NOT pure gray)

| Token | Hex | Usage |
|-------|-----|-------|
| Warm 50 | `#FAFAF8` | Page background |
| Warm 100 | `#F5F5F0` | Card backgrounds (light mode) |
| Warm 200 | `#E8E8E0` | Borders, dividers |
| Warm 300 | `#D4D4CC` | Disabled states |
| Warm 500 | `#8A8A80` | Placeholder text |
| Warm 700 | `#4A4A44` | Secondary body text |
| Warm 900 | `#1A1A18` | Primary body text |

#### Semantic

| Color | Hex | Usage |
|-------|-----|-------|
| Success | `#059669` (emerald-600) | Confirmations, positive trends |
| Warning | `#D97706` (amber-600) | Pending, caution |
| Error | `#DC2626` (red-600) | Errors, cancellations, destructive |
| Info | `#2563EB` (blue-600) | Informational |

### Typography

| Context | Font | Classes |
|---------|------|---------|
| Landing headline | Playfair Display | `font-playfair text-5xl md:text-6xl font-bold tracking-tight` |
| Page titles (dashboard) | Playfair Display | `font-playfair text-2xl font-semibold tracking-tight` |
| Section headings | Playfair Display | `font-playfair text-lg font-semibold` |
| Card titles | Inter | `font-sans text-base font-semibold` |
| Body text | Inter | `font-sans text-sm` |
| Muted/secondary | Inter | `font-sans text-sm text-muted-foreground` |
| Labels | Inter | `font-sans text-sm font-medium` |
| Buttons | Inter | `font-sans text-sm font-medium tracking-wide` |

> **Rules:** Playfair for headings ONLY. Inter for everything else. `tracking-tight` on all Playfair headings. Never use Playfair below font-weight 400.

### Key UI Patterns

- **Primary button:** `bg-[#D4A853] hover:bg-[#E2BC6A] active:bg-[#B8923F] text-[#0A0F1E]` with subtle gold glow on hover
- **Sidebar:** Light mode: `bg-navy-950 text-warm-100` (dark sidebar on light page). Active item: `bg-gold-500/10 text-gold-500 border-l-2 border-gold-500`
- **Status badges:** Gold for `pending_review`, emerald for `confirmed`/`active`, red for `cancelled`, navy for `completed`
- **Charts:** Primary line `#D4A853` (gold), secondary `#0F172A` (navy), area fill gold at 10% opacity

### Landing Page Sections

1. **Navbar** — Fixed, backdrop blur, logo, nav links, Login / Get Started buttons
2. **Hero** — "Travel, Reimagined." (Playfair, large), subtext, dual CTA buttons
3. **Social proof bar** — "Trusted by X travelers" or partner logos
4. **Features grid** — 3-4 cards: AI Trip Planning, Smart Search, Host Analytics, Real-time Pricing
5. **How it works** — 3 steps: Search → Plan → Book
6. **Testimonials** — 2-3 quote cards
7. **CTA section** — Dark navy background, gold CTA, compelling headline
8. **Footer** — Links, social icons, copyright

---

## 9. Module 1: Travel Search & Booking

The search module is the traveller-facing core. It aggregates hotel and flight data from both the internal Supabase database (host-listed properties) and external APIs (Amadeus sandbox or mock data), applies filters and sorting, and returns paginated results.

### Search Flow

1. Traveller enters search criteria: destination, dates, guests, optional filters (price range, star rating, amenities).
2. Frontend sends `GET` request to `/api/search/hotels` with query parameters.
3. Backend checks in-memory cache (TTL: 15 min for hotels, 5 min for flights). Returns cached results if available.
4. If cache miss: queries Supabase for internal properties matching criteria, calls Amadeus/mock for external data, merges and deduplicates results.
5. Applies business logic: dynamic pricing (weekend/seasonal surcharges), availability filtering, sorting (price, rating, relevance).
6. Returns paginated response with `totalCount` and `hasNextPage` flag.
7. Traveller clicks a hotel to see detail page with room types, availability calendar, and booking form.
8. Traveller submits booking. Backend validates availability, calculates final price with any pricing rules, creates booking record, decrements availability.

### Key Data Types

```typescript
interface HotelSearchResult {
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

interface SearchResponse<T> {
  results: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  cacheHit: boolean;
}
```

### Traveller UI Components

| Component | Description |
|-----------|-------------|
| **SearchBar** | Destination autocomplete, date range picker, guest count, expandable advanced filters |
| **HotelCard** | Image carousel, name, stars, price/night, amenities badges, "Book Now" CTA |
| **FlightCard** | Airline logo, departure/arrival times, duration, stops, price, cabin class |
| **HotelDetail** | Full gallery, description, room type selector, availability calendar, booking form |
| **BookingConfirmation** | Summary card, price breakdown, cancellation policy, payment placeholder |

---

## 10. Module 2: AI Travel Assistant

The AI module provides a conversational trip planning experience powered by Claude. It gathers user preferences through natural dialogue, generates structured trip plans with day-by-day itineraries and budget breakdowns, and allows iterative refinement.

### Conversation Flow

1. Traveller opens the AI Assistant page. Frontend calls `POST /api/chat/new` to get a `sessionId`.
2. Traveller sends a message (e.g., "I want a beach vacation for 7 days under $3000").
3. Frontend sends `POST /api/chat/message` with SSE response streaming. Tokens appear in real-time.
4. Backend maintains `ConversationContext` tracking gathered preferences: destination, dates, budget, travel style, group size.
5. Once sufficient info is gathered, the LLM calls a `generate_trip_plan` tool. Backend parses the structured JSON output.
6. Frontend renders the `TripPlanCard` with itinerary timeline, budget donut chart, and destination info.
7. Traveller can refine: "Make it cheaper", "Swap this activity", "Add a day". Backend regenerates affected portions.

### SSE Streaming Protocol

```
// Server-Sent Events format
data: {"type":"token","content":"Great choice!"}
data: {"type":"token","content":" Japan is incredible."}
data: {"type":"tool_call","name":"generate_trip_plan","status":"started"}
data: {"type":"trip_plan","data":{...structured plan JSON...}}
data: {"type":"done"}
```

Frontend `useChat` hook processes each event type:
- `"token"` → append to current assistant message
- `"tool_call"` → show loading indicator
- `"trip_plan"` → render TripPlanCard component
- `"done"` → finalize message, enable input

### Trip Plan Schema

The LLM generates a structured JSON object with destination info, per-day itinerary (activities, meals, accommodation), total budget breakdown (flights, hotel, food, activities, transport), packing tips, and travel tips. This structured output enables the rich UI rendering of the TripPlanCard, ItineraryTimeline, and BudgetTracker components.

### AI UI Components

| Component | Description |
|-----------|-------------|
| **ChatPanel** | Full-height chat interface with message bubbles, auto-scroll, streaming indicator |
| **ChatInput** | Text input with contextual quick-reply suggestion chips |
| **TripPlanCard** | Hero header with destination name, dates, budget. Tabs: Overview, Itinerary, Budget, Tips |
| **ItineraryTimeline** | Vertical timeline of activities, color-coded by type, with time, cost, description |
| **BudgetTracker** | Donut chart showing category breakdown, bar showing budget used vs. remaining |

---

## 11. Module 3: Host Portal

The host portal enables hotel partners to manage their entire property lifecycle: listing properties, configuring room types and pricing, managing availability, viewing bookings, and analyzing performance through rich analytics dashboards.

### Host Dashboard KPIs

| Metric | Calculation | Trend |
|--------|------------|-------|
| Total Revenue | `SUM(bookings.total_price_cents)` for period | Δ% vs previous period |
| Net Revenue | `SUM(net_revenue_cents)` after commission | Δ% vs previous period |
| Bookings | `COUNT(bookings)` for period | Δ% vs previous period |
| Occupancy Rate | `booked_rooms / total_rooms * 100` | Δ percentage points |
| ADR (Avg Daily Rate) | `total_revenue / room_nights_sold` | Δ% vs previous period |
| RevPAR | `revenue / available_room_nights` | Δ% vs previous period |

### Pricing Engine

The pricing engine supports multiple rule types that stack with priority ordering. Hosts can preview the effective rates before activating rules.

| Rule Type | Logic | Example |
|-----------|-------|---------|
| `WEEKEND` | +% on Fri/Sat nights | +20% on weekends |
| `SEASONAL` | +% or +$ during date range | +30% Dec 20 – Jan 5 |
| `LAST_MINUTE` | -% when booking < N days out | -15% if < 3 days |
| `OCCUPANCY` | +% when occupancy > threshold | +10% if occupancy > 80% |

Rules are evaluated in priority order (lower number = applied first). Each rule's adjustment is applied to the running price. The preview endpoint shows what rates would be for a date range with current rules applied, including which rules contributed to each day's effective rate.

### Host UI Components

| Component | Description |
|-----------|-------------|
| **KPIGrid** | 6 metric cards with value, sparkline, and period-over-period change indicators |
| **RevenueChart** | Dual-line chart (gross vs net), shaded commission area, tooltip on hover |
| **OccupancyChart** | Area chart with color bands (green >80%, yellow 50-80%, red <50%) |
| **ChannelPieChart** | Donut showing booking sources: Arcova, Hotels.com, Vrbo, Direct |
| **BookingTable** | Sortable, filterable table with status/source badges, pagination, CSV export |
| **PricingRuleForm** | Modal for creating/editing rules with type-specific condition fields |
| **PricingPreview** | 30-day calendar grid showing base → effective rate per day, color-coded, hover for rule breakdown |
| **AvailabilityCalendar** | Grid: rows=room types, cols=dates. Click to edit, drag for bulk edit. Color: green/yellow/red/gray |

---

## 12. Module 4: Admin Dashboard

The admin dashboard provides platform-wide oversight and management. Admins can monitor aggregate metrics, manage users and their roles, approve or reject property listings, and generate platform-wide reports.

### Admin Capabilities

| Capability | Description |
|-----------|-------------|
| **Platform Metrics** | Total users, total properties, total bookings, platform revenue (commission), active listings, conversion rate |
| **User Management** | Searchable user table with role badges. Promote traveller → host, host → admin. Deactivate accounts |
| **Property Moderation** | Queue of pending properties. Review details, approve to make searchable, reject with reason |
| **Booking Oversight** | Platform-wide booking table. Filter by property, host, status, date. Investigate disputes |
| **Revenue Reports** | Platform commission revenue over time, broken down by property and host |
| **System Health** | API response times, error rates, cache hit rates (future: integrate with monitoring) |

---

## 13. Day 1 Implementation Plan (8 Hours)

### Goal

Backend fully functional with all API endpoints, database seeded, auth working. Frontend scaffolded with routing and layouts rendering.

| Hour | Task | Deliverable |
|------|------|-------------|
| 0–1 | Project setup: init both repos, install deps, configure Supabase project, create all tables + RLS policies, configure env vars | Both repos compile. Supabase dashboard shows tables. |
| 1–2 | Auth + middleware: Supabase Auth signup/login, JWT validation middleware, RBAC middleware, profile auto-creation trigger | Can signup, login, and hit protected endpoints with role checks. |
| 2–4 | Search + Booking APIs: hotel/flight search with mock data provider, filters, sorting, pagination, caching. Booking CRUD with availability checks. | All search and booking endpoints working via Postman/curl. |
| 4–6 | Host APIs: property CRUD, room types, pricing rules engine, availability calendar, analytics aggregation queries | Host can manage properties and see analytics via API. |
| 6–7 | AI Chat API: Claude integration, SSE streaming endpoint, conversation memory, trip plan generation with structured output | Can chat with AI and receive streamed trip plans via curl. |
| 7–8 | Database seeder: generate 3 sample properties, 90 days of bookings/metrics, pricing rules, availability. Admin endpoints. | Database populated with realistic data. All endpoints functional. |

---

## 14. Day 2 Implementation Plan (8 Hours)

### Goal

Complete React frontend for all three roles. Polished UI with working data flow. Docker deployment ready.

| Hour | Task | Deliverable |
|------|------|-------------|
| 0–1 | Frontend scaffold: Vite + React + TypeScript + Tailwind + shadcn/ui. App shell, layouts for all 3 roles, React Router setup, auth context, API client with interceptors. | App renders with sidebar nav, login/signup works, redirects by role. |
| 1–3 | Traveller UI: Search page (SearchBar, HotelCard grid, FlightCard list), Hotel detail page, booking flow, My Bookings page with status badges. | Traveller can search, view hotels, and see bookings. |
| 3–4 | AI Assistant UI: ChatPanel with SSE streaming, ChatInput with suggestion chips, TripPlanCard rendering, BudgetTracker donut chart, ItineraryTimeline. | Traveller can chat with AI, see streaming responses and trip plans. |
| 4–6 | Host UI: Dashboard with KPIGrid + charts (Recharts), Properties list + detail, BookingTable with filters/sort, PricingRuleForm + PricingPreview calendar, AvailabilityCalendar grid. | Host dashboard fully functional with live data. |
| 6–7 | Admin UI: Platform metrics cards, UserManagement table with role editing, PropertyApproval queue, platform-wide booking/revenue views. | Admin can manage users, approve properties, view reports. |
| 7–8 | Polish + Deploy: Docker compose for both repos, responsive design pass, error states, loading skeletons, README with screenshots, final testing. | `docker-compose up` starts full stack. README complete. |

---

## 15. Environment & Deployment

### Environment Variables

**Backend (`.env`)**

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...         # Service role key (server only)
SUPABASE_ANON_KEY=eyJ...            # Anon key (for client auth)
ANTHROPIC_API_KEY=sk-ant-...        # Claude API key (optional — degrades gracefully)
AMADEUS_CLIENT_ID=...               # Optional: Amadeus sandbox
AMADEUS_CLIENT_SECRET=...
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**Frontend (`.env`)**

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=http://localhost:3001/api
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./arcova-backend
    ports:
      - "3001:3001"
    env_file:
      - ./arcova-backend/.env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      retries: 3

  frontend:
    build: ./arcova-frontend
    ports:
      - "5173:80"
    environment:
      - VITE_API_BASE_URL=http://backend:3001/api
    depends_on:
      - backend
```

---

## 16. Success Criteria

| Area | Criterion | Target |
|------|-----------|--------|
| Auth | Signup, login, role-based redirect | All 3 roles can login and see correct dashboard |
| Search | Hotel + flight search with filters | Returns paginated results, sorts work, cache hits on repeat |
| Booking | Create, view, cancel bookings | Full lifecycle works, availability decrements |
| AI Chat | Conversational trip planning | Streamed responses, generates structured trip plan |
| Host | Property + pricing management | CRUD works, pricing preview shows correct rates |
| Host | Analytics dashboard | 6 KPIs + 3 charts render with real data |
| Host | Availability calendar | Grid renders, click-to-edit works |
| Admin | User management | Can list users, change roles |
| Admin | Property moderation | Can approve/reject pending properties |
| Tech | Docker deployment | `docker-compose up` starts full stack |
| Tech | Error handling | No unhandled errors, consistent error response format |
| Design | Visual quality | Matches "Deep & Luxe" design system — navy/gold palette, Playfair headings, Inter body, premium feel |
| UX | Responsive | Works at 375px, 768px, 1280px breakpoints |

---

## 17. Future Roadmap

### Phase 2 (Week 2)

- Payment integration (Stripe) with real checkout flow
- OAuth login (Google, GitHub) via Supabase Auth
- Real-time booking notifications via Supabase Realtime (WebSocket)
- Review system: travellers rate stays, hosts respond
- Image upload for properties via Supabase Storage
- Email notifications (booking confirmation, cancellation)

### Phase 3 (Month 2)

- AI-powered pricing suggestions based on demand signals and competitor rates
- Multi-destination trip planning in AI assistant
- Collaborative trip planning (share with friends via link)
- Rate parity monitoring for hosts
- Elasticsearch for full-text hotel search
- A/B testing framework for search ranking algorithms
- Mobile-responsive PWA with offline support

### Phase 4 (Month 3+)

- Channel manager API integrations (connect to Booking.com, etc.)
- Kafka/event streaming for real-time price and availability updates
- Redis for distributed caching (horizontal scaling)
- Multi-language and multi-currency support
- Machine learning for personalized search ranking
- Host revenue management AI copilot

---

> **Arcova PRD v1.0** — Prepared February 2026
