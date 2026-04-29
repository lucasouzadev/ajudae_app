-- Storage Buckets — Ajudaê
-- Cria os 3 buckets e aplica políticas de acesso.
-- Depende: 010_auth_helpers.sql (is_admin)
--
-- Padrão de idempotência:
--   Buckets: ON CONFLICT (id) DO NOTHING
--   Policies: DROP POLICY IF EXISTS antes de CREATE POLICY

-- ============================================================
-- BUCKET: avatars (público)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR is_admin()
    )
  );

-- ============================================================
-- BUCKET: request-media (privado)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-media',
  'request-media',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "request_media_select" ON storage.objects;
CREATE POLICY "request_media_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'request-media'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "request_media_insert" ON storage.objects;
CREATE POLICY "request_media_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'request-media'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "request_media_delete" ON storage.objects;
CREATE POLICY "request_media_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'request-media'
    AND is_admin()
  );

-- ============================================================
-- BUCKET: provider-docs (privado, mais restrito)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-docs',
  'provider-docs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "provider_docs_select" ON storage.objects;
CREATE POLICY "provider_docs_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'provider-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR is_admin()
    )
  );

DROP POLICY IF EXISTS "provider_docs_insert" ON storage.objects;
CREATE POLICY "provider_docs_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "provider_docs_delete" ON storage.objects;
CREATE POLICY "provider_docs_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'provider-docs'
    AND is_admin()
  );
