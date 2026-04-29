-- Fase 1: campo selfie para verificação manual pelo admin
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS doc_selfie_url TEXT;

COMMENT ON COLUMN providers.doc_selfie_url IS 'URL da selfie do prestador no bucket provider-docs — verificação manual pela equipe';

-- Fase 2: campos KYC automatizado via Idwall
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS kyc_report_id TEXT,
  ADD COLUMN IF NOT EXISTS kyc_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_score INTEGER,
  ADD COLUMN IF NOT EXISTS kyc_result JSONB;

ALTER TABLE providers
  ADD CONSTRAINT providers_kyc_status_check
  CHECK (kyc_status IN (
    'not_started',
    'in_progress',
    'approved',
    'manual_review',
    'rejected'
  ));

CREATE INDEX IF NOT EXISTS idx_providers_kyc_status ON providers(kyc_status);
CREATE INDEX IF NOT EXISTS idx_providers_kyc_report_id ON providers(kyc_report_id);

COMMENT ON COLUMN providers.kyc_status       IS 'Status da verificação de identidade via Idwall';
COMMENT ON COLUMN providers.kyc_report_id    IS 'ID do relatório no Idwall — usado para correlacionar webhook';
COMMENT ON COLUMN providers.kyc_score        IS 'Score de 0–100 retornado pelo Idwall. ≥70 = aprovação automática';
COMMENT ON COLUMN providers.kyc_completed_at IS 'Timestamp de quando o webhook do Idwall foi recebido';
COMMENT ON COLUMN providers.kyc_result       IS 'Payload completo do webhook (JSONB) — auditoria imutável';
