# CLAUDE.md — Arcova

> Read this ENTIRE file before writing a single line of code. This is the single source of truth for how this project is built. Every decision, pattern, convention, and approach is defined here with the reasoning behind it. When in doubt, this file wins.

---

## 1. PROJECT ARCHITECTURE

### 1.1 Repo Strategy
Two separate git repos. Not a monorepo.

```
arcova/
├── arcova-backend/    # Node.js Express API
└── arcova-frontend/   # React Vite SPA
```

They share NOTHING at the filesystem level. Type contracts are duplicated — backend types are source of truth, frontend mirrors them. No shared packages, no workspace.

**Why separate repos instead of a monorepo?** Simpler CI/CD, no Turborepo/Nx overhead, independent deploys, clearer boundaries. For a small team, monorepo tooling is unnecessary.

### 1.2 What is Arcova?
A unified travel platform serving three user roles through one frontend and one backend:
- **Traveller** — searches hotels/flights, books travel, uses AI-powered trip planner
- **Host** — manages hotel properties, pricing rules, availability, views analytics dashboard
- **Admin** — oversees platform, manages users, moderates property listings, views platform metrics

Plus a **public landing page** showcasing features, pricing, and CTAs.

### 1.3 Backend Directory Tree

```
arcova-backend/
├── src/
│   ├── index.ts                        # Express app init, middleware stack, route mounting, listen.
│   │                                   # If it grows past 80 lines, something is wrong.
│   │
│   ├── config/                         # Initialized ONCE at startup. Imported everywhere.
│   │   ├── env.ts                      # Zod schema validates all env vars. Crashes on bad config.
│   │   │                               # WHY: Fail fast at boot, not 10 minutes later on a request.
│   │   ├── supabase.ts                 # Two clients: supabaseAdmin (bypasses RLS) + createUserClient(token)
│   │   │                               # WHY two: Admin for backend ops. User client for RLS-aware queries if needed.
│   │   └── cache.ts                    # node-cache instances. searchCache (15min TTL), flightCache (5min TTL)
│   │                                   # WHY in-memory: Redis is overkill for single-instance MVP.
│   │
│   ├── middleware/                      # Each file exports ONE middleware function or factory.
│   │   ├── auth.ts                     # JWT verification → attaches req.user = { id, email, role }
│   │   │                               # WHY Supabase verify: They handle JWT rotation, revocation, refresh.
│   │   ├── rbac.ts                     # requireRole('host','admin') — factory returns middleware
│   │   │                               # WHY factory: Composable. One function, multiple role configs.
│   │   ├── validate.ts                 # validate(zodSchema, 'body'|'query'|'params') — factory
│   │   │                               # WHY Zod: Same language as TypeScript types. One mental model.
│   │   ├── rateLimiter.ts              # Global (100/min) + chat-specific (10/min)
│   │   │                               # WHY separate chat limit: Claude API calls are expensive.
│   │   └── errorHandler.ts             # Global error handler. Formats all errors consistently.
│   │                                   # WHY global: One place to format. Routes never format errors.
│   │
│   ├── routes/                         # One file per domain. HTTP endpoint definitions.
│   │   ├── auth.routes.ts              # signup, login, me, profile update
│   │   ├── search.routes.ts            # hotel search, hotel detail, flight search
│   │   ├── booking.routes.ts           # CRUD + cancel + summary stats
│   │   ├── property.routes.ts          # Property CRUD + room type CRUD
│   │   ├── pricing.routes.ts           # Rule CRUD + preview engine
│   │   ├── availability.routes.ts      # Read + bulk update
│   │   ├── analytics.routes.ts         # Dashboard KPIs, revenue, occupancy, channel mix
│   │   ├── chat.routes.ts              # SSE streaming, conversations, trip plan generation
│   │   └── admin.routes.ts             # User management, property moderation, platform stats
│   │                                   # WHY one file per domain: grep "booking" → one file. Easy to find.
│   │
│   ├── services/                       # Business logic. One file per domain.
│   │   ├── auth.service.ts             # Supabase auth + profile creation
│   │   ├── search.service.ts           # Query properties, apply filters, caching
│   │   ├── booking.service.ts          # Price calculation, availability check, booking lifecycle
│   │   ├── property.service.ts         # Property + room type management
│   │   ├── pricing.service.ts          # Rule CRUD, delegates to pricing engine
│   │   ├── analytics.service.ts        # Aggregation queries, period comparisons
│   │   ├── chat.service.ts             # Claude API orchestration, conversation memory
│   │   └── tripPlanner.service.ts      # System prompt, trip plan JSON parsing
│   │                                   # WHY separate from routes: Services can be called from
│   │                                   # routes, cron jobs, seed scripts, tests. Routes can't.
│   │
│   ├── types/
│   │   └── index.ts                    # ALL TypeScript types in one file. Source of truth.
│   │                                   # WHY one file: At this scale, splitting creates import juggling.
│   │                                   # Split when this exceeds 500 lines.
│   │
│   ├── utils/
│   │   ├── errors.ts                   # AppError class + Errors factory (notFound, forbidden, etc.)
│   │   ├── pricing-engine.ts           # calculateEffectiveRate() — pure function, no side effects
│   │   │                               # WHY pure: Testable without mocks. Input → output.
│   │   ├── helpers.ts                  # hashObject(), parseDateRange(), formatCurrency()
│   │   └── seed.ts                     # Database seeder. `npm run seed`
│   │
│   └── data/                           # Static datasets and mock generators
│       ├── mock-hotels.ts              # Realistic hotel search results
│       ├── mock-flights.ts             # Realistic flight data
│       └── mock-destinations.ts        # 50+ destinations for AI context
│                                       # WHY mocks: No API key needed for dev. Swap to real API later.
│
├── tests/
│   ├── services/                       # Unit tests — business logic in isolation
│   └── routes/                         # Integration tests — full HTTP cycle (supertest)
│
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── package.json
├── package-lock.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

**Rules:**
- Route files stay under 300 lines. Extract to service if growing.
- Service files stay under 400 lines. Split by sub-domain if growing.
- No folders for single files. `services/search.service.ts`, not `services/search/search.service.ts`.

### 1.4 Frontend Directory Tree

```
arcova-frontend/src/
├── App.tsx                              # Providers (QueryClient, Router). NO UI here.
├── main.tsx                             # ReactDOM.createRoot. Nothing else.
├── index.css                            # @tailwind directives + CSS custom properties + font imports
│
├── lib/                                 # App-wide config. Imported everywhere.
│   ├── api.ts                           # Axios instance + auth interceptor + 401 handler
│   │                                    # WHY Axios: Interceptors for auto-attaching tokens. fetch() can't.
│   ├── supabase.ts                      # Supabase anon client. Used ONLY for auth, not data.
│   ├── utils.ts                         # cn(), formatCurrency(), formatDate(), formatPercent()
│   │                                    # WHY cn(): Tailwind classes conflict. twMerge resolves them.
│   └── constants.ts                     # Nav items per role, status colors, sort options
│
├── stores/                              # Zustand. CLIENT state only. Never server data.
│   ├── authStore.ts                     # user, token, role, setAuth(), logout()
│   │                                    # WHY Zustand: 1kb, no providers, selector subscriptions.
│   │                                    # WHY NOT Context: Re-renders all consumers on any change.
│   └── uiStore.ts                       # sidebarOpen, theme (light/dark)
│                                        # WHY separate: UI state shouldn't reset on logout.
│
├── types/
│   └── index.ts                         # Mirrors backend types. Manually synced.
│
├── hooks/                               # TanStack Query hooks. One file per domain.
│   ├── useAuth.ts                       # login(), signup(), logout()
│   ├── useSearch.ts                     # useSearchHotels(), useSearchFlights(), useHotelDetail()
│   ├── useBookings.ts                   # useBookings(), useCreateBooking(), useCancelBooking()
│   ├── useProperties.ts                # useProperties(), useProperty(), useCreateProperty()
│   ├── useAnalytics.ts                 # useDashboardMetrics(), useRevenue(), useOccupancy()
│   ├── usePricing.ts                   # usePricingRules(), useCreateRule(), usePricingPreview()
│   ├── useAvailability.ts               # useAvailability(), useBulkUpdate()
│   ├── useAdmin.ts                      # useUsers(), useUpdateRole(), usePlatformMetrics()
│   └── useChat.ts                       # SSE streaming: sendMessage(), messages, isStreaming, tripPlan
│
├── components/
│   ├── ui/                              # shadcn/ui — NEVER edit directly. Wrap if needed.
│   ├── shared/                          # Cross-role components (used by 2+ roles)
│   │   ├── Sidebar.tsx                  # Role-aware nav
│   │   ├── Header.tsx                   # Breadcrumbs, user menu, mobile toggle
│   │   ├── KPICard.tsx                  # Value, label, trend, sparkline
│   │   ├── DataTable.tsx                # Sortable/filterable/paginated table
│   │   ├── ChartWrapper.tsx             # Recharts container + loading/empty
│   │   ├── StatusBadge.tsx              # Status → color mapping
│   │   ├── EmptyState.tsx               # Icon + title + desc + CTA
│   │   ├── LoadingSkeleton.tsx          # table/cards/chart variants
│   │   ├── ConfirmDialog.tsx            # Confirmation modal
│   │   ├── ProtectedRoute.tsx           # Auth + role guard
│   │   ├── DateRangePicker.tsx
│   │   └── PageHeader.tsx               # h1 + desc + actions
│   ├── landing/                         # Landing page components
│   │   ├── Hero.tsx                     # Headline, subtext, CTA, hero image/illustration
│   │   ├── Features.tsx                 # Feature cards grid
│   │   ├── HowItWorks.tsx              # Step-by-step flow
│   │   ├── Testimonials.tsx             # Social proof
│   │   ├── Pricing.tsx                  # Plan comparison (if applicable)
│   │   ├── CTA.tsx                      # Bottom call-to-action section
│   │   ├── Navbar.tsx                   # Public nav: logo, links, Login/Signup buttons
│   │   └── Footer.tsx                   # Links, social, copyright
│   ├── traveller/                       # Traveller-only
│   ├── host/                            # Host-only
│   └── admin/                           # Admin-only
│
├── layouts/
│   ├── PublicLayout.tsx                 # Navbar + Footer for landing/public pages
│   ├── AuthLayout.tsx                   # Centered card for login/signup
│   ├── TravellerLayout.tsx              # Traveller sidebar + header + <Outlet />
│   ├── HostLayout.tsx                   # Host sidebar + header + <Outlet />
│   └── AdminLayout.tsx                  # Admin sidebar + header + <Outlet />
│
└── pages/
    ├── Landing.tsx                      # Public landing page
    ├── auth/
    │   ├── Login.tsx
    │   └── Signup.tsx
    ├── traveller/
    │   ├── Dashboard.tsx
    │   ├── Search.tsx
    │   ├── HotelDetail.tsx
    │   ├── Bookings.tsx
    │   └── Assistant.tsx
    ├── host/
    │   ├── Dashboard.tsx
    │   ├── Properties.tsx
    │   ├── PropertyDetail.tsx
    │   ├── Bookings.tsx
    │   ├── Analytics.tsx
    │   ├── Pricing.tsx
    │   └── Availability.tsx
    └── admin/
        ├── Dashboard.tsx
        ├── Users.tsx
        ├── Properties.tsx
        └── Bookings.tsx
