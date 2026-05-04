CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role user_role;
  submitted_phone text;
  submitted_cpf text;
BEGIN
  BEGIN
    requested_role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    requested_role := 'client';
  END;

  IF requested_role IS NULL THEN
    requested_role := 'client';
  END IF;

  IF requested_role = 'admin' THEN
    requested_role := 'client';
  END IF;

  submitted_phone := NULLIF(trim(NEW.raw_user_meta_data->>'phone'), '');
  submitted_cpf := NULLIF(trim(NEW.raw_user_meta_data->>'cpf'), '');

  INSERT INTO public.profiles (id, role, name, phone, cpf)
  VALUES (
    NEW.id,
    requested_role,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), 'Usuário'),
    submitted_phone,
    submitted_cpf
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf);

  IF requested_role = 'provider' THEN
    INSERT INTO public.providers (id, cpf, verified, active, onboarding_status)
    VALUES (NEW.id, submitted_cpf, false, false, 'incomplete')
    ON CONFLICT (id) DO UPDATE
    SET cpf = COALESCE(EXCLUDED.cpf, public.providers.cpf);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
