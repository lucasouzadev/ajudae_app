-- Status de onboarding do prestador
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'incomplete'
    CHECK (onboarding_status IN ('incomplete','submitted','approved','rejected')),
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS contact_method text CHECK (contact_method IN ('ligacao','whatsapp')),
  ADD COLUMN IF NOT EXISTS contact_availability text,
  ADD COLUMN IF NOT EXISTS doc_rg_url text,
  ADD COLUMN IF NOT EXISTS doc_residence_url text,
  ADD COLUMN IF NOT EXISTS doc_cnh_url text,
  ADD COLUMN IF NOT EXISTS doc_crlv_url text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejection_until timestamptz;
