/**
 * In-memory mock Supabase client.
 * Activated automatically when SUPABASE_SERVICE_KEY === 'placeholder'.
 * Supports all query patterns used across the Arcova service layer.
 */

import { v4 as uuidv4 } from 'uuid';

// ─── Type helpers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Store = Record<string, Row[]>;

interface QueryResult {
  data: Row | Row[] | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

// ─── Fixed IDs ───────────────────────────────────────────────────────────────

const U1 = '00000000-0000-0000-0000-000000000001'; // admin
const U2 = '00000000-0000-0000-0000-000000000002'; // host1
const U3 = '00000000-0000-0000-0000-000000000003'; // host2
const U4 = '00000000-0000-0000-0000-000000000004'; // traveller1
const U5 = '00000000-0000-0000-0000-000000000005'; // traveller2

const P1 = '10000000-0000-0000-0000-000000000001'; // Grand Paris Hotel
const P2 = '10000000-0000-0000-0000-000000000002'; // Bali Sunset Villa
const P3 = '10000000-0000-0000-0000-000000000003'; // NYC Boutique Hotel
const P4 = '10000000-0000-0000-0000-000000000004'; // London Central Hotel
const P5 = '10000000-0000-0000-0000-000000000005'; // Tokyo Garden Hotel
const P6 = '10000000-0000-0000-0000-000000000006'; // Dubai Luxury Resort

const RT1  = '20000000-0000-0000-0000-000000000001';
const RT2  = '20000000-0000-0000-0000-000000000002';
const RT3  = '20000000-0000-0000-0000-000000000003';
const RT4  = '20000000-0000-0000-0000-000000000004';
const RT5  = '20000000-0000-0000-0000-000000000005';
const RT6  = '20000000-0000-0000-0000-000000000006';
const RT7  = '20000000-0000-0000-0000-000000000007';
const RT8  = '20000000-0000-0000-0000-000000000008';
const RT9  = '20000000-0000-0000-0000-000000000009';
const RT10 = '20000000-0000-0000-0000-000000000010';
const RT11 = '20000000-0000-0000-0000-000000000011';
const RT12 = '20000000-0000-0000-0000-000000000012';

// ─── In-memory store ─────────────────────────────────────────────────────────

const STORE: Store = {
  profiles: [],
  properties: [],
  room_types: [],
  bookings: [],
  availability: [],
  pricing_rules: [],
  reviews: [],
  payments: [],
  conversations: [],
  itineraries: [],
  itinerary_items: [],
  search_history: [],
};

// Auth users (separate from profiles table)
const AUTH_USERS = new Map<string, {
  id: string;
  email: string;
  password: string;
  user_metadata: Row;
}>();

// ─── Relationship map ─────────────────────────────────────────────────────────
// Defines how to resolve PostgREST-style join patterns like "properties(name, city)"
// isArray=true: one-to-many (joined table's FK points back to parent)
// isArray=false: many-to-one (parent row has FK pointing to joined table)

interface RelDef { fk: string; isArray: boolean }

const RELATIONS: Record<string, Record<string, RelDef>> = {
  bookings: {
    properties: { fk: 'property_id', isArray: false },
    room_types:  { fk: 'room_type_id', isArray: false },
  },
  properties: {
    room_types: { fk: 'property_id', isArray: true },
  },
  reviews: {
    properties: { fk: 'property_id', isArray: false },
  },
  itineraries: {
    itinerary_items: { fk: 'itinerary_id', isArray: true },
  },
};

// ─── Mock data initializer ────────────────────────────────────────────────────

function offsetDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().split('T')[0];
}

