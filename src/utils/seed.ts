// Database seeder — run via `npm run seed`
// Creates: 5 users (1 admin, 2 hosts, 2 travellers),
// 6 properties, room types, pricing rules,
// 90 days of bookings, 30 days of availability

import { supabaseAdmin } from '../config/supabase.js';

// eslint-disable-next-line no-console
const log = (msg: string) => console.log(`[seed] ${msg}`);
// eslint-disable-next-line no-console
const fail = (msg: string) => { console.error(`[seed] ERROR: ${msg}`); process.exit(1); };

// ---- helpers ----------------------------------------------------------------

/** Returns ISO date string N days from today (negative = past). */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
  );
}

function calcRevenue(baseCents: number, nights: number, rooms: number) {
  const total = baseCents * nights * rooms;
  return {
    total_price_cents: total,
    net_revenue_cents: total - Math.round(total * 0.15),
  };
}

// ---- user definitions -------------------------------------------------------

const SEED_USERS = [
  {
    email: 'admin@arcova.dev',
    password: 'Arcova2024!',
    role: 'admin' as const,
    full_name: 'Alex Administrator',
    company_name: null as string | null,
    phone: null as string | null,
  },
  {
    email: 'host1@arcova.dev',
    password: 'Arcova2024!',
    role: 'host' as const,
    full_name: 'Sophie Laurent',
    company_name: 'Sunset Resorts Group',
    phone: '+33612345678',
  },
  {
    email: 'host2@arcova.dev',
    password: 'Arcova2024!',
    role: 'host' as const,
    full_name: 'Marcus Chen',
    company_name: 'Urban Stays Ltd',
    phone: '+441234567890',
  },
  {
    email: 'traveller1@arcova.dev',
    password: 'Arcova2024!',
    role: 'traveller' as const,
    full_name: 'Emma Wilson',
    company_name: null,
    phone: '+12125550101',
  },
  {
    email: 'traveller2@arcova.dev',
    password: 'Arcova2024!',
    role: 'traveller' as const,
    full_name: 'James Rivera',
    company_name: null,
    phone: '+12125550202',
  },
];

// ---- property definitions ---------------------------------------------------

