-- Portfolio data stored as JSONB to avoid adding individual columns per field
-- Backward-compatible: bio column still used as primary text field (indexed)
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS portfolio_data jsonb;

COMMENT ON COLUMN public.providers.portfolio_data IS
  'Stores full provider portfolio: bio, promo, services, helpers, featured review, etc.';

-- messages_last_read_at tracks last time user opened inbox — used for unread badge
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS messages_last_read_at timestamptz;

COMMENT ON COLUMN public.profiles.messages_last_read_at IS
  'Timestamp of last inbox open — used to compute unread message badge count';