function initMockData(): void {
  const now = new Date().toISOString();

  // ── Auth users ──
  for (const [id, email, pwd] of [
    [U1, 'admin@arcova.dev',      'Arcova2024!'],
    [U2, 'host1@arcova.dev',      'Arcova2024!'],
    [U3, 'host2@arcova.dev',      'Arcova2024!'],
    [U4, 'traveller1@arcova.dev', 'Arcova2024!'],
    [U5, 'traveller2@arcova.dev', 'Arcova2024!'],
  ] as [string, string, string][]) {
    AUTH_USERS.set(id, { id, email, password: pwd, user_metadata: {} });
  }

  // ── Profiles ──
  STORE.profiles = [
    { id: U1, email: 'admin@arcova.dev',      role: 'admin',     full_name: 'Arcova Admin',  phone: null, avatar_url: null, company_name: null,                company_verified: false, preferences: {}, created_at: now, updated_at: now },
    { id: U2, email: 'host1@arcova.dev',      role: 'host',      full_name: 'Henri Dubois',  phone: null, avatar_url: null, company_name: 'Prestige Properties', company_verified: true,  preferences: {}, created_at: now, updated_at: now },
    { id: U3, email: 'host2@arcova.dev',      role: 'host',      full_name: 'Priya Sharma',  phone: null, avatar_url: null, company_name: 'Global Stays',        company_verified: true,  preferences: {}, created_at: now, updated_at: now },
    { id: U4, email: 'traveller1@arcova.dev', role: 'traveller', full_name: 'Alice Johnson', phone: null, avatar_url: null, company_name: null,                company_verified: false, preferences: {}, created_at: now, updated_at: now },
    { id: U5, email: 'traveller2@arcova.dev', role: 'traveller', full_name: 'Bob Williams',  phone: null, avatar_url: null, company_name: null,                company_verified: false, preferences: {}, created_at: now, updated_at: now },
  ];

  // ── Properties ──
  STORE.properties = [
    { id: P1, host_id: U2, name: 'Grand Paris Hotel',    description: 'Elegant 5-star hotel in the heart of Paris',      city: 'Paris',    country: 'France',    address: '10 Rue de la Paix, Paris',     latitude: 48.8698, longitude:  2.3302, star_rating: 5, property_type: 'hotel',  amenities: ['wifi','pool','spa','restaurant','gym','concierge'], images: [], total_rooms:  80, status: 'active', created_at: now, updated_at: now },
    { id: P2, host_id: U2, name: 'Bali Sunset Villa',    description: 'Stunning private villa with ocean views',          city: 'Bali',     country: 'Indonesia', address: 'Jl. Sunset Road, Seminyak',    latitude: -8.6905, longitude: 115.1627, star_rating: 4, property_type: 'villa',  amenities: ['wifi','pool','kitchen','breakfast'],               images: [], total_rooms:  12, status: 'active', created_at: now, updated_at: now },
    { id: P3, host_id: U3, name: 'NYC Boutique Hotel',   description: 'Chic boutique hotel in Midtown Manhattan',         city: 'New York', country: 'USA',       address: '200 W 46th St, New York',      latitude: 40.7589, longitude: -73.9851, star_rating: 4, property_type: 'hotel',  amenities: ['wifi','gym','restaurant','bar'],                   images: [], total_rooms:  60, status: 'active', created_at: now, updated_at: now },
    { id: P4, host_id: U3, name: 'London Central Hotel', description: 'Classic British hotel near Big Ben',               city: 'London',   country: 'UK',        address: 'Westminster Bridge Rd, London',latitude: 51.5007, longitude: -0.1246,  star_rating: 4, property_type: 'hotel',  amenities: ['wifi','restaurant','bar','gym'],                   images: [], total_rooms:  55, status: 'active', created_at: now, updated_at: now },
    { id: P5, host_id: U2, name: 'Tokyo Garden Hotel',   description: 'Tranquil hotel with traditional Japanese garden',  city: 'Tokyo',    country: 'Japan',     address: '1-2-3 Shinjuku, Tokyo',        latitude: 35.6897, longitude: 139.6922, star_rating: 3, property_type: 'hotel',  amenities: ['wifi','garden','onsen'],                           images: [], total_rooms:  40, status: 'active', created_at: now, updated_at: now },
    { id: P6, host_id: U3, name: 'Dubai Luxury Resort',  description: 'Ultra-luxury beachfront resort on Palm Jumeirah', city: 'Dubai',    country: 'UAE',       address: 'Palm Jumeirah, Dubai',         latitude: 25.1124, longitude:  55.1390, star_rating: 5, property_type: 'resort', amenities: ['wifi','pool','spa','restaurant','beach','gym','concierge'], images: [], total_rooms: 120, status: 'active', created_at: now, updated_at: now },
  ];

  // ── Room types ──
  STORE.room_types = [
    { id: RT1,  property_id: P1, name: 'Classic Room',    description: 'Elegant room with city views',           max_guests: 2, bed_type: 'queen', base_price_cents:  22000, currency: 'USD', total_inventory: 40, amenities: ['wifi','minibar'],                        status: 'active', created_at: now, updated_at: now },
    { id: RT2,  property_id: P1, name: 'Prestige Suite',  description: 'Spacious suite with Eiffel Tower view',  max_guests: 4, bed_type: 'king',  base_price_cents:  55000, currency: 'USD', total_inventory: 10, amenities: ['wifi','minibar','jacuzzi','lounge'],     status: 'active', created_at: now, updated_at: now },
    { id: RT3,  property_id: P2, name: 'Garden Villa',    description: 'Private villa with tropical garden',     max_guests: 2, bed_type: 'king',  base_price_cents:  18000, currency: 'USD', total_inventory:  8, amenities: ['wifi','private_pool','kitchen'],         status: 'active', created_at: now, updated_at: now },
    { id: RT4,  property_id: P2, name: 'Ocean View Villa',description: 'Villa with stunning ocean panorama',     max_guests: 4, bed_type: 'king',  base_price_cents:  28000, currency: 'USD', total_inventory:  4, amenities: ['wifi','private_pool','kitchen','terrace'],status: 'active', created_at: now, updated_at: now },
    { id: RT5,  property_id: P3, name: 'Standard Room',   description: 'Modern room in the heart of Manhattan', max_guests: 2, bed_type: 'queen', base_price_cents:  25000, currency: 'USD', total_inventory: 40, amenities: ['wifi','minibar'],                        status: 'active', created_at: now, updated_at: now },
    { id: RT6,  property_id: P3, name: 'Deluxe Room',     description: 'Spacious room with NYC skyline view',   max_guests: 3, bed_type: 'king',  base_price_cents:  35000, currency: 'USD', total_inventory: 20, amenities: ['wifi','minibar','lounge_access'],         status: 'active', created_at: now, updated_at: now },
    { id: RT7,  property_id: P4, name: 'Classic Room',    description: 'British classic with Westminster views', max_guests: 2, bed_type: 'double',base_price_cents:  19000, currency: 'USD', total_inventory: 35, amenities: ['wifi','tea_kettle'],                     status: 'active', created_at: now, updated_at: now },
    { id: RT8,  property_id: P4, name: 'Executive Room',  description: 'Executive room with lounge access',     max_guests: 2, bed_type: 'king',  base_price_cents:  29000, currency: 'USD', total_inventory: 20, amenities: ['wifi','lounge_access','minibar'],         status: 'active', created_at: now, updated_at: now },
    { id: RT9,  property_id: P5, name: 'Standard Room',   description: 'Minimalist Japanese-style room',        max_guests: 2, bed_type: 'twin',  base_price_cents:  14000, currency: 'USD', total_inventory: 30, amenities: ['wifi','yukata'],                         status: 'active', created_at: now, updated_at: now },
    { id: RT10, property_id: P5, name: 'Superior Room',   description: 'Garden-facing room with tatami area',   max_guests: 3, bed_type: 'queen', base_price_cents:  19000, currency: 'USD', total_inventory: 10, amenities: ['wifi','yukata','garden_view'],            status: 'active', created_at: now, updated_at: now },
    { id: RT11, property_id: P6, name: 'Deluxe Room',     description: 'Luxury room with Palm Jumeirah view',   max_guests: 2, bed_type: 'king',  base_price_cents:  45000, currency: 'USD', total_inventory: 80, amenities: ['wifi','minibar','beach_access'],          status: 'active', created_at: now, updated_at: now },
    { id: RT12, property_id: P6, name: 'Penthouse Suite', description: 'Ultimate luxury with private terrace',  max_guests: 6, bed_type: 'king',  base_price_cents: 150000, currency: 'USD', total_inventory:  5, amenities: ['wifi','private_pool','butler'],           status: 'active', created_at: now, updated_at: now },
  ];

  // ── Pricing rules ──
  const pr = (id: string, rtId: string, name: string, type: string, adjType: string, adjVal: number, extras: Row = {}): Row => ({
    id, room_type_id: rtId, name, rule_type: type, adjustment_type: adjType, adjustment_value: adjVal,
    priority: 1, is_active: true, days_of_week: null, date_from: null, date_to: null,
    days_before_checkin: null, occupancy_threshold: null, created_at: now, updated_at: now,
    ...extras,
  });

  STORE.pricing_rules = [
    pr('30000000-0000-0000-0000-000000000001', RT1,  'Paris Weekend Premium',    'weekend',    'percentage',  20, { days_of_week: [6, 7] }),
    pr('30000000-0000-0000-0000-000000000002', RT2,  'Paris Suite Weekend',      'weekend',    'percentage',  15, { days_of_week: [6, 7] }),
    pr('30000000-0000-0000-0000-000000000003', RT3,  'Bali High Season',         'seasonal',   'percentage',  30, { date_from: offsetDate(30), date_to: offsetDate(120) }),
    pr('30000000-0000-0000-0000-000000000004', RT5,  'NYC Last Minute Discount', 'last_minute','percentage', -10, { days_before_checkin: 3 }),
    pr('30000000-0000-0000-0000-000000000005', RT7,  'London Weekend Premium',   'weekend',    'percentage',  25, { days_of_week: [6, 7] }),
    pr('30000000-0000-0000-0000-000000000006', RT11, 'Dubai Peak Season',        'seasonal',   'percentage',  40, { date_from: offsetDate(60), date_to: offsetDate(150) }),
    pr('30000000-0000-0000-0000-000000000007', RT12, 'Dubai High Occupancy',     'occupancy',  'percentage',  20, { occupancy_threshold: 80 }),
  ];

  // ── Availability (next 30 days for a sample of room types) ──
  const sampleRTs = [RT1, RT3, RT5, RT7, RT9, RT11];
  const avRows: Row[] = [];
  for (let ri = 0; ri < sampleRTs.length; ri++) {
    const rtId = sampleRTs[ri];
    const rt = STORE.room_types.find((r) => r.id === rtId) as Row;
    const inventory = (rt?.total_inventory as number) ?? 10;
    for (let i = 0; i < 30; i++) {
      const dateStr = offsetDate(i);
      const dow = new Date(dateStr).getDay();
      const isWeekend = dow === 0 || dow === 6;
      avRows.push({
        id: `40000000-${String(ri).padStart(4,'0')}-0000-0000-${String(i).padStart(12,'0')}`,
        room_type_id: rtId,
        date: dateStr,
        available_rooms: isWeekend ? Math.max(1, Math.floor(inventory * 0.5)) : inventory,
        is_closed: false,
        effective_rate_cents: null,
        created_at: now,
        updated_at: now,
      });
    }
  }
  STORE.availability = avRows;

  // ── Bookings ──
  const bk = (id: string, tId: string, pId: string, rtId: string, ci: string, co: string, status: string, price: number): Row => ({
    id, traveller_id: tId, property_id: pId, room_type_id: rtId,
    check_in: ci, check_out: co, num_guests: 2, num_rooms: 1,
    total_price_cents: price, commission_rate: 15,
    net_revenue_cents: Math.round(price * 0.85),
    status, booking_source: 'platform', special_requests: null,
    payment_id: null, payment_status: null,
    booked_at: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
    cancellation_reason: null,
    created_at: now, updated_at: now,
  });

  STORE.bookings = [
    bk('50000000-0000-0000-0000-000000000001', U4, P1, RT1, offsetDate(-60), offsetDate(-57), 'completed',  66000),
    bk('50000000-0000-0000-0000-000000000002', U4, P3, RT5, offsetDate(-30), offsetDate(-27), 'completed',  75000),
    bk('50000000-0000-0000-0000-000000000003', U5, P2, RT3, offsetDate(-20), offsetDate(-15), 'completed',  90000),
    bk('50000000-0000-0000-0000-000000000004', U4, P6, RT11, offsetDate(10), offsetDate(14),  'confirmed', 180000),
    bk('50000000-0000-0000-0000-000000000005', U5, P4, RT7,  offsetDate(20), offsetDate(23),  'confirmed',  57000),
    bk('50000000-0000-0000-0000-000000000006', U4, P2, RT4,  offsetDate(-90),offsetDate(-84), 'cancelled', 168000),
  ];

  // ── Reviews ──
  STORE.reviews = [
    { id: '60000000-0000-0000-0000-000000000001', booking_id: '50000000-0000-0000-0000-000000000001', traveller_id: U4, property_id: P1, rating: 5, comment: 'Absolutely stunning hotel, perfect Paris location!',  host_response: null, host_responded_at: null, created_at: now, updated_at: now },
    { id: '60000000-0000-0000-0000-000000000002', booking_id: '50000000-0000-0000-0000-000000000002', traveller_id: U4, property_id: P3, rating: 4, comment: 'Great NYC experience, modern and central.',              host_response: 'Thank you for staying with us!', host_responded_at: now, created_at: now, updated_at: now },
    { id: '60000000-0000-0000-0000-000000000003', booking_id: '50000000-0000-0000-0000-000000000003', traveller_id: U5, property_id: P2, rating: 5, comment: 'Paradise found in Bali. The private pool was magical.',  host_response: null, host_responded_at: null, created_at: now, updated_at: now },
  ];

  // Empty tables start empty — populated at runtime
  STORE.payments = [];
  STORE.conversations = [];
  STORE.itineraries = [];
  STORE.itinerary_items = [];
  STORE.search_history = [];
}