```

### 1.5 Shared Types Between Frontend and Backend
No shared package. Types duplicated manually. Backend `types/index.ts` is source of truth. When backend type changes, update frontend copy. Avoids monorepo tooling.

### 1.6 Environment Configuration

**Backend — Zod validated at startup:**
```typescript
const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});
export const env = envSchema.parse(process.env);
```

**Frontend — Vite env vars:**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=http://localhost:3001/api
```

**Rules:**
- `.env` gitignored. `.env.example` committed with comments.
- Backend: ONLY access via `env` object. Never `process.env.X`.
- Frontend: ONLY access `import.meta.env` inside `lib/` files.

### 1.7 Dependency Injection / Service Pattern
No DI framework. Simple module imports. Services are stateless functions that import `supabaseAdmin` from config. Testing: mock at module level with `vi.mock()`.

---

## 2. TECH STACK & DEPENDENCIES

### 2.1 Backend Dependencies
| Package | Purpose | Why This Over Alternatives |
|---------|---------|---------------------------|
| **express** | HTTP framework | Massive ecosystem, most middleware available. Fastify is faster but our bottleneck is DB queries (10-50ms), not framework overhead (<1ms). |
| **typescript** | Type safety | Non-negotiable. Catches bugs at compile time. |
| **@supabase/supabase-js** | Database + Auth | One SDK replaces: pg driver, ORM, auth library, JWT library, file storage. |
| **@anthropic-ai/sdk** | AI chat | Claude API for trip planner. Official SDK handles streaming, retries, types. |
| **zod** | Validation | Runtime type checking that mirrors TypeScript. One mental model for compile + runtime. |
| **express-rate-limit** | Rate limiting | Simple per-route config. No Redis needed. |
| **node-cache** | Caching | Zero-config TTL cache. Redis when we scale horizontally. |
| **pino + pino-pretty** | Logging | Fastest Node.js logger. Structured JSON. Pretty output in dev. |
| **uuid** | IDs | Session IDs, temp IDs where Supabase `gen_random_uuid()` doesn't apply. |
| **cors, helmet, morgan, dotenv** | Standard Express middleware | Security, CORS, request logging, env loading. |

