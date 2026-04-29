CREATE TABLE IF NOT EXISTS requests (
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

CREATE OR REPLACE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_requests_client ON requests (client_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_provider ON requests (provider_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests (status, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_expires ON requests (expires_at) WHERE status = 'requested';