// ─── MockQueryBuilder ─────────────────────────────────────────────────────────

class MockQueryBuilder {
  private _table: string;
  private _op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';

  // Select config
  private _selectStr: string = '*';
  private _countMode: boolean = false;
  private _headMode: boolean = false;

  // Filters
  private _filters: Array<(row: Row) => boolean> = [];

  // Sorting / pagination
  private _order: Array<{ col: string; asc: boolean }> = [];
  private _range: [number, number] | null = null;
  private _limitN: number | null = null;

  // Result mode
  private _singleMode: boolean = false;
  private _maybeSingleMode: boolean = false;

  // Mutation payloads
  private _insertPayload: Row | Row[] | null = null;
  private _updatePayload: Row | null = null;
  private _upsertPayload: Row[] | null = null;
  private _upsertConflict: string | null = null;

  // Whether .select() was called after a mutation
  private _doSelectAfterMutation: boolean = false;

  constructor(table: string) {
    this._table = table;
  }

  select(fields: string = '*', opts?: { count?: string; head?: boolean }): this {
    if (this._op !== 'select') {
      this._doSelectAfterMutation = true;
    }
    this._selectStr = fields;
    if (opts?.count === 'exact') this._countMode = true;
    if (opts?.head) this._headMode = true;
    return this;
  }