### 2.2 Frontend Dependencies
| Package | Purpose | Why This Over Alternatives |
|---------|---------|---------------------------|
| **react + react-dom** | UI framework | Industry standard, largest ecosystem. |
| **vite** | Build tool | Sub-second HMR, 10x faster than webpack, zero config. |
| **tailwindcss** | Styling | Utility-first, co-located with markup, purged in production. |
| **shadcn/ui** | Components | Copies source code (not runtime dep). Full control. Accessible. Tailwind-native. |
| **@tanstack/react-query** | Server state | Auto-caching, refetching, stale-while-revalidate. Replaces 80% of Redux for API data. |
| **zustand** | Client state | 1kb, no providers, selector subscriptions. For auth + UI only. |
| **react-router-dom** | Routing | Nested layouts, outlet pattern, protected routes. |
| **react-hook-form + zod** | Forms | Uncontrolled (performant), same Zod schemas as backend. |
| **recharts** | Charts | React-native, composable, lighter than D3 for standard charts. |
| **axios** | HTTP | Interceptors for auth tokens. fetch() can't do this cleanly. |
| **lucide-react** | Icons | Clean, tree-shakable, 1000+ icons, matches shadcn aesthetic. |
| **date-fns** | Dates | Modular, immutable, 50kb lighter than moment.js. |
| **clsx + tailwind-merge** | Class utils | Conditional classes + Tailwind conflict resolution. |

**RULE: Do NOT install new packages without explicit approval. 9/10 times, what we have is sufficient.**

### 2.3 Package Manager
**npm** with `package-lock.json` committed. Universally available, no extra install.

### 2.4 TypeScript Configuration

**Backend:**
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "NodeNext", "moduleResolution": "NodeNext",
    "outDir": "./dist", "rootDir": "./src",
    "strict": true, "esModuleInterop": true, "resolveJsonModule": true,
    "declaration": true, "sourceMap": true, "skipLibCheck": true
  }
}
```
- `"type": "module"` in package.json — all ESM, imports use `.js` extension
- No path aliases — relative imports only

**Frontend:**
- `@/` alias maps to `./src/`
- `jsx: "react-jsx"` — no `import React` needed
- Strict mode enabled

### 2.5 Build Tooling
- Backend: `tsx` (dev watch), `tsc` (production build) → `dist/`
- Frontend: `vite` (dev HMR), `vite build` (production) → `dist/`

---

## 3. BACKEND PATTERNS

### 3.1 Express Initialization — Exact Order

```typescript
const app = express();
app.use(helmet());                       // 1. Security headers FIRST
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));  // 2. CORS before routes
app.use(express.json());                 // 3. Body parsing before routes
app.use(morgan('dev'));                  // 4. Request logging
app.use(rateLimiter);                    // 5. Rate limit — reject early

