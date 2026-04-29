-- Migration: 017_handle_new_user_role.sql
-- Updates handle_new_user() to read role from auth metadata.
-- When a user signs up, the frontend passes { data: { role: 'client' | 'provider' } }
-- via supabase.auth.signUp({ options: { data: { role } } }).
-- This migration replaces the hardcoded 'client' default with a metadata read.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role user_role;
BEGIN
  BEGIN
    requested_role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    requested_role := 'client';
  END;

  IF requested_role IS NULL THEN
    requested_role := 'client';
  END IF;

  -- Security: admin role cannot be self-assigned via signup
  IF requested_role = 'admin' THEN
    requested_role := 'client';
  END IF;

  INSERT INTO public.profiles (id, role, name)
  VALUES (
    NEW.id,
    requested_role,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