  eq(col: string, val: unknown): this {
    this._filters.push((row) => row[col] === val);
    return this;
  }

  neq(col: string, val: unknown): this {
    this._filters.push((row) => row[col] !== val);
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this._filters.push((row) => vals.includes(row[col]));
    return this;
  }

  gte(col: string, val: string | number): this {
    this._filters.push((row) => (row[col] as string | number) >= val);
    return this;
  }

  lte(col: string, val: string | number): this {
    this._filters.push((row) => (row[col] as string | number) <= val);
    return this;
  }

  ilike(col: string, pattern: string): this {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this._filters.push((row) => regex.test(String(row[col] ?? '')));
    return this;
  }

  // Parses "email.ilike.%search%,full_name.ilike.%search%"
  or(filterStr: string): this {
    const parts = filterStr.split(',');
    const predicates = parts.map((part) => {
      const dotIdx = part.indexOf('.');
      const col = part.slice(0, dotIdx);
      const rest = part.slice(dotIdx + 1);
      const opDot = rest.indexOf('.');
      const op = rest.slice(0, opDot);
      const val = rest.slice(opDot + 1);
      if (op === 'ilike') {
        const regex = new RegExp(val.replace(/%/g, '.*'), 'i');
        return (row: Row) => regex.test(String(row[col] ?? ''));
      }
      if (op === 'eq') return (row: Row) => String(row[col]) === val;
      return () => false;
    });
    this._filters.push((row) => predicates.some((p) => p(row)));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this._order.push({ col, asc: opts?.ascending !== false });
    return this;
  }

