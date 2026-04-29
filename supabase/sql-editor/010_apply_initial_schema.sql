BEGIN;

-- 001_extensions_and_enums.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('client', 'provider', 'admin');

CREATE TYPE request_status AS ENUM (
  'requested',
  'accepted',
  'en_route',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
  'disputed'
);

CREATE TYPE cancel_reason AS ENUM (
  'client_gave_up',
  'provider_unavailable',
  'wrong_address',
  'price_disagreement',
  'no_show',
  'other'
);

CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_review',
  'resolved',
  'closed'
);

CREATE TYPE vehicle_type AS ENUM (
  'car',
  'utility',
  'van',
  'truck_small',
  'truck_large'
);

-- 002_profiles.sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  name text NOT NULL,
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, name)
  VALUES (
    NEW.id,
    'client',
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 003_providers.sql
CREATE TABLE providers (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  bio text,
  service_radius_km numeric(5,2) NOT NULL DEFAULT 5.0,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  location_updated_at timestamptz,
  vehicle_type vehicle_type,
  vehicle_plate text,
  vehicle_capacity_kg numeric(8,2),
  rating_avg numeric(3,2) NOT NULL DEFAULT 0.0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_providers_location ON providers (location_lat, location_lng)
  WHERE verified = true AND active = true;

-- 004_categories.sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO categories (name, description) VALUES
  ('Frete', 'Transporte de itens e cargas em geral'),
  ('Mudança', 'Mudança residencial ou comercial'),
  ('Carreto', 'Carreto de pequeno porte');

CREATE TABLE provider_categories (
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  price_base numeric(10,2),
  PRIMARY KEY (provider_id, category_id)
);

-- 005_requests.sql
CREATE TABLE requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id),
  provider_id uuid REFERENCES providers(id),
  category_id uuid NOT NULL REFERENCES categories(id),
  status request_status NOT NULL DEFAULT 'requested',
  address_origin text NOT NULL,
  address_dest text,
  origin_lat numeric(10,7),
  origin_lng numeric(10,7),
  dest_lat numeric(10,7),
  dest_lng numeric(10,7),
  description text,
  media_urls jsonb DEFAULT '[]',
  needs_helper boolean NOT NULL DEFAULT false,
  scheduled_for timestamptz,
  price_estimated numeric(10,2),
  price_final numeric(10,2),
  platform_fee numeric(10,2),
  otp_code_hash text,
  otp_expires_at timestamptz,
  cancel_reason cancel_reason,
  cancel_note text,
  cancelled_by uuid REFERENCES profiles(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_requests_client ON requests (client_id, status);
CREATE INDEX idx_requests_provider ON requests (provider_id, status);
CREATE INDEX idx_requests_status ON requests (status, created_at);
CREATE INDEX idx_requests_expires ON requests (expires_at) WHERE status = 'requested';

-- 006_request_events.sql
CREATE TABLE request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  from_status request_status,
  to_status request_status NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_events_request ON request_events (request_id, created_at);
CREATE INDEX idx_request_events_actor ON request_events (actor_id, created_at);

-- 007_tickets.sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id),
  opened_by uuid NOT NULL REFERENCES profiles(id),
  status ticket_status NOT NULL DEFAULT 'open',
  reason text NOT NULL,
  description text,
  media_urls jsonb DEFAULT '[]',
  resolved_by uuid REFERENCES profiles(id),
  resolution text,
  notes_admin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_tickets_request ON tickets (request_id);
CREATE INDEX idx_tickets_status ON tickets (status, created_at);

-- 008_ratings.sql
CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES requests(id),
  client_id uuid NOT NULL REFERENCES profiles(id),
  provider_id uuid NOT NULL REFERENCES providers(id),
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ratings_provider ON ratings (provider_id, created_at);

CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE providers
  SET
    rating_avg = (SELECT AVG(stars) FROM ratings WHERE provider_id = NEW.provider_id),
    rating_count = (SELECT COUNT(*) FROM ratings WHERE provider_id = NEW.provider_id)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_rating_insert
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- 009_quick_messages.sql
CREATE TABLE quick_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quick_messages_request ON quick_messages (request_id, created_at);

COMMIT;