app.get('/health', ...);                 // 6. Health check (no auth)

app.use('/api/auth', authRoutes);        // 7. All routes
app.use('/api/search', searchRoutes);
// ...

app.use(errorHandler);                   // 8. Error handler LAST
app.listen(Number(env.PORT));
```

### 3.2 Middleware Order Per Endpoint
Always: **auth → rbac → validation → handler**
```typescript
router.post('/', authMiddleware, requireRole('traveller'), validate(schema), handler);
```

### 3.3 Layering: Route → Service → Database

| Layer | Does | Does NOT |
|-------|------|----------|
| **Route** | Parse request, call service, send response | Touch database, contain business logic |
| **Service** | Business logic, DB queries, external APIs | Format HTTP responses, know about req/res |
| **Utils** | Pure functions, formatting | Have side effects |

**NEVER put a DB call in a route. NEVER put response logic in a service.**

### 3.4 How To Add a New Route

1. Define types in `types/index.ts`
2. Write service function in `services/{domain}.service.ts`
3. Add Zod schema in route file (co-located)
4. Write route handler in `routes/{domain}.routes.ts`
5. Mount in `index.ts` if new route file
6. Test

### 3.5 Request Validation — Zod
Schemas live in route files (co-located, not separate folder). The `validate()` middleware parses, cleans, and replaces `req[source]` with validated data.

### 3.6 Error Handling

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(public statusCode: number, public message: string, public code?: string) {
    super(message); this.name = 'AppError';
  }
}

export const Errors = {
  notFound: (resource: string) => new AppError(404, `${resource} not found`, 'NOT_FOUND'),
  unauthorized: () => new AppError(401, 'Authentication required', 'UNAUTHORIZED'),
  forbidden: () => new AppError(403, 'Insufficient permissions', 'FORBIDDEN'),
  badRequest: (msg: string) => new AppError(400, msg, 'BAD_REQUEST'),
  conflict: (msg: string) => new AppError(409, msg, 'CONFLICT'),
  internal: (msg: string) => new AppError(500, msg, 'INTERNAL_ERROR'),
};
```

**Services throw. Routes catch and `next(err)`. Global handler formats.**

**Response shape — ALWAYS:**
```json
{ "error": "Human message", "code": "MACHINE_CODE", "details": [] }
```

### 3.7 Authentication Flow
```
Request → auth.ts extracts Bearer token
        → supabaseAdmin.auth.getUser(token) verifies JWT
        → Fetches profile for role
        → req.user = { id, email, role }
        → next()
```

### 3.8 Authorization
`requireRole('host', 'admin')` — middleware factory. Data-level auth (own data only) happens in services via `.eq('supplier_id', userId)`.

### 3.9 Database Query Patterns
Supabase JS query builder. Not raw SQL, not an ORM.

```typescript
// SELECT with joins
const { data, count, error } = await supabaseAdmin
  .from('bookings')
  .select('*, properties(name)', { count: 'exact' })
  .eq('traveller_id', userId)
  .order('booked_at', { ascending: false })
  .range(page * limit, (page + 1) * limit - 1);

// INSERT — always .select().single()
const { data, error } = await supabaseAdmin
  .from('bookings').insert({ ...input }).select().single();

// UPDATE — always scope + return
const { data, error } = await supabaseAdmin
  .from('properties').update({ name }).eq('id', id).eq('host_id', userId).select().single();
```

**ALWAYS check `error` after every call. Supabase doesn't throw — it returns `{ data, error }`.**

### 3.10 Response Format — Pagination
Every list endpoint returns:
```typescript
{ results: T[], totalCount: number, page: number, pageSize: number, hasNextPage: boolean }
```
Params: `?page=0&limit=20` (0-indexed, max 50).

### 3.11 Caching
Hotel search: 15min. Flights: 5min. Key: MD5 of query params. In-memory (node-cache).

### 3.12 Logging
pino for structured JSON. Log: requests, errors, cache hits, external API calls. Never log: request bodies, tokens, passwords.

---

## 4. DATABASE & MIGRATIONS

### 4.1 Database
Supabase PostgreSQL 15. Connected via JS client (REST API), not direct pg connection.

### 4.2 Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| Tables | snake_case, plural | `properties`, `room_types` |
| Columns | snake_case | `created_at`, `host_id` |
| PKs | `id UUID DEFAULT gen_random_uuid()` | Always `id`, always UUID |
| FKs | `{singular}_id` | `property_id` |
| Timestamps | TIMESTAMPTZ | `created_at`, `updated_at` |
| Booleans | `is_` prefix | `is_active`, `is_closed` |
| Money | Integer cents, `_cents` suffix | `base_price_cents` |
| Status | TEXT + CHECK | Not ENUM (easier to extend) |
| JSON | JSONB + DEFAULT | `amenities JSONB DEFAULT '[]'` |