  range(from: number, to: number): this {
    this._range = [from, to];
    return this;
  }

  limit(n: number): this {
    this._limitN = n;
    return this;
  }

  single(): this {
    this._singleMode = true;
    return this;
  }

  maybeSingle(): this {
    this._maybeSingleMode = true;
    return this;
  }

  insert(payload: Row | Row[]): this {
    this._op = 'insert';
    this._insertPayload = payload;
    return this;
  }

  update(payload: Row): this {
    this._op = 'update';
    this._updatePayload = payload;
    return this;
  }

  upsert(payload: Row[], opts?: { onConflict?: string }): this {
    this._op = 'upsert';
    this._upsertPayload = payload;
    this._upsertConflict = opts?.onConflict ?? null;
    return this;
  }

  delete(): this {
    this._op = 'delete';
    return this;
  }

  // ── Thenable: makes the builder await-able ──

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this._execute()).then(onfulfilled, onrejected);
  }

  // ── Internal execution ──

  private _execute(): QueryResult {
    const table = STORE[this._table];
    if (!table) {
      return { data: null, error: { message: `Unknown table: ${this._table}` } };
    }
    switch (this._op) {
      case 'select': return this._doSelect(table);
      case 'insert': return this._doInsert(table);
      case 'update': return this._doUpdate(table);
      case 'delete': return this._doDelete(table);
      case 'upsert': return this._doUpsert(table);
    }
  }

  private _applyFilters(rows: Row[]): Row[] {
    return rows.filter((row) => this._filters.every((f) => f(row)));
  }

  private _applyOrder(rows: Row[]): Row[] {
    if (this._order.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const { col, asc } of this._order) {
        const av = a[col];
        const bv = b[col];
        if (av == null && bv == null) continue;
        if (av == null) return asc ? -1 : 1;
        if (bv == null) return asc ? 1 : -1;
        if (av < bv) return asc ? -1 : 1;
        if (av > bv) return asc ? 1 : -1;
      }
      return 0;
    });
  }

  // Resolves PostgREST-style join patterns e.g. "properties(name, city)"
  private _resolveJoins(rows: Row[]): Row[] {
    const joinPattern = /(\w+)\s*\(([^)]+)\)/g;
    const joins: Array<{ alias: string; fields: string[] }> = [];
    let m: RegExpExecArray | null;
    while ((m = joinPattern.exec(this._selectStr)) !== null) {
      const [, alias, rawFields] = m;
      joins.push({
        alias,
        fields: rawFields.trim() === '*' ? ['*'] : rawFields.split(',').map((f) => f.trim()),
      });
    }
    if (joins.length === 0) return rows;

    return rows.map((row) => {
      const enhanced = { ...row };
      for (const join of joins) {
        enhanced[join.alias] = this._resolveOneJoin(row, join.alias, join.fields);
      }
      return enhanced;
    });
  }

  private _resolveOneJoin(row: Row, joinTable: string, fields: string[]): unknown {
    const rel = RELATIONS[this._table]?.[joinTable];
    if (!rel) return rel; // undefined → null will be coerced by callers

    const joinRows = STORE[joinTable] ?? [];
    let matched: Row[];

    if (rel.isArray) {
      // One-to-many: joined rows have FK pointing to parent row's id
      matched = joinRows.filter((jr) => jr[rel.fk] === row['id']);
    } else {
      // Many-to-one: parent row has FK pointing to joined row's id
      matched = joinRows.filter((jr) => jr['id'] === row[rel.fk]);
    }

    if (fields[0] !== '*') {
      matched = matched.map((jr) => {
        const out: Row = {};
        for (const f of fields) out[f] = jr[f];
        return out;
      });
    }

    return rel.isArray ? matched : (matched[0] ?? null);
  }

  // Trims rows to only the requested base fields (excluding join patterns)
  private _applyFieldSelection(rows: Row[]): Row[] {
    // Strip join patterns to get base field list
    const baseStr = this._selectStr.replace(/,?\s*\w+\s*\([^)]+\)/g, '').trim().replace(/^,/, '').trim();

    // Collect aliased join names to preserve them
    const joinedAliases: string[] = [];
    const jp = /(\w+)\s*\([^)]+\)/g;
    let m: RegExpExecArray | null;
    while ((m = jp.exec(this._selectStr)) !== null) {
      joinedAliases.push(m[1]);
    }

    if (!baseStr || baseStr === '*') return rows;

    const fields = baseStr.split(',').map((f) => f.trim()).filter(Boolean);
    if (fields.length === 0 || fields[0] === '*') return rows;

    return rows.map((row) => {
      const out: Row = {};
      for (const f of fields) out[f] = row[f];
      for (const alias of joinedAliases) {
        if (alias in row) out[alias] = row[alias];
      }
      return out;
    });
  }

  private _doSelect(table: Row[]): QueryResult {
    let rows = [...table];
    rows = this._applyFilters(rows);
    rows = this._applyOrder(rows);

    const count = this._countMode ? rows.length : null;

    if (this._headMode) {
      return { data: null, error: null, count };
    }

    if (this._range) {
      rows = rows.slice(this._range[0], this._range[1] + 1);
    }
    if (this._limitN !== null) {
      rows = rows.slice(0, this._limitN);
    }

    rows = this._resolveJoins(rows);
    rows = this._applyFieldSelection(rows);

    if (this._singleMode) {
      if (rows.length === 0) {
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
      }
      return { data: rows[0], error: null };
    }
    if (this._maybeSingleMode) {
      return { data: rows[0] ?? null, error: null };
    }

    return { data: rows, error: null, count };
  }

  private _doInsert(table: Row[]): QueryResult {
    const payloads = Array.isArray(this._insertPayload)
      ? this._insertPayload
      : [this._insertPayload!];

    const now = new Date().toISOString();
    const newRows: Row[] = payloads.map((p) => ({
      id: p.id ?? uuidv4(),
      created_at: now,
      updated_at: now,
      ...p,
    }));

    table.push(...newRows);

    if (!this._doSelectAfterMutation) {
      return { data: null, error: null };
    }

    if (this._singleMode) {
      return { data: newRows[0], error: null };
    }
    return { data: newRows, error: null };
  }

  private _doUpdate(table: Row[]): QueryResult {
    const matched = this._applyFilters(table);
    const now = new Date().toISOString();
    for (const row of matched) {
      Object.assign(row, this._updatePayload, { updated_at: now });
    }

    if (!this._doSelectAfterMutation) {
      return { data: null, error: null };
    }

    let result = this._resolveJoins(matched);
    result = this._applyFieldSelection(result);

    if (this._singleMode) {
      if (result.length === 0) {
        return { data: null, error: { message: 'No rows updated' } };
      }
      return { data: result[0], error: null };
    }
    return { data: result, error: null };
  }

  private _doDelete(table: Row[]): QueryResult {
    const toDelete = new Set(this._applyFilters(table).map((r) => r.id as string));
    // Splice in-place so the array reference in STORE remains valid
    for (let i = table.length - 1; i >= 0; i--) {
      if (toDelete.has(table[i].id as string)) {
        table.splice(i, 1);
      }
    }
    return { data: null, error: null };
  }

  private _doUpsert(table: Row[]): QueryResult {
    const conflictCols = this._upsertConflict
      ? this._upsertConflict.split(',').map((c) => c.trim())
      : ['id'];
    const now = new Date().toISOString();
    const results: Row[] = [];

    for (const payload of this._upsertPayload ?? []) {
      const existing = table.find((r) =>
        conflictCols.every((col) => r[col] === payload[col]),
      );
      if (existing) {
        Object.assign(existing, payload, { updated_at: now });
        results.push(existing);
      } else {
        const newRow: Row = { id: payload.id ?? uuidv4(), created_at: now, updated_at: now, ...payload };
        table.push(newRow);
        results.push(newRow);
      }
    }

    if (this._doSelectAfterMutation) {
      return { data: results, error: null };
    }
    return { data: null, error: null };
  }
}

