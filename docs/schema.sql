-- =============================================================
-- Arcova Platform — Complete Database Schema
-- Run this in the Supabase SQL Editor (once, on a fresh project)
-- =============================================================

-- ---------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- =============================================================
-- HELPER FUNCTIONS
-- =============================================================

-- Auto-update the updated_at column on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'traveller')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================
-- TABLE 1 — profiles
-- One-to-one with auth.users; created automatically via trigger
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL,
  full_name         TEXT,
  role              TEXT        NOT NULL DEFAULT 'traveller'
                                CHECK (role IN ('traveller', 'host', 'admin')),
  avatar_url        TEXT,
  phone             TEXT,
  company_name      TEXT,
  company_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  preferences       JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: create profile on new Supabase auth sign-up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================
-- TABLE 2 — properties
-- A property belongs to one host (profile with role='host')
-- =============================================================
CREATE TABLE IF NOT EXISTS properties (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id        UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT          NOT NULL,
  description    TEXT,
  city           TEXT          NOT NULL,
  country        TEXT          NOT NULL,
  address        TEXT,
  latitude       NUMERIC(10,6),
  longitude      NUMERIC(10,6),
  star_rating    NUMERIC(2,1)  CHECK (star_rating BETWEEN 1 AND 5),
  property_type  TEXT          CHECK (property_type IN
                                ('hotel','resort','vacation_rental','hostel','boutique')),
  amenities      TEXT[]        NOT NULL DEFAULT '{}',
  images         TEXT[]        NOT NULL DEFAULT '{}',
  total_rooms    INT           NOT NULL DEFAULT 0 CHECK (total_rooms >= 0),
  status         TEXT          NOT NULL DEFAULT 'pending_review'
                               CHECK (status IN ('active','inactive','pending_review')),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================
-- TABLE 3 — room_types
-- Each property has one or more room types
-- =============================================================
CREATE TABLE IF NOT EXISTS room_types (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  description      TEXT,
  max_guests       INT         NOT NULL DEFAULT 2 CHECK (max_guests > 0),
  bed_type         TEXT,
  base_price_cents INT         NOT NULL CHECK (base_price_cents >= 0),
  currency         TEXT        NOT NULL DEFAULT 'USD',
  total_inventory  INT         NOT NULL DEFAULT 1 CHECK (total_inventory >= 0),
  amenities        TEXT[]      NOT NULL DEFAULT '{}',
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_room_types_updated_at
  BEFORE UPDATE ON room_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================
-- TABLE 4 — bookings
-- NOTE: payment_id FK is added after the payments table is created
-- net_revenue_cents is a regular column (code inserts it explicitly)
-- =============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id        UUID        NOT NULL REFERENCES profiles(id),
  property_id         UUID        NOT NULL REFERENCES properties(id),
  room_type_id        UUID        NOT NULL REFERENCES room_types(id),
  check_in            DATE        NOT NULL,
  check_out           DATE        NOT NULL,
  num_guests          INT         NOT NULL DEFAULT 1 CHECK (num_guests > 0),
  num_rooms           INT         NOT NULL DEFAULT 1 CHECK (num_rooms > 0),
  total_price_cents   INT         NOT NULL CHECK (total_price_cents >= 0),
  commission_rate     NUMERIC(5,2) NOT NULL DEFAULT 15,
  net_revenue_cents   INT         NOT NULL CHECK (net_revenue_cents >= 0),
  status              TEXT        NOT NULL DEFAULT 'confirmed'
                                  CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  booking_source      TEXT        NOT NULL DEFAULT 'platform',
  special_requests    TEXT,
  payment_status      TEXT        CHECK (payment_status IN
                                  ('pending','processing','succeeded','failed','refunded')),
  payment_id          UUID,       -- FK to payments(id) — added below via ALTER TABLE
  booked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  CONSTRAINT check_out_after_check_in CHECK (check_out > check_in)
);


-- =============================================================
-- TABLE 5 — pricing_rules
-- Dynamic price adjustments per room type
-- =============================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id         UUID        NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  rule_type            TEXT        NOT NULL
                                   CHECK (rule_type IN ('weekend','seasonal','last_minute','occupancy')),
  adjustment_type      TEXT        NOT NULL
                                   CHECK (adjustment_type IN ('percentage','fixed')),
  adjustment_value     NUMERIC     NOT NULL,
  priority             INT         NOT NULL DEFAULT 1,
  days_of_week         INT[],                  -- 1=Mon … 7=Sun
  date_from            DATE,
  date_to              DATE,
  days_before_checkin  INT,
  occupancy_threshold  NUMERIC(5,2),
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================
-- TABLE 6 — availability
-- Per-date inventory override per room type
-- The UNIQUE constraint is required for the upsert in availability.service.ts
-- =============================================================
CREATE TABLE IF NOT EXISTS availability (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id     UUID        NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  available_rooms  INT         NOT NULL DEFAULT 0 CHECK (available_rooms >= 0),
  effective_rate_cents INT     CHECK (effective_rate_cents >= 0),
  is_closed        BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE (room_type_id, date)
);


-- =============================================================
-- TABLE 7 — search_history
-- Anonymously recordable; traveller_id is nullable for guests
-- =============================================================
CREATE TABLE IF NOT EXISTS search_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  destination   TEXT,
  check_in      DATE,
  check_out     DATE,
  num_guests    INT,
  filters       JSONB       NOT NULL DEFAULT '{}',
  results_count INT,
  searched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================
-- TABLE 8 — conversations
-- AI chat session per traveller
-- =============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID        NOT NULL UNIQUE,
  traveller_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages          JSONB       NOT NULL DEFAULT '[]',
  preferences       JSONB       NOT NULL DEFAULT '{}',
  trip_plan         JSONB,
  suggested_flights JSONB       NOT NULL DEFAULT '[]',
  suggested_hotels  JSONB       NOT NULL DEFAULT '[]',
  suggested_places  JSONB       NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================
-- TABLE 9 — reviews
-- One review per booking; host can respond
-- =============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID        NOT NULL REFERENCES bookings(id),
  traveller_id      UUID        NOT NULL REFERENCES profiles(id),
  property_id       UUID        NOT NULL REFERENCES properties(id),
  rating            INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT,
  host_response     TEXT,
  host_responded_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)           -- one review per booking
);


