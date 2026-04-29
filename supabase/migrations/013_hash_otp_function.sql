-- Função auxiliar para hash seguro do OTP via pgcrypto.
-- Chamada pela Edge Function request_create via RPC.
-- Mantém o hash dentro do banco — nunca processado fora do PostgreSQL.

CREATE OR REPLACE FUNCTION hash_otp(otp_plain text)
RETURNS text AS $$
  SELECT crypt(otp_plain, gen_salt('bf'));
$$ LANGUAGE sql SECURITY DEFINER SET search_path = extensions, public;

-- Permissão de execução para o service_role (chamada via Edge Function)
GRANT EXECUTE ON FUNCTION hash_otp(text) TO service_role;
