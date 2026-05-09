ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS payment_provider TEXT
    CHECK (payment_provider IN ('stripe', 'mercado_pago')),
  ADD COLUMN IF NOT EXISTS payment_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_qr_code_base64 TEXT,
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_requests_payment_provider_id
  ON requests(payment_provider, payment_provider_id)
  WHERE payment_provider IS NOT NULL AND payment_provider_id IS NOT NULL;