-- =============================================================
-- TABLE 10 — payments
-- Stripe payment record linked to a booking
-- =============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                UUID        NOT NULL REFERENCES bookings(id),
  traveller_id              UUID        NOT NULL REFERENCES profiles(id),
  amount_cents              INT         NOT NULL CHECK (amount_cents >= 0),
  currency                  TEXT        NOT NULL DEFAULT 'usd',
  status                    TEXT        NOT NULL DEFAULT 'pending'
                                        CHECK (status IN
                                        ('pending','processing','succeeded','failed','refunded')),
  stripe_payment_intent_id  TEXT,
  stripe_client_secret      TEXT,
  payment_method            TEXT,
  failure_reason            TEXT,
  refunded_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Resolve the bookings ↔ payments circular FK now that payments exists
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;


-- =============================================================
-- TABLE 11 — itineraries
-- A saved trip plan belonging to a traveller
-- =============================================================
CREATE TABLE IF NOT EXISTS itineraries (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id              UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                      TEXT        NOT NULL,
  description               TEXT,
  start_date                DATE        NOT NULL,
  end_date                  DATE        NOT NULL,
  cover_image_url           TEXT,
  total_estimated_cost_cents INT        NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_date >= start_date)
);

CREATE OR REPLACE TRIGGER trg_itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================
-- TABLE 12 — itinerary_items
-- Individual activities / bookings inside an itinerary
-- =============================================================
CREATE TABLE IF NOT EXISTS itinerary_items (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id           UUID        NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  type                   TEXT        NOT NULL
                                     CHECK (type IN
                                     ('hotel','flight','car_rental','activity','meal','transport')),
  booking_id             UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  title                  TEXT        NOT NULL,
  description            TEXT,
  date                   DATE        NOT NULL,
  time                   TIME,
  end_time               TIME,
  location               TEXT,
  notes                  TEXT,
  estimated_cost_cents   INT,
  sort_order             INT         NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================
-- INDEXES (performance)
-- =============================================================

-- properties
CREATE INDEX IF NOT EXISTS idx_properties_host_id    ON properties(host_id);
CREATE INDEX IF NOT EXISTS idx_properties_status     ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city       ON properties USING gin(to_tsvector('simple', city));

-- room_types
CREATE INDEX IF NOT EXISTS idx_room_types_property   ON room_types(property_id);
CREATE INDEX IF NOT EXISTS idx_room_types_status     ON room_types(status);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_traveller    ON bookings(traveller_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property     ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_type    ON bookings(room_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booked_at    ON bookings(booked_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in     ON bookings(check_in);

-- pricing_rules
CREATE INDEX IF NOT EXISTS idx_pricing_rules_room    ON pricing_rules(room_type_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active  ON pricing_rules(room_type_id, is_active);

-- availability — UNIQUE (room_type_id, date) already creates a covering index

-- search_history
CREATE INDEX IF NOT EXISTS idx_search_history_traveller ON search_history(traveller_id);
CREATE INDEX IF NOT EXISTS idx_search_history_at        ON search_history(searched_at DESC);

-- conversations
CREATE INDEX IF NOT EXISTS idx_conversations_traveller  ON conversations(traveller_id);
-- session_id already has a UNIQUE index

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_property         ON reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_traveller        ON reviews(traveller_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_traveller       ON payments(traveller_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking         ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent   ON payments(stripe_payment_intent_id);

-- itineraries
CREATE INDEX IF NOT EXISTS idx_itineraries_traveller    ON itineraries(traveller_id);

-- itinerary_items
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary ON itinerary_items(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_order     ON itinerary_items(itinerary_id, sort_order);


-- =============================================================
-- ROW LEVEL SECURITY
-- The backend uses the service role key which bypasses RLS.
-- Policies below protect direct client access (defense-in-depth).
-- =============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

-- ---- profiles -----------------------------------------------
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---- properties ---------------------------------------------
CREATE POLICY "Anyone can read active properties"
  ON properties FOR SELECT
  USING (status = 'active' OR host_id = auth.uid());

CREATE POLICY "Hosts can insert own properties"
  ON properties FOR INSERT
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update own properties"
  ON properties FOR UPDATE
  USING (host_id = auth.uid());

-- ---- room_types ---------------------------------------------
CREATE POLICY "Anyone can read room types of active properties"
  ON room_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = room_types.property_id
        AND (p.status = 'active' OR p.host_id = auth.uid())
    )
  );

CREATE POLICY "Hosts can manage their room types"
  ON room_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = room_types.property_id AND p.host_id = auth.uid()
    )
  );

-- ---- bookings -----------------------------------------------
CREATE POLICY "Travellers can read own bookings"
  ON bookings FOR SELECT
  USING (traveller_id = auth.uid());

CREATE POLICY "Travellers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (traveller_id = auth.uid());

CREATE POLICY "Travellers can cancel own bookings"
  ON bookings FOR UPDATE
  USING (traveller_id = auth.uid());

-- ---- pricing_rules ------------------------------------------
CREATE POLICY "Hosts can manage pricing rules for their room types"
  ON pricing_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM room_types rt
      JOIN properties p ON p.id = rt.property_id
      WHERE rt.id = pricing_rules.room_type_id AND p.host_id = auth.uid()
    )
  );

-- ---- availability -------------------------------------------
CREATE POLICY "Anyone can read availability"
  ON availability FOR SELECT
  USING (true);

CREATE POLICY "Hosts can manage availability for their room types"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM room_types rt
      JOIN properties p ON p.id = rt.property_id
      WHERE rt.id = availability.room_type_id AND p.host_id = auth.uid()
    )
  );