// ─── MockAuth ─────────────────────────────────────────────────────────────────

class MockAuth {
  admin = {
    createUser: async (params: {
      email: string;
      password: string;
      email_confirm?: boolean;
      user_metadata?: Row;
    }) => {
      const existing = Array.from(AUTH_USERS.values()).find((u) => u.email === params.email);
      if (existing) {
        return { data: { user: null }, error: { message: 'User already registered' } };
      }
      const id = uuidv4();
      AUTH_USERS.set(id, { id, email: params.email, password: params.password, user_metadata: params.user_metadata ?? {} });
      // Simulate DB trigger: create profile
      const now = new Date().toISOString();
      STORE.profiles.push({
        id,
        email: params.email,
        role: 'traveller', // trigger default; caller updates via profile update
        full_name: params.user_metadata?.full_name ?? null,
        phone: null,
        avatar_url: null,
        company_name: null,
        company_verified: false,
        preferences: {},
        created_at: now,
        updated_at: now,
      });
      return { data: { user: { id, email: params.email } }, error: null };
    },

    updateUserById: async (userId: string, updates: { password?: string }) => {
      const user = AUTH_USERS.get(userId);
      if (!user) return { data: null, error: { message: 'User not found' } };
      if (updates.password) user.password = updates.password;
      return { data: { user: { id: user.id, email: user.email } }, error: null };
    },

    listUsers: async () => {
      const users = Array.from(AUTH_USERS.values()).map((u) => ({ id: u.id, email: u.email }));
      return { data: { users }, error: null };
    },

    deleteUser: async (userId: string) => {
      AUTH_USERS.delete(userId);
      return { data: {}, error: null };
    },
  };

