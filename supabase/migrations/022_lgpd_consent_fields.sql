-- Add LGPD consent tracking fields to profiles table (idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lgpd_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS geolocation_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS camera_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notifications_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_consent_update TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index on lgpd_accepted for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_lgpd_accepted ON profiles(lgpd_accepted);

-- Add comment for documentation
COMMENT ON COLUMN profiles.lgpd_accepted IS 'User has accepted LGPD privacy policy';
COMMENT ON COLUMN profiles.geolocation_requested IS 'User has granted or been asked about geolocation permission';
COMMENT ON COLUMN profiles.camera_requested IS 'User has granted or been asked about camera permission';
COMMENT ON COLUMN profiles.notifications_requested IS 'User has granted or been asked about notification permission';
COMMENT ON COLUMN profiles.last_consent_update IS 'Timestamp of the last consent update';