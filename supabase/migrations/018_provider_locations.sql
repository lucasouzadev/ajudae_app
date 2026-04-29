-- Migration: 018_provider_locations.sql
--
-- Cria tabelas de infraestrutura geográfica para o mapa.
-- Phase 1: tabelas criadas, dados populados quando prestador fica online.
-- Phase 2: tracking em tempo real com amostragem de posição.

-- ============================================================
-- TABELA: provider_locations
-- Última posição conhecida de cada prestador.
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_locations (
  provider_id   uuid PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  lat           numeric(10,7) NOT NULL,
  lng           numeric(10,7) NOT NULL,
  heading       numeric(5,2),
  accuracy_m    numeric(8,2),
  captured_at   timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL DEFAULT 'gps'
    CHECK (source IN ('gps', 'manual', 'system'))
);

-- ============================================================
-- TABELA: provider_dispatch_state
-- Estado operacional atual do prestador (para dispatch futuro).
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_dispatch_state (
  provider_id        uuid PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  is_online          boolean NOT NULL DEFAULT false,
  is_available       boolean NOT NULL DEFAULT true,
  current_request_id uuid REFERENCES requests(id),
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  last_lat           numeric(10,7),
  last_lng           numeric(10,7)
);

-- ============================================================
-- RLS — provider_locations
-- ============================================================
ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_locations_select" ON public.provider_locations;
CREATE POLICY "provider_locations_select"
  ON public.provider_locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "provider_locations_insert" ON public.provider_locations;
CREATE POLICY "provider_locations_insert"
  ON public.provider_locations FOR INSERT
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "provider_locations_update" ON public.provider_locations;
CREATE POLICY "provider_locations_update"
  ON public.provider_locations FOR UPDATE
  USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "provider_locations_delete" ON public.provider_locations;
CREATE POLICY "provider_locations_delete"
  ON public.provider_locations FOR DELETE
  USING (provider_id = auth.uid() OR is_admin());

-- ============================================================
-- RLS — provider_dispatch_state
-- ============================================================
ALTER TABLE public.provider_dispatch_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_dispatch_state_select" ON public.provider_dispatch_state;
CREATE POLICY "provider_dispatch_state_select"
  ON public.provider_dispatch_state FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "provider_dispatch_state_insert" ON public.provider_dispatch_state;
CREATE POLICY "provider_dispatch_state_insert"
  ON public.provider_dispatch_state FOR INSERT
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "provider_dispatch_state_update" ON public.provider_dispatch_state;
CREATE POLICY "provider_dispatch_state_update"
  ON public.provider_dispatch_state FOR UPDATE
  USING (provider_id = auth.uid());

COMMENT ON TABLE public.provider_locations IS
  'Última posição conhecida de cada prestador. Atualizada quando o prestador '
  'fica online. Phase 2: tracking periódico em deslocamento ativo.';

COMMENT ON TABLE public.provider_dispatch_state IS
  'Estado operacional do prestador para o sistema de dispatch futuro.';
