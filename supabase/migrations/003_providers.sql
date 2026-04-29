CREATE TABLE IF NOT EXISTS providers (
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

CREATE OR REPLACE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_providers_location ON providers (location_lat, location_lng)
  WHERE verified = true AND active = true;
