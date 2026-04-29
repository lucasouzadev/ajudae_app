-- Migration: 015_payment_fields.sql
-- Aplique via: supabase db push OU Supabase Dashboard → SQL Editor
-- Requer aprovação do CTO antes de aplicar em produção.
-- Relacionado a: CTO-23 (Stripe integration)

-- ─── Campos de pagamento Stripe na tabela requests ────────────────────────
--
-- Adiciona campos para rastreamento do ciclo de vida do pagamento via Stripe.
-- O pagamento só existe após a conclusão do serviço (request_complete_with_otp).
-- Todos os campos são nullable — pedidos sem pagamento processado mantêm NULL.

ALTER TABLE requests
  -- Estado do pagamento, separado do status do serviço.
  -- Valores possíveis:
  --   pending    → pagamento pendente (após conclusão do serviço)
  --   authorized → valor pré-autorizado no cartão do cliente
  --   captured   → cobrança confirmada — plataforma recebeu o valor
  --   refunded   → estorno realizado (cancelamento pós-captura)
  --   failed     → falha no processamento do pagamento
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    CHECK (payment_status IN ('pending', 'authorized', 'captured', 'refunded', 'failed')),

  -- ID do PaymentIntent do Stripe (ex: "pi_3OxxxxxxxxxxxxxxxxxxxxXX").
  -- Único por pedido — usado para reconciliar com o dashboard do Stripe.
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT UNIQUE,

  -- Timestamp de quando a cobrança foi efetivamente capturada no Stripe.
  -- NULL enquanto o pagamento não for confirmado (captured).
  ADD COLUMN IF NOT EXISTS payment_captured_at TIMESTAMPTZ,

  -- Valor efetivamente cobrado do cliente, em BRL.
  -- Deve ser igual a price_final — registrado aqui para auditoria independente.
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2),

  -- Mensagem de erro retornada pelo Stripe em caso de falha.
  -- Armazenado para diagnóstico — nunca exibir diretamente ao cliente final.
  ADD COLUMN IF NOT EXISTS payment_error TEXT;

-- ─── Índice para lookup rápido por payment_intent_id ─────────────────────
--
-- Usado em webhooks do Stripe: ao receber um evento payment_intent.succeeded,
-- localizamos o request correspondente via este índice sem full table scan.
-- Filtrado por NOT NULL para evitar entradas desnecessárias no índice.

CREATE INDEX IF NOT EXISTS idx_requests_payment_intent
  ON requests(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

-- ─── Comentários nas colunas (pg_description) ────────────────────────────

COMMENT ON COLUMN requests.payment_status IS
  'Estado do pagamento Stripe: pending | authorized | captured | refunded | failed. NULL enquanto não iniciado.';

COMMENT ON COLUMN requests.payment_intent_id IS
  'PaymentIntent ID do Stripe (pi_xxx). UNIQUE. Usado para reconciliação e webhooks.';

COMMENT ON COLUMN requests.payment_captured_at IS
  'Timestamp de captura da cobrança no Stripe. NULL enquanto não capturado.';

COMMENT ON COLUMN requests.payment_amount IS
  'Valor cobrado em BRL (NUMERIC 10,2). Deve coincidir com price_final para auditoria.';

COMMENT ON COLUMN requests.payment_error IS
  'Mensagem de erro do Stripe em caso de falha. Uso interno — não exibir ao cliente.';
