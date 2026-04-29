-- Migration: 016_fix_request_events_to_status.sql
--
-- PROBLEMA: request_events.to_status foi definido como request_status (enum)
-- na migration 006, mas a Edge Function request_complete_with_otp insere
-- o valor 'otp_failed' para registrar tentativas inválidas de OTP.
-- 'otp_failed' não é um estado válido do enum request_status — é um
-- evento de auditoria interno, não uma transição de status real.
--
-- SOLUÇÃO: alterar to_status de request_status para TEXT, mantendo
-- a semântica mas aceitando valores de auditoria como 'otp_failed'.
-- from_status permanece como enum pois sempre reflete um estado real anterior.
--
-- IMPACTO: nenhum dado é perdido. TEXT aceita todos os valores do enum.
-- A migration 006 já foi corrigida para fresh installs — esta migration
-- aplica a correção em bancos de dados existentes.

ALTER TABLE public.request_events
  ALTER COLUMN to_status TYPE TEXT;

COMMENT ON COLUMN public.request_events.to_status IS
  'Estado de destino da transição. Usa TEXT (não enum) para permitir valores '
  'de auditoria internos como ''otp_failed'' que não são estados válidos do pedido.';