**Why integer cents?** `0.1 + 0.2 = 0.30000000000000004`. `10 + 20 = 30`. Convert at API boundary only.

### 4.3 Migrations
MVP: Single SQL file in Supabase SQL Editor. Post-MVP: Supabase CLI migrations.

### 4.4 Seed Data
`npm run seed` creates: 5 users (1 admin, 2 hosts, 2 travellers), 6 properties, room types, pricing rules, 90 days of bookings + metrics, 30 days of availability. Deterministic.

### 4.5 Triggers
- `handle_new_user()` — auto-creates profile on auth signup
- `calc_net_revenue()` — auto-calculates net after commission

### 4.6 Row Level Security
Enabled on all tables. Backend uses `supabaseAdmin` (bypasses RLS). RLS is safety net for direct client access.

---

## 5. FRONTEND ARCHITECTURE

### 5.1 Framework
React 18 + Vite + TypeScript. SPA, not SSR. No Next.js (dashboard app, no SEO needed, every page needs auth).

### 5.2 Routing
```tsx
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
```

### 5.3 State Management — The Cardinal Rule
**Server data → TanStack Query. Client data → Zustand. No exceptions.**

| What | Where | Why |
|------|-------|-----|
| API responses | TanStack Query | Caching, refetch, stale-while-revalidate |
| Auth token, user, role | Zustand (persisted) | Session data, survives refresh |
| UI state (sidebar, theme) | Zustand (persisted) | Not server data |
| Form data | react-hook-form | Local per-form |
| Modal open/close | useState | Local per-component |

### 5.4 How To Add a New Page
1. Create `pages/{role}/{Page}.tsx` — default export
2. Add `<Route>` in `App.tsx` inside correct layout
3. Add nav item in `lib/constants.ts`
4. Create/reuse hook in `hooks/`
5. Compose components, handle loading/error/empty

### 5.5 How To Add a New Component
1. Decide folder: `shared/`, `traveller/`, `host/`, `admin/`, or `landing/`
2. One file: `{Name}.tsx` (PascalCase)
3. Props interface at top: `interface {Name}Props`
4. Named export: `export function Name({ ... }: Props) {}`
5. Tailwind only. Use shadcn primitives.

### 5.6 Layout System
```tsx
export function HostLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar role="host" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### 5.7 Data Fetching — TanStack Query
```typescript
// hooks/useBookings.ts
export function useBookings(params?) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => api.get('/bookings', { params }).then(r => r.data),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post('/bookings', input).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
```

---

## 6. FRONTEND COMPONENT PATTERNS

### 6.1 Structure
One component per file. No co-located tests/styles. Tailwind inline.

### 6.2 Props
```tsx
interface PropertyCardProps {
  property: Property;
  onEdit?: (id: string) => void;
}
export function PropertyCard({ property, onEdit }: PropertyCardProps) { ... }
```
Never `React.FC`. Destructure in signature. Defaults in destructuring.

### 6.3 Forms — react-hook-form + Zod
```tsx
const schema = z.object({ name: z.string().min(1, 'Required') });
type FormData = z.infer<typeof schema>;
const form = useForm<FormData>({ resolver: zodResolver(schema) });
```

### 6.4 Modals — Local state, shadcn Dialog
```tsx
const [open, setOpen] = useState(false);
<Dialog open={open} onOpenChange={setOpen}>...</Dialog>
```

### 6.5 Tables — DataTable + URL params for sort/filter
### 6.6 Loading — Skeleton loaders, never spinners
### 6.7 Errors — Inline with retry button
### 6.8 Empty — EmptyState component: icon + title + desc + optional CTA
### 6.9 Toasts — shadcn `useToast()`: `toast({ title, description, variant })`

---

## 7. DESIGN SYSTEM — "Deep & Luxe"

### 7.1 Design Philosophy
Arcova's visual identity draws from premium travel and luxury hospitality. Think: the aesthetic of a first-class airline lounge meets a modern SaaS dashboard. Rich, warm, confident, with quiet sophistication. The design should feel like it costs $200/night to look at.

**Principles:**
- **Warmth through depth** — deep navys and warm golds create a sense of richness
- **Editorial typography** — serif headings convey authority and premium positioning
- **Generous whitespace** — luxury breathes; never crowd the interface
- **Subtle contrast** — avoid harsh black-on-white; use warm neutrals
- **Restrained gold** — gold is an accent, not a primary. Overuse cheapens it.

### 7.2 Color Palette

**Primary — Navy:**
```
Navy 950:  #0A0F1E    (darkest — headers, text in light mode)
Navy 900:  #0F172A    (dark backgrounds)
Navy 800:  #1E293B    (sidebar in dark mode)
Navy 700:  #334155    (secondary text)
Navy 600:  #475569    (muted text)
Navy 100:  #F1F5F9    (light background tint)
Navy 50:   #F8FAFC    (page background — light mode)
```

**Accent — Gold:**
```
Gold 500:  #D4A853    (primary accent — CTAs, active states, highlights)
Gold 400:  #E2BC6A    (hover state)
Gold 300:  #EDCF8C    (subtle highlights, badge backgrounds)
Gold 200:  #F5E0B0    (light accent backgrounds)
Gold 100:  #FBF3E0    (very subtle tint)
Gold 600:  #B8923F    (pressed state, darker accent)
```

**Neutrals — Warm Slate (NOT pure gray):**
```
Warm 50:   #FAFAF8    (page background)
Warm 100:  #F5F5F0    (card backgrounds, light mode)
Warm 200:  #E8E8E0    (borders, dividers)
Warm 300:  #D4D4CC    (disabled states)
Warm 500:  #8A8A80    (placeholder text)
Warm 700:  #4A4A44    (secondary body text)
Warm 900:  #1A1A18    (primary body text)
```

**Semantic:**
```
Success:   #059669    (emerald-600 — confirmations, positive trends)
Warning:   #D97706    (amber-600 — pending, caution)
Error:     #DC2626    (red-600 — errors, cancellations, destructive)
Info:      #2563EB    (blue-600 — informational)
```

**Usage rules:**
- **Gold is for PRIMARY actions only:** main CTAs, active nav items, selected states, important badges
- **Navy is structural:** page backgrounds, sidebar, headers, body text
- **Warm neutrals replace all grays:** never use Tailwind's `gray-*`. Always `slate-*` or custom warm values
- **Never gold on gold.** Gold text on gold background = invisible. Gold on navy or white only.

### 7.3 CSS Variables for Tailwind + shadcn

Define in `index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