function buildProperties(host1Id: string, host2Id: string) {
  return [
    // ── host1: Sophie Laurent ──────────────────────────────────────────────
    {
      host_id: host1Id,
      name: 'Le Petit Soleil',
      description: 'A charming four-star hotel steps from the Opéra, blending Haussmann elegance with modern comfort. Beloved for its signature croissants and attentive concierge.',
      city: 'Paris',
      country: 'France',
      address: '14 Rue de la Paix, 75001 Paris',
      latitude: 48.8706,
      longitude: 2.3308,
      star_rating: 4,
      property_type: 'hotel' as const,
      amenities: ['wifi', 'breakfast', 'concierge', 'bar', 'room_service'],
      images: [] as string[],
      total_rooms: 12,
      status: 'active' as const,
      roomTypes: [
        {
          name: 'Classic Room',
          description: 'Cosy room with Parisian street views and hand-picked furnishings.',
          max_guests: 2,
          bed_type: 'queen',
          base_price_cents: 15000,
          total_inventory: 8,
          amenities: ['wifi', 'minibar', 'safe'],
        },
        {
          name: 'Deluxe Suite',
          description: 'Spacious suite with separate lounge, king bed, and soaking tub.',
          max_guests: 3,
          bed_type: 'king',
          base_price_cents: 28000,
          total_inventory: 4,
          amenities: ['wifi', 'minibar', 'balcony', 'bathtub', 'safe'],
        },
      ],
    },
    {
      host_id: host1Id,
      name: 'Sunset Bali Resort',
      description: 'Nestled among rice paddies and tropical gardens, this five-star resort offers private villas with pool butlers, a world-class spa, and direct beach access.',
      city: 'Bali',
      country: 'Indonesia',
      address: 'Jl. Pantai Seminyak 88, Bali 80361',
      latitude: -8.6905,
      longitude: 115.1673,
      star_rating: 5,
      property_type: 'resort' as const,
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'gym', 'beach_access', 'butler'],
      images: [] as string[],
      total_rooms: 19,
      status: 'active' as const,
      roomTypes: [
        {
          name: 'Garden Villa',
          description: 'Tranquil villa surrounded by tropical garden with outdoor shower.',
          max_guests: 2,
          bed_type: 'king',
          base_price_cents: 22000,
          total_inventory: 10,
          amenities: ['wifi', 'private_garden', 'outdoor_shower', 'minibar'],
        },
        {
          name: 'Ocean Pool Villa',
          description: 'Stunning villa with private infinity pool overlooking the Indian Ocean.',
          max_guests: 4,
          bed_type: 'king',
          base_price_cents: 45000,
          total_inventory: 6,
          amenities: ['wifi', 'private_pool', 'ocean_view', 'butler', 'minibar'],
        },
        {
          name: 'Family Bungalow',
          description: 'Two-bedroom bungalow ideal for families, with a kids corner and private pool.',
          max_guests: 6,
          bed_type: 'mixed',
          base_price_cents: 55000,
          total_inventory: 3,
          amenities: ['wifi', 'private_pool', 'kids_area', 'butler', 'kitchen'],
        },
      ],
    },
    {
      host_id: host1Id,
      name: 'Manhattan Boutique',
      description: 'A sleek 44th Street hideaway for design-conscious travellers. Architect-designed rooms, a curated art collection, and a rooftop bar with Empire State views.',
      city: 'New York',
      country: 'USA',
      address: '128 W 44th Street, New York, NY 10036',
      latitude: 40.7589,
      longitude: -73.9851,
      star_rating: 4,
      property_type: 'boutique' as const,
      amenities: ['wifi', 'gym', 'bar', 'concierge', 'rooftop'],
      images: [] as string[],
      total_rooms: 8,
      status: 'active' as const,
      roomTypes: [
        {
          name: 'City View Room',
          description: 'Floor-to-ceiling windows framing the Manhattan skyline.',
          max_guests: 2,
          bed_type: 'queen',
          base_price_cents: 20000,
          total_inventory: 6,
          amenities: ['wifi', 'city_view', 'espresso_machine'],
        },
        {
          name: 'Penthouse Suite',
          description: 'The crown jewel — panoramic views on two sides, private terrace, and kitchenette.',
          max_guests: 4,
          bed_type: 'king',
          base_price_cents: 60000,
          total_inventory: 2,
          amenities: ['wifi', 'panoramic_view', 'kitchenette', 'terrace', 'bathtub'],
        },
      ],
    },

    // ── host2: Marcus Chen ─────────────────────────────────────────────────
    {
      host_id: host2Id,
      name: 'The London Quarters',
      description: 'Boutique hotel in the heart of Covent Garden. Georgian townhouse exterior, contemporary interiors, and a buzzing ground-floor brasserie.',
      city: 'London',
      country: 'UK',
      address: '32 Covent Garden, London WC2E 8RF',
      latitude: 51.5117,
      longitude: -0.1240,
      star_rating: 4,
      property_type: 'hotel' as const,
      amenities: ['wifi', 'breakfast', 'bar', 'concierge', 'gym'],
      images: [] as string[],
      total_rooms: 15,
      status: 'active' as const,
      roomTypes: [
        {
          name: 'Classic Double',
          description: 'Warm, well-appointed room with British bespoke furnishings.',
          max_guests: 2,
          bed_type: 'double',
          base_price_cents: 18000,
          total_inventory: 10,
          amenities: ['wifi', 'tea_coffee', 'safe'],
        },
        {
          name: 'Premium King',
          description: 'Superior room with king bed, marble bathroom, and Club Lounge access.',
          max_guests: 2,
          bed_type: 'king',
          base_price_cents: 25000,
          total_inventory: 5,
          amenities: ['wifi', 'tea_coffee', 'bathtub', 'lounge_access', 'safe'],
        },
      ],
    },
    {
      host_id: host2Id,
      name: 'Tokyo Garden Inn',
      description: 'An intimate Shinjuku hostel blending Japanese minimalism with modern amenities. Perfect for solo travellers and budget-conscious adventurers exploring Tokyo.',
      city: 'Tokyo',
      country: 'Japan',
      address: '1-2-3 Kabukicho, Shinjuku, Tokyo 160-0021',
      latitude: 35.6938,
      longitude: 139.7034,
      star_rating: 3,
      property_type: 'hostel' as const,
      amenities: ['wifi', 'common_kitchen', 'lockers', 'laundry', 'bike_rental'],
      images: [] as string[],
      total_rooms: 23,
      status: 'active' as const,
      roomTypes: [
        {
          name: 'Capsule Bunk',
          description: 'Compact en-suite capsule with privacy curtain, personal USB charging, and reading light.',
          max_guests: 4,
          bed_type: 'bunk',
          base_price_cents: 5500,
          total_inventory: 15,
          amenities: ['wifi', 'locker', 'reading_light'],
        },
        {
          name: 'Private Tatami Room',
          description: 'Traditional Japanese room with futon bedding and private en-suite bathroom.',
          max_guests: 2,
          bed_type: 'futon',
          base_price_cents: 12000,
          total_inventory: 8,
          amenities: ['wifi', 'private_bathroom', 'yukata'],
        },
      ],
    },
    {
      host_id: host2Id,
      name: 'Dubai Heights',
      description: 'A landmark of modern luxury on Sheikh Zayed Road. Towering over the DIFC financial district, it offers unrivalled skyline views, a rooftop infinity pool, and a Michelin-starred restaurant.',
      city: 'Dubai',
      country: 'UAE',
      address: 'Sheikh Zayed Road, DIFC, Dubai 00000',
      latitude: 25.2048,
      longitude: 55.2708,
      star_rating: 5,
      property_type: 'hotel' as const,
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'gym', 'valet', 'concierge', 'butler'],
      images: [] as string[],
      total_rooms: 17,
      status: 'active' as const,
      roomTypes: [
        {
          name: 'Deluxe Room',
          description: 'Opulent room with floor-to-ceiling windows overlooking the glittering Dubai skyline.',
          max_guests: 2,
          bed_type: 'king',
          base_price_cents: 30000,
          total_inventory: 12,
          amenities: ['wifi', 'city_view', 'minibar', 'nespresso'],
        },
        {
          name: 'Sky Suite',
          description: 'Two-bedroom suite with a private plunge pool and 270° panoramic views.',
          max_guests: 4,
          bed_type: 'king',
          base_price_cents: 75000,
          total_inventory: 4,
          amenities: ['wifi', 'panoramic_view', 'private_pool', 'butler', 'dining_area'],
        },
        {
          name: 'Presidential Suite',
          description: 'The pinnacle of Dubai luxury — three bedrooms, private chef on request, and exclusive helipad access.',
          max_guests: 6,
          bed_type: 'king',
          base_price_cents: 150000,
          total_inventory: 1,
          amenities: ['wifi', 'private_pool', 'butler', 'private_dining', 'helipad_access'],
        },
      ],
    },
  ];
}

