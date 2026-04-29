ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS lng numeric(10,7);

COMMENT ON COLUMN profiles.lat IS 'Last known latitude of the client (set during onboarding GPS step)';
COMMENT ON COLUMN profiles.lng IS 'Last known longitude of the client (set during onboarding GPS step)';
