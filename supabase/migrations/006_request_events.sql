-- request_events — auditoria append-only de todas as transições de status.
--
-- NOTA: to_status usa TEXT (não o enum request_status) para permitir
-- valores de auditoria internos como 'otp_failed' que não são estados
-- válidos do pedido mas são registrados para rastreamento de tentativas.
-- from_status mantém o enum pois sempre reflete um estado real anterior.

CREATE TABLE IF NOT EXISTS request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  from_status request_status,
  to_status text NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_events_request ON request_events (request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_request_events_actor ON request_events (actor_id, created_at);
