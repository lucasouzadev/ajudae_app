DO $$ BEGIN
  CREATE TYPE service_proposal_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'cancelled',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS service_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id),
  provider_id uuid NOT NULL REFERENCES providers(id),
  category_id uuid NOT NULL REFERENCES categories(id),
  status service_proposal_status NOT NULL DEFAULT 'pending',
  address_origin text NOT NULL,
  address_dest text,
  origin_lat numeric(10,7),
  origin_lng numeric(10,7),
  dest_lat numeric(10,7),
  dest_lng numeric(10,7),
  description text,
  media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_helper boolean NOT NULL DEFAULT false,
  price_proposed numeric(10,2),
  scheduled_for timestamptz,
  decision_note text,
  decided_at timestamptz,
  accepted_request_id uuid REFERENCES requests(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER service_proposals_updated_at
  BEFORE UPDATE ON service_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_service_proposals_client
  ON service_proposals(client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_proposals_provider
  ON service_proposals(provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_proposals_request
  ON service_proposals(accepted_request_id)
  WHERE accepted_request_id IS NOT NULL;

ALTER TABLE public.service_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_proposals_select" ON public.service_proposals;
CREATE POLICY "service_proposals_select"
  ON public.service_proposals FOR SELECT
  USING (
    client_id = auth.uid()
    OR provider_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "service_proposals_insert" ON public.service_proposals;
CREATE POLICY "service_proposals_insert"
  ON public.service_proposals FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "service_proposals_update" ON public.service_proposals;
CREATE POLICY "service_proposals_update"
  ON public.service_proposals FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "service_proposals_delete" ON public.service_proposals;
CREATE POLICY "service_proposals_delete"
  ON public.service_proposals FOR DELETE
  USING (false);
