-- 014_verify_otp_function.sql
--
-- Função de verificação do OTP usando pgcrypto.
--
-- A verificação funciona assim:
--   crypt(otp_plain, otp_hash) → reproduz o hash usando o salt embutido
--   Se o resultado for igual ao hash armazenado, o OTP é válido.
--
-- NOTA DE SEGURANÇA:
--   - search_path = extensions, public garante que crypt() seja encontrado
--     (pgcrypto está na schema 'extensions' no Supabase)
--   - SECURITY DEFINER: a função roda com privilégios do owner (postgres),
--     não do chamador — necessário para acessar a extensão
--   - GRANT somente para service_role: apenas Edge Functions chamam esta função
--
-- Dependência: migration 013 (hash_otp_function.sql) — pgcrypto já habilitado

CREATE OR REPLACE FUNCTION verify_otp(otp_plain text, otp_hash text)
RETURNS boolean AS $$
  SELECT crypt(otp_plain, otp_hash) = otp_hash;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = extensions, public;

GRANT EXECUTE ON FUNCTION verify_otp(text, text) TO service_role;
