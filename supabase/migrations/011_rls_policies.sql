-- RLS Policies — Ajudaê
-- Depende: 010_auth_helpers.sql (auth_role, is_admin, is_active_provider)
-- Edge Functions usam service_role e bypassam este RLS intencionalmente.
-- Nunca expor SUPABASE_SERVICE_ROLE_KEY no frontend.
--
-- Padrão de idempotência: DROP POLICY IF EXISTS antes de CREATE POLICY,
-- pois CREATE POLICY não suporta IF NOT EXISTS nem OR REPLACE no PostgreSQL.

-- ============================================================
-- PROFILES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE
  USING (is_admin());

-- ============================================================
-- PROVIDERS
-- ============================================================

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers_select" ON public.providers;
CREATE POLICY "providers_select"
  ON public.providers FOR SELECT
  USING (
    (verified = true AND active = true)
    OR id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "providers_update" ON public.providers;
CREATE POLICY "providers_update"
  ON public.providers FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (
    CASE
      WHEN is_admin() THEN true
      ELSE id = auth.uid()
    END
  );

DROP POLICY IF EXISTS "providers_insert" ON public.providers;
CREATE POLICY "providers_insert"
  ON public.providers FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "providers_delete" ON public.providers;
CREATE POLICY "providers_delete"
  ON public.providers FOR DELETE
  USING (is_admin());

-- ============================================================
-- PROVIDER_CATEGORIES
-- ============================================================

ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_categories_select" ON public.provider_categories;
CREATE POLICY "provider_categories_select"
  ON public.provider_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "provider_categories_insert" ON public.provider_categories;
CREATE POLICY "provider_categories_insert"
  ON public.provider_categories FOR INSERT
  WITH CHECK (provider_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "provider_categories_update" ON public.provider_categories;
CREATE POLICY "provider_categories_update"
  ON public.provider_categories FOR UPDATE
  USING (provider_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "provider_categories_delete" ON public.provider_categories;
CREATE POLICY "provider_categories_delete"
  ON public.provider_categories FOR DELETE
  USING (provider_id = auth.uid() OR is_admin());

-- ============================================================
-- CATEGORIES
-- ============================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select"
  ON public.categories FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "categories_insert" ON public.categories;
CREATE POLICY "categories_insert"
  ON public.categories FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "categories_update" ON public.categories;
CREATE POLICY "categories_update"
  ON public.categories FOR UPDATE
  USING (is_admin());

-- ============================================================
-- REQUESTS  ← tabela mais crítica
-- ============================================================

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select" ON public.requests;
CREATE POLICY "requests_select"
  ON public.requests FOR SELECT
  USING (
    client_id = auth.uid()
    OR provider_id = auth.uid()
    OR (status = 'requested' AND auth_role() = 'provider')
    OR is_admin()
  );

DROP POLICY IF EXISTS "requests_insert" ON public.requests;
CREATE POLICY "requests_insert"
  ON public.requests FOR INSERT
  WITH CHECK (
    client_id = auth.uid() AND auth_role() = 'client'
  );

DROP POLICY IF EXISTS "requests_update" ON public.requests;
CREATE POLICY "requests_update"
  ON public.requests FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "requests_delete" ON public.requests;
CREATE POLICY "requests_delete"
  ON public.requests FOR DELETE
  USING (false);

-- ============================================================
-- REQUEST_EVENTS  ← append-only, auditoria
-- ============================================================

ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_events_select" ON public.request_events;
CREATE POLICY "request_events_select"
  ON public.request_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_events.request_id
        AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
    )
    OR is_admin()
  );

DROP POLICY IF EXISTS "request_events_insert" ON public.request_events;
CREATE POLICY "request_events_insert"
  ON public.request_events FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "request_events_update" ON public.request_events;
CREATE POLICY "request_events_update"
  ON public.request_events FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "request_events_delete" ON public.request_events;
CREATE POLICY "request_events_delete"
  ON public.request_events FOR DELETE
  USING (false);

-- ============================================================
-- TICKETS
-- ============================================================

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select"
  ON public.tickets FOR SELECT
  USING (
    opened_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = tickets.request_id
        AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
    )
    OR is_admin()
  );

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
CREATE POLICY "tickets_insert"
  ON public.tickets FOR INSERT
  WITH CHECK (
    opened_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
        AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
CREATE POLICY "tickets_update"
  ON public.tickets FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;
CREATE POLICY "tickets_delete"
  ON public.tickets FOR DELETE
  USING (false);

-- ============================================================
-- RATINGS
-- ============================================================

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select" ON public.ratings;
CREATE POLICY "ratings_select"
  ON public.ratings FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ratings_insert" ON public.ratings;
CREATE POLICY "ratings_insert"
  ON public.ratings FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = ratings.request_id
        AND r.client_id = auth.uid()
        AND r.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "ratings_update" ON public.ratings;
CREATE POLICY "ratings_update"
  ON public.ratings FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "ratings_delete" ON public.ratings;
CREATE POLICY "ratings_delete"
  ON public.ratings FOR DELETE
  USING (false);

-- ============================================================
-- QUICK_MESSAGES
-- ============================================================

ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quick_messages_select" ON public.quick_messages;
CREATE POLICY "quick_messages_select"
  ON public.quick_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = quick_messages.request_id
        AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
    )
    OR is_admin()
  );

DROP POLICY IF EXISTS "quick_messages_insert" ON public.quick_messages;
CREATE POLICY "quick_messages_insert"
  ON public.quick_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
        AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
        AND r.status IN ('accepted', 'en_route', 'in_progress')
    )
  );

DROP POLICY IF EXISTS "quick_messages_update" ON public.quick_messages;
CREATE POLICY "quick_messages_update"
  ON public.quick_messages FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "quick_messages_delete" ON public.quick_messages;
CREATE POLICY "quick_messages_delete"
  ON public.quick_messages FOR DELETE
  USING (false);