-- ---- search_history -----------------------------------------
CREATE POLICY "Users can read own search history"
  ON search_history FOR SELECT
  USING (traveller_id = auth.uid());

-- ---- conversations ------------------------------------------
CREATE POLICY "Users can read own conversations"
  ON conversations FOR SELECT
  USING (traveller_id = auth.uid());

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (traveller_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (traveller_id = auth.uid());

-- ---- reviews ------------------------------------------------
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Travellers can create reviews for own bookings"
  ON reviews FOR INSERT
  WITH CHECK (traveller_id = auth.uid());

CREATE POLICY "Travellers can update own reviews"
  ON reviews FOR UPDATE
  USING (traveller_id = auth.uid());

-- ---- payments -----------------------------------------------
CREATE POLICY "Travellers can read own payments"
  ON payments FOR SELECT
  USING (traveller_id = auth.uid());

-- ---- itineraries --------------------------------------------
CREATE POLICY "Travellers can manage own itineraries"
  ON itineraries FOR ALL
  USING (traveller_id = auth.uid());

-- ---- itinerary_items ----------------------------------------
CREATE POLICY "Travellers can manage items in own itineraries"
  ON itinerary_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itineraries i
      WHERE i.id = itinerary_items.itinerary_id AND i.traveller_id = auth.uid()
    )
  );