  async signUp(params: { email: string; password: string; options?: { data?: Row } }) {
    const existing = Array.from(AUTH_USERS.values()).find((u) => u.email === params.email);
    if (existing) {
      return { data: { user: null, session: null }, error: { message: 'User already registered' } };
    }
    const id = uuidv4();
    const metadata = params.options?.data ?? {};
    AUTH_USERS.set(id, { id, email: params.email, password: params.password, user_metadata: metadata });

    // Simulate DB trigger
    const now = new Date().toISOString();
    STORE.profiles.push({
      id,
      email: params.email,
      role: (metadata.role as string) ?? 'traveller',
      full_name: (metadata.full_name as string) ?? null,
      phone: null,
      avatar_url: null,
      company_name: null,
      company_verified: false,
      preferences: {},
      created_at: now,
      updated_at: now,
    });

    const token = `mock::${id}`;
    return {
      data: {
        user: { id, email: params.email },
        session: {
          access_token: token,
          refresh_token: `mockrefresh::${id}`,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    };
  }

  async signInWithPassword(params: { email: string; password: string }) {
    const user = Array.from(AUTH_USERS.values()).find(
      (u) => u.email === params.email && u.password === params.password,
    );
    if (!user) {
      return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
    }
    const token = `mock::${user.id}`;
    return {
      data: {
        user: { id: user.id, email: user.email },
        session: {
          access_token: token,
          refresh_token: `mockrefresh::${user.id}`,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    };
  }

  async getUser(token: string) {
    if (!token?.startsWith('mock::')) {
      return { data: { user: null }, error: { message: 'Invalid token' } };
    }
    const userId = token.slice(6); // 'mock::'.length === 6
    const user = AUTH_USERS.get(userId);
    if (!user) {
      return { data: { user: null }, error: { message: 'User not found' } };
    }
    return { data: { user: { id: user.id, email: user.email } }, error: null };
  }

  async resetPasswordForEmail(_email: string, _opts?: unknown) {
    // No-op in mock mode — always succeed
    return { data: {}, error: null };
  }
}

// ─── MockSupabaseClient ───────────────────────────────────────────────────────

class MockSupabaseClient {
  readonly auth = new MockAuth();

  from(table: string): MockQueryBuilder {
    return new MockQueryBuilder(table);
  }
}

// ─── Initialise & export ─────────────────────────────────────────────────────

initMockData();

export const mockSupabaseClient = new MockSupabaseClient();

export { AUTH_USERS, STORE as MOCK_STORE };
