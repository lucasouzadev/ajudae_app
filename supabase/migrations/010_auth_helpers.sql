-- Helpers de autenticação e role
-- Usados pelas RLS policies em todas as tabelas.
-- Fonte de verdade do role: profiles.role via auth.uid().
-- JWT/app_metadata são apoio, não substituem essa leitura.

-- Retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth;

-- Verifica se o usuário autenticado é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth;

-- Verifica se o usuário autenticado é prestador verificado e ativo
CREATE OR REPLACE FUNCTION is_active_provider()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = auth.uid() AND verified = true AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth;