// ---- main -------------------------------------------------------------------

async function seed() {
  log('Starting Arcova seed...');

  // ── Idempotency check ──────────────────────────────────────────────────────
  const { data: alreadyExists } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', 'admin@arcova.dev')
    .maybeSingle();

  if (alreadyExists) {
    log('Seed data already present. Remove seed users from Supabase Auth → Authentication → Users to re-run.');
    process.exit(0);
  }

  // ── Step 1: Users ──────────────────────────────────────────────────────────
  log('Step 1/5 — Creating users...');

  const userIds: Record<string, string> = {};

  for (const u of SEED_USERS) {
    const { data, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,          // skip email verification
    });

    if (createErr || !data.user) fail(`createUser(${u.email}): ${createErr?.message}`);
    const uid = data.user!.id;
    userIds[u.email] = uid;

    // The trigger creates a profile with role='traveller'; update it with real data.
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: u.full_name,
        role: u.role,
        company_name: u.company_name,
        company_verified: u.role === 'host',
        phone: u.phone,
      })
      .eq('id', uid);

    if (profileErr) fail(`profile update (${u.email}): ${profileErr.message}`);
    log(`  ✓ ${u.role.padEnd(10)} ${u.email}`);
  }

  const host1Id = userIds['host1@arcova.dev'];
  const host2Id = userIds['host2@arcova.dev'];
  const t1Id = userIds['traveller1@arcova.dev'];
  const t2Id = userIds['traveller2@arcova.dev'];

  // ── Step 2: Properties + room types ───────────────────────────────────────
  log('Step 2/5 — Creating properties and room types...');

  const PROPERTIES = buildProperties(host1Id, host2Id);

  // propertyIds[i] matches PROPERTIES[i]
  const propertyIds: string[] = [];
  // roomId[propIndex][roomName] = room_type_id
  const roomId: Array<Record<string, string>> = [];
  // roomBase[room_type_id] = base_price_cents
  const roomBase: Record<string, number> = {};
  // roomInv[room_type_id] = total_inventory
  const roomInv: Record<string, number> = {};

  for (const prop of PROPERTIES) {
    const { roomTypes, ...propData } = prop;

    const { data: property, error: propErr } = await supabaseAdmin
      .from('properties')
      .insert(propData)
      .select()
      .single();

    if (propErr || !property) fail(`createProperty(${propData.name}): ${propErr?.message}`);

    const propId: string = property!.id;
    propertyIds.push(propId);
    roomId.push({});

    for (const rt of roomTypes) {
      const { data: roomType, error: rtErr } = await supabaseAdmin
        .from('room_types')
        .insert({ ...rt, property_id: propId, currency: 'USD', status: 'active' })
        .select()
        .single();

      if (rtErr || !roomType) fail(`createRoomType(${rt.name}): ${rtErr?.message}`);

      const rtId: string = roomType!.id;
      roomId[propertyIds.length - 1][rt.name] = rtId;
      roomBase[rtId] = rt.base_price_cents;
      roomInv[rtId] = rt.total_inventory;
    }

    log(`  ✓ ${property!.name} (${propData.city}) — ${roomTypes.length} room type(s)`);
  }

  // Handy accessors
  const pid = (i: number) => propertyIds[i];
  const rid = (propIdx: number, name: string) => roomId[propIdx][name];

  // ── Step 3: Pricing rules ──────────────────────────────────────────────────
  log('Step 3/5 — Creating pricing rules...');

  const year = new Date().getFullYear();

  const PRICING_RULES = [
    // Paris — Classic Room: weekend premium
    {
      room_type_id: rid(0, 'Classic Room'),
      name: 'Weekend Premium',
      rule_type: 'weekend',
      adjustment_type: 'percentage',
      adjustment_value: 20,
      priority: 1,
      days_of_week: [6, 7],
      is_active: true,
    },
    // Bali — Ocean Pool Villa: peak-season + weekend
    {
      room_type_id: rid(1, 'Ocean Pool Villa'),
      name: 'Peak Season',
      rule_type: 'seasonal',
      adjustment_type: 'percentage',
      adjustment_value: 30,
      priority: 1,
      date_from: `${year}-12-15`,
      date_to: `${year + 1}-01-15`,
      is_active: true,
    },
    {
      room_type_id: rid(1, 'Ocean Pool Villa'),
      name: 'Weekend Premium',
      rule_type: 'weekend',
      adjustment_type: 'percentage',
      adjustment_value: 15,
      priority: 2,
      days_of_week: [6, 7],
      is_active: true,
    },
    // New York — City View: last-minute discount
    {
      room_type_id: rid(2, 'City View Room'),
      name: 'Last Minute Deal',
      rule_type: 'last_minute',
      adjustment_type: 'percentage',
      adjustment_value: -15,
      priority: 1,
      days_before_checkin: 7,
      is_active: true,
    },
    // London — Classic Double: weekend surcharge
    {
      room_type_id: rid(3, 'Classic Double'),
      name: 'Weekend Surcharge',
      rule_type: 'weekend',
      adjustment_type: 'percentage',
      adjustment_value: 18,
      priority: 1,
      days_of_week: [6, 7],
      is_active: true,
    },
    // Dubai — Deluxe Room: winter peak season
    {
      room_type_id: rid(5, 'Deluxe Room'),
      name: 'Winter Peak Season',
      rule_type: 'seasonal',
      adjustment_type: 'percentage',
      adjustment_value: 25,
      priority: 1,
      date_from: `${year}-11-01`,
      date_to: `${year + 1}-02-28`,
      is_active: true,
    },
    // Dubai — Sky Suite: fixed fee for NYE week
    {
      room_type_id: rid(5, 'Sky Suite'),
      name: 'New Year Premium',
      rule_type: 'seasonal',
      adjustment_type: 'fixed',
      adjustment_value: 500,           // +$500/night
      priority: 1,
      date_from: `${year}-12-28`,
      date_to: `${year + 1}-01-02`,
      is_active: true,
    },
  ];

  const { error: rulesErr } = await supabaseAdmin.from('pricing_rules').insert(PRICING_RULES);
  if (rulesErr) fail(`pricingRules insert: ${rulesErr.message}`);
  log(`  ✓ ${PRICING_RULES.length} pricing rules`);

  // ── Step 4: Availability (next 30 days) ───────────────────────────────────
  log('Step 4/5 — Creating availability (30 days × all room types)...');

  const availRows: {
    room_type_id: string;
    date: string;
    available_rooms: number;
    is_closed: boolean;
  }[] = [];

  for (let propIdx = 0; propIdx < propertyIds.length; propIdx++) {
    for (const rtId of Object.values(roomId[propIdx])) {
      const inv = roomInv[rtId];
      for (let d = 0; d < 30; d++) {
        // Reduce availability on weekends to simulate organic demand
        const dow = (new Date().getDay() + d) % 7;
        const weekendReduction = (dow === 5 || dow === 6) ? Math.ceil(inv * 0.3) : 0;
        availRows.push({
          room_type_id: rtId,
          date: dateOffset(d),
          available_rooms: Math.max(0, inv - weekendReduction),
          is_closed: false,
        });
      }
    }
  }

  // Batch insert in chunks of 200
  for (let i = 0; i < availRows.length; i += 200) {
    const { error: availErr } = await supabaseAdmin
      .from('availability')
      .upsert(availRows.slice(i, i + 200), { onConflict: 'room_type_id,date' });
    if (availErr) fail(`availability upsert (batch ${i}): ${availErr.message}`);
  }

  log(`  ✓ ${availRows.length} availability rows`);

  // ── Step 5: Bookings ───────────────────────────────────────────────────────
  log('Step 5/5 — Creating bookings...');

  type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

  interface BookingRow {
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
    booked_at: string;
    cancelled_at: string | null;
    cancellation_reason: string | null;
  }

  const bookings: BookingRow[] = [];

  const addBooking = (
    travellerId: string,
    propIdx: number,
    roomName: string,
    checkIn: string,
    checkOut: string,
    guests: number,
    status: BookingStatus,
    specialRequests: string | null = null,
  ) => {
    const rtId = rid(propIdx, roomName);
    const nights = nightsBetween(checkIn, checkOut);
    const { total_price_cents, net_revenue_cents } = calcRevenue(roomBase[rtId], nights, 1);

    // Book a few days before check-in (or a realistic time in the past for past bookings)
    const checkInTime = new Date(checkIn).getTime();
    const leadDays = checkInTime > Date.now() ? 14 : Math.ceil((Date.now() - checkInTime) / 86400000) + 5;
    const bookedAt = new Date(checkInTime - leadDays * 86400000).toISOString();

    bookings.push({
      traveller_id: travellerId,
      property_id: pid(propIdx),
      room_type_id: rtId,
      check_in: checkIn,
      check_out: checkOut,
      num_guests: guests,
      num_rooms: 1,
      total_price_cents,
      commission_rate: 15,
      net_revenue_cents,
      status,
      booking_source: 'platform',
      special_requests: specialRequests,
      booked_at: bookedAt,
      cancelled_at: status === 'cancelled'
        ? new Date(new Date(bookedAt).getTime() + 2 * 86400000).toISOString()
        : null,
      cancellation_reason: status === 'cancelled' ? 'Change of travel plans' : null,
    });
  };

  // ---- traveller1 (Emma Wilson) ----

  // Completed stays — provide analytics data
  addBooking(t1Id, 0, 'Classic Room',       dateOffset(-40), dateOffset(-37), 2, 'completed');
  addBooking(t1Id, 1, 'Ocean Pool Villa',   dateOffset(-75), dateOffset(-68), 2, 'completed', 'Late checkout if possible');
  addBooking(t1Id, 3, 'Classic Double',     dateOffset(-20), dateOffset(-18), 2, 'completed');
  addBooking(t1Id, 1, 'Garden Villa',       dateOffset(-90), dateOffset(-85), 2, 'completed');
  addBooking(t1Id, 5, 'Deluxe Room',        dateOffset(-50), dateOffset(-46), 2, 'completed');

  // Cancelled
  addBooking(t1Id, 4, 'Private Tatami Room', dateOffset(-55), dateOffset(-52), 2, 'cancelled');

  // No-show
  addBooking(t1Id, 3, 'Premium King',        dateOffset(-10), dateOffset(-8), 2, 'no_show');

  // Upcoming confirmed
  addBooking(t1Id, 2, 'City View Room',     dateOffset(10),  dateOffset(12),  2, 'confirmed', 'High floor preferred');
  addBooking(t1Id, 5, 'Sky Suite',          dateOffset(45),  dateOffset(49),  2, 'confirmed');

  // ---- traveller2 (James Rivera) ----

  // Completed stays
  addBooking(t2Id, 5, 'Deluxe Room',        dateOffset(-80), dateOffset(-76), 2, 'completed');
  addBooking(t2Id, 3, 'Premium King',       dateOffset(-30), dateOffset(-28), 2, 'completed');
  addBooking(t2Id, 4, 'Capsule Bunk',       dateOffset(-15), dateOffset(-12), 3, 'completed', 'Quiet room if available');
  addBooking(t2Id, 0, 'Deluxe Suite',       dateOffset(-60), dateOffset(-57), 3, 'completed');
  addBooking(t2Id, 5, 'Sky Suite',          dateOffset(-45), dateOffset(-41), 2, 'completed');
  addBooking(t2Id, 2, 'City View Room',     dateOffset(-5),  dateOffset(-3),  1, 'completed');

  // Upcoming confirmed
  addBooking(t2Id, 1, 'Garden Villa',       dateOffset(20),  dateOffset(25),  2, 'confirmed');
  addBooking(t2Id, 2, 'Penthouse Suite',    dateOffset(60),  dateOffset(63),  4, 'confirmed', 'Celebrating anniversary — champagne on arrival please');

  const { error: bookingsErr } = await supabaseAdmin.from('bookings').insert(bookings);
  if (bookingsErr) fail(`bookings insert: ${bookingsErr.message}`);
  log(`  ✓ ${bookings.length} bookings`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalRoomTypes = roomId.reduce((s, r) => s + Object.keys(r).length, 0);

  log('');
  log('══════════════════════════════════════════════');
  log('  Seed complete!');
  log('══════════════════════════════════════════════');
  log(`  Users       : ${SEED_USERS.length}  (1 admin, 2 hosts, 2 travellers)`);
  log(`  Properties  : ${PROPERTIES.length}  (Paris, Bali, New York, London, Tokyo, Dubai)`);
  log(`  Room types  : ${totalRoomTypes}`);
  log(`  Pricing rules: ${PRICING_RULES.length}`);
  log(`  Availability : ${availRows.length} rows (30 days)`);
  log(`  Bookings    : ${bookings.length}`);
  log('');
  log('  Credentials  email / password');
  log('  ─────────────────────────────────────────');
  for (const u of SEED_USERS) {
    log(`  ${u.role.padEnd(10)} ${u.email} / ${u.password}`);
  }
  log('══════════════════════════════════════════════');
}

seed().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Fatal:', e);
  process.exit(1);
});
