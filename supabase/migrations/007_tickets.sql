CREATE TABLE IF NOT EXISTS tickets (
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

CREATE OR REPLACE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_tickets_request ON tickets (request_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status, created_at);