@layer base {
  :root {
    /* Light mode */
    --background: 40 20% 98%;          /* Warm 50 */
    --foreground: 40 6% 10%;           /* Warm 900 */
    --card: 40 20% 97%;                /* Warm 100 */
    --card-foreground: 40 6% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 40 6% 10%;
    --primary: 40 52% 58%;             /* Gold 500 */
    --primary-foreground: 222 47% 9%;  /* Navy 950 */
    --secondary: 220 14% 96%;          /* Navy 100 */
    --secondary-foreground: 222 47% 9%;
    --muted: 40 12% 90%;               /* Warm 200 */
    --muted-foreground: 40 6% 35%;     /* Warm 700 */
    --accent: 40 52% 58%;              /* Gold 500 */
    --accent-foreground: 222 47% 9%;
    --destructive: 0 72% 51%;          /* Red 600 */
    --destructive-foreground: 0 0% 100%;
    --border: 40 12% 88%;              /* Warm 200 */
    --input: 40 12% 88%;
    --ring: 40 52% 58%;                /* Gold 500 */
    --radius: 0.5rem;

    /* Chart colors */
    --chart-1: 40 52% 58%;             /* Gold */
    --chart-2: 222 47% 20%;            /* Navy */
    --chart-3: 160 84% 39%;            /* Emerald */
    --chart-4: 213 94% 68%;            /* Blue */
    --chart-5: 40 52% 70%;             /* Light Gold */
  }

  .dark {
    --background: 222 47% 6%;          /* Navy 950 */
    --foreground: 40 20% 96%;          /* Warm 100 */
    --card: 222 33% 10%;               /* Navy 900 */
    --card-foreground: 40 20% 96%;
    --primary: 40 52% 58%;             /* Gold stays gold */
    --primary-foreground: 222 47% 6%;
    --secondary: 217 19% 22%;          /* Navy 800 */
    --secondary-foreground: 40 20% 96%;
    --muted: 217 19% 22%;
    --muted-foreground: 40 12% 60%;
    --accent: 40 52% 58%;
    --border: 217 19% 22%;
    --input: 217 19% 22%;
    --ring: 40 52% 58%;
  }

  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
}
```

### 7.4 Typography

**Font stack:**
- **Display / Headings:** `'Playfair Display', Georgia, serif` — editorial, premium feel
- **Body / UI:** `'Inter', system-ui, sans-serif` — clean, readable, modern

**Usage:**
```
Landing page headline:   font-playfair text-5xl md:text-6xl font-bold tracking-tight
Page titles (dashboard):  font-playfair text-2xl font-semibold tracking-tight
Section headings:         font-playfair text-lg font-semibold
Card titles:              font-sans text-base font-semibold
Body text:                font-sans text-sm (14px)
Muted/secondary:          font-sans text-sm text-muted-foreground
Labels:                   font-sans text-sm font-medium
Small text:               font-sans text-xs
Buttons:                  font-sans text-sm font-medium tracking-wide
```

**Tailwind config addition:**
```javascript
// tailwind.config.js
fontFamily: {
  playfair: ['Playfair Display', 'Georgia', 'serif'],
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
}
```

**Rules:**
- Playfair for headings ONLY — never for body text, buttons, labels, or form inputs
- Inter for everything else
- `tracking-tight` on all Playfair headings (tight tracking makes serif look modern)
- Never use font weights below 400 for Playfair (it gets too thin)

### 7.5 Component Library
shadcn/ui with customized theme. Components in `ui/` folder. **Never edit directly.** Wrap for customization.

### 7.6 Dark Mode
Light mode primary. Dark mode supported. Toggle in `uiStore`. Applied via `class` on `<html>`. CSS variables handle the switch.

### 7.7 Responsive Breakpoints
- Default: mobile (<768px)
- `md:` ≥768px (tablet)
- `lg:` ≥1024px (desktop, sidebar visible)
- `xl:` ≥1280px (wide, more columns)

### 7.8 Spacing
```
Page padding:       p-6 md:p-8
Card padding:       p-5 or p-6
Between sections:   space-y-8
Between cards:      gap-5 or gap-6
Form fields:        space-y-4
Inline gaps:        gap-2 or gap-3
KPI grid:           grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5
```

**Slightly more generous than typical SaaS — luxury breathes.**

### 7.9 Animations
- Hover on cards: `transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`
- Hover on buttons: `transition-colors duration-150`
- Gold accent glow on primary buttons: `shadow-[0_0_15px_rgba(212,168,83,0.15)]` on hover
- Skeleton: `animate-pulse`
- Page transitions: none in MVP (add Framer Motion later if needed)

### 7.10 Icons
lucide-react. Sizes: `h-4 w-4` inline, `h-5 w-5` buttons/nav, `h-8 w-8` empty states.

### 7.11 Component Patterns

**Landing page Navbar:**
```tsx
<nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-warm-200">
  <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
    <span className="font-playfair text-xl font-bold text-navy-950">Arcova</span>
    <div className="flex items-center gap-4">
      <Link to="/auth/login" className="text-sm font-medium text-navy-700 hover:text-navy-950">Log in</Link>
      <Link to="/auth/signup"><Button>Get Started</Button></Link>
    </div>
  </div>
