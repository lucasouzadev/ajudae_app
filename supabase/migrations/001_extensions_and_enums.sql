CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CREATE TYPE não suporta IF NOT EXISTS — usar bloco DO com exception handler
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('client', 'provider', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cancel_reason AS ENUM (
    'client_gave_up',
    'provider_unavailable',
    'wrong_address',
    'price_disagreement',
    'no_show',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'open',
    'in_review',
    'resolved',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM (
    'car',
    'utility',
    'van',
    'truck_small',
    'truck_large'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
