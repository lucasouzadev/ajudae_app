ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'light'
    CHECK (theme_mode IN ('light', 'dark')),
  ADD COLUMN IF NOT EXISTS app_language text NOT NULL DEFAULT 'pt-BR'
    CHECK (app_language IN ('pt-BR', 'en-US', 'es-ES')),
  ADD COLUMN IF NOT EXISTS background_tracking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{"orders": true, "messages": true, "payments": true, "account": true, "marketing": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS expo_push_token text,
  ADD COLUMN IF NOT EXISTS push_token_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.normalize_cpf_text(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(value, ''), '\D', '', 'g')
$$;

CREATE OR REPLACE FUNCTION public.assert_unique_identity_cpf()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  normalized text;
  conflict_id uuid;
BEGIN
  normalized := public.normalize_cpf_text(NEW.cpf);

  IF normalized = '' THEN
    RETURN NEW;
  END IF;

  SELECT p.id
    INTO conflict_id
    FROM public.profiles p
   WHERE p.id <> NEW.id
     AND public.normalize_cpf_text(p.cpf) = normalized
   LIMIT 1;

  IF conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'CPF já utilizado por outra conta'
      USING ERRCODE = '23505';
  END IF;

  SELECT p.id
    INTO conflict_id
    FROM public.providers p
   WHERE p.id <> NEW.id
     AND public.normalize_cpf_text(p.cpf) = normalized
   LIMIT 1;

  IF conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'CPF já utilizado por outra conta'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_unique_cpf_guard ON public.profiles;
CREATE TRIGGER profiles_unique_cpf_guard
  BEFORE INSERT OR UPDATE OF cpf ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_unique_identity_cpf();

DROP TRIGGER IF EXISTS providers_unique_cpf_guard ON public.providers;
CREATE TRIGGER providers_unique_cpf_guard
  BEFORE INSERT OR UPDATE OF cpf ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_unique_identity_cpf();

CREATE INDEX IF NOT EXISTS idx_profiles_cpf_normalized
  ON public.profiles ((public.normalize_cpf_text(cpf)));

CREATE INDEX IF NOT EXISTS idx_providers_cpf_normalized
  ON public.providers ((public.normalize_cpf_text(cpf)));

COMMENT ON COLUMN public.profiles.theme_mode IS 'Tema salvo pelo usuário no app';
COMMENT ON COLUMN public.profiles.app_language IS 'Idioma salvo pelo usuário no app';
COMMENT ON COLUMN public.profiles.background_tracking_enabled IS 'Preferência do usuário para rastreamento em segundo plano';
COMMENT ON COLUMN public.profiles.notification_preferences IS 'Preferências granulares de notificações do app';
COMMENT ON COLUMN public.profiles.expo_push_token IS 'Push token ativo do dispositivo do usuário';
COMMENT ON COLUMN public.profiles.push_token_updated_at IS 'Última atualização do push token do dispositivo';