</nav>
```

**Landing page Hero:**
```tsx
<section className="pt-32 pb-20 px-6">
  <div className="max-w-4xl mx-auto text-center space-y-6">
    <h1 className="font-playfair text-5xl md:text-6xl font-bold tracking-tight text-navy-950">
      Travel, Reimagined.
    </h1>
    <p className="text-lg text-warm-700 max-w-2xl mx-auto">
      Your AI-powered travel companion for seamless booking
      and intelligent itinerary planning.
    </p>
    <div className="flex gap-4 justify-center">
      <Button size="lg" className="bg-gold-500 hover:bg-gold-400 text-navy-950 font-medium px-8">
        Start Planning
      </Button>
      <Button size="lg" variant="outline">View Demo</Button>
    </div>
  </div>
</section>
```

**Primary button style:**
```css
/* Gold button — primary CTA */
bg-[#D4A853] hover:bg-[#E2BC6A] active:bg-[#B8923F] text-[#0A0F1E] font-medium
shadow-sm hover:shadow-[0_0_20px_rgba(212,168,83,0.2)]
```

**Dashboard page title:**
```tsx
<h1 className="font-playfair text-2xl font-semibold tracking-tight text-navy-950">
  Dashboard
</h1>
```

**KPI Card:**
```tsx
<Card className="bg-white border border-warm-200 shadow-sm">
  <CardContent className="p-5">
    <p className="text-sm font-medium text-warm-500">{label}</p>
    <p className="text-2xl font-bold text-navy-950 mt-1">{value}</p>
    <p className={cn("text-sm mt-1", trend > 0 ? "text-emerald-600" : "text-red-600")}>
      {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last period
    </p>
  </CardContent>
</Card>
```

**Sidebar:**
```
Light mode:   bg-navy-950 text-warm-100     (dark sidebar on light page — contrast)
Dark mode:    bg-navy-900 text-warm-100     (slightly lighter than page bg)
Active item:  bg-gold-500/10 text-gold-500 border-l-2 border-gold-500
Hover item:   bg-white/5
```

**Status badges:**
```typescript
const statusColors = {
  confirmed:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:      'bg-red-50 text-red-700 border-red-200',
  completed:      'bg-navy-50 text-navy-700 border-navy-200',
  no_show:        'bg-warm-100 text-warm-600 border-warm-200',
  active:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive:       'bg-warm-100 text-warm-600 border-warm-200',
  pending_review: 'bg-gold-100 text-gold-600 border-gold-300',
};
```

**Charts:**
```
Primary line:     #D4A853 (gold)
Secondary line:   #0F172A (navy)
Area fill:        gold with 10% opacity
Grid lines:       #E8E8E0 (warm-200)
Tooltip bg:       #0F172A (navy-900) with white text
```

### 7.12 Landing Page Sections

The landing page should include these sections in order:
1. **Navbar** — logo, nav links, Login / Get Started buttons
2. **Hero** — headline (Playfair, large), subtext, dual CTA buttons, optional hero image or illustration
3. **Social proof bar** — "Trusted by X travelers" or partner logos
4. **Features grid** — 3-4 feature cards: AI Trip Planning, Smart Search, Host Analytics, Real-time Pricing
5. **How it works** — 3 steps with icons: Search → Plan → Book
6. **Testimonials** — 2-3 quote cards
7. **CTA section** — dark navy background, gold CTA button, compelling headline
8. **Footer** — links, social icons, copyright

**Design notes for landing:**
- Full-width sections, `max-w-7xl` content container
- Alternating white/navy-50 section backgrounds for visual rhythm
- Hero background: subtle warm gradient or abstract travel imagery
- Gold accent used sparingly: primary CTA, feature icons, underlines on key words

---

## 8. API INTEGRATION PATTERNS

### 8.1 HTTP Client
```typescript
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
// Auto-attach token, auto-handle 401
```
ONE instance. Never raw fetch() (except SSE).

### 8.2 SSE Streaming — AI Chat
```typescript
const res = await fetch(`${API_URL}/chat/message`, { method: 'POST', headers, body });
const reader = res.body.getReader();
// Parse "data: {...}\n\n" lines, dispatch by type: token, trip_plan, error, done
```

### 8.3 Cache Invalidation
After mutations, `queryClient.invalidateQueries({ queryKey: ['resource'] })`.

---

## 9. CODING CONVENTIONS

### 9.1 Naming
| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase.tsx | `PropertyCard.tsx` |
| Pages | PascalCase.tsx | `Dashboard.tsx` |
| Hooks | camelCase.ts | `useBookings.ts` |
| Routes | kebab.routes.ts | `booking.routes.ts` |
| Services | kebab.service.ts | `booking.service.ts` |
| Variables | camelCase | `totalRevenue` |
| Constants | SCREAMING_SNAKE | `MAX_PAGE_SIZE` |
| DB columns | snake_case | `total_price_cents` |
| API paths | kebab-case | `/api/pricing/rules` |

### 9.2 Import Order
1. Node built-ins
2. External packages (alphabetical)
3. Internal modules (config → middleware → services → utils)
4. Type-only imports (always `import type`)

### 9.3 Exports
- Components: named export
- Pages: default export
- Hooks: named export
- Services: named exports
- Routes: default router
- Stores: named export

### 9.4 Comments
- Never explain WHAT. Explain WHY (when non-obvious).
- TODO format: `// TODO: description`
- No commented-out code.

### 9.5 TypeScript
- Strict mode. No `// @ts-ignore`. No `any`.
- `interface` for objects, `type` for unions/utilities.
- `import type` for type-only imports.
- Explicit return types on services. Components infer.

### 9.6 Async
- Always async/await. Never .then chains.
- Routes: try/catch + next(err).
- Services: throw errors.

### 9.7 Null Handling
- `user?.profile?.name` — optional chaining
- `name ?? 'Anonymous'` — nullish coalescing
- Never `||` when 0 or '' are valid values

---

## 10. TESTING

### 10.1 Framework
vitest + supertest.

### 10.2 Location
```
tests/services/   # Unit tests
tests/routes/     # Integration tests
```

### 10.3 Mocking
Always mock: external APIs. Mock in unit tests: Supabase. Don't mock: pure functions.

### 10.4 Frontend Testing
Not in MVP. Code structured for testability.

---

## 11. DEVOPS & TOOLING

### 11.1 Docker
Multi-stage builds. `docker-compose.yml` at parent directory.

### 11.2 Linting
ESLint + Prettier. `{ semi: true, singleQuote: true, trailingComma: 'all', printWidth: 100 }`. 2-space indent.

### 11.3 Git
Branches: `feature/`, `fix/`, `chore/`. Commits: `feat: lowercase description`.

### 11.4 Scripts
Backend: `dev`, `build`, `start`, `seed`, `test`, `lint`, `typecheck`
Frontend: `dev`, `build`, `preview`, `lint`, `typecheck`

---

## 12. DESIGN DECISIONS & TRADEOFFS

| Decision | Trade | Why |
|----------|-------|-----|
| Supabase vs self-hosted | Vendor lock-in for DX | One SDK replaces 5 packages. Standard Postgres if we migrate. |
| Express vs Fastify | Performance for ecosystem | Bottleneck is DB, not framework. Express has 10x more middleware. |
| TanStack Query vs Redux | Control for less boilerplate | Auto-caching, refetching for free. Perfect for API-driven apps. |
| SPA vs SSR | SEO for simplicity | Every page needs auth. Nothing to crawl. No hydration bugs. |
| Mocks vs real APIs | Realism for speed | Full UI immediately. Single function swap to real API later. |
| In-memory vs Redis | Shared state for simplicity | Single instance MVP. Redis when we scale horizontally. |
| Combined app vs split | Separate optimization for portfolio impact | Shows role-based architecture. Architecture allows splitting later. |

---

## 13. COMMON MISTAKES

1. **DB query in route.** Route → Service → Database.
2. **Using `any`.** Use `unknown` and narrow.
3. **Not checking Supabase `error`.** Silent failures.
4. **Missing `next(err)`.** Request hangs forever.
5. **Installing packages** without checking existing stack.
6. **Editing `ui/` files.** Wrap them.
7. **`useEffect` for fetching.** Use TanStack Query.
8. **Server data in Zustand.** Server → TanStack, Client → Zustand.
9. **Hardcoded colors.** Use CSS variables and Tailwind tokens.
10. **`||` for defaults.** Use `??`.
11. **Calling api directly in components.** Go through hooks.
12. **Forgetting `.select()` on insert/update.** No data returned.
13. **Not scoping host queries.** Always `.eq('host_id', userId)`.
14. **Playfair on body text.** Playfair is headings ONLY. Inter for everything else.
15. **Overusing gold.** Gold is accent only. Primary CTAs and highlights. Not backgrounds or body text.

---

## 14. DEFINITION OF DONE

- [ ] Types defined in both `types/index.ts`
- [ ] Service with AppError handling
- [ ] Route with auth + rbac + validation middleware
- [ ] Frontend hook (TanStack Query)
- [ ] Component with loading, error, empty states
- [ ] Responsive at 375px, 768px, 1280px
- [ ] Matches Deep & Luxe design system (navy/gold palette, Playfair headings, Inter body)
- [ ] `npm run typecheck` passes (both repos)
- [ ] `npm run lint` passes (both repos)
- [ ] Consistent with every pattern in this file
