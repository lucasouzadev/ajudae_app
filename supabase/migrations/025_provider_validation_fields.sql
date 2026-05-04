ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS service_type text
    CHECK (service_type IN ('frete', 'mudanca', 'entrega')),
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS validation_notes text;

COMMENT ON COLUMN public.providers.service_type IS 'Tipo principal de serviço informado pelo prestador durante validação';
COMMENT ON COLUMN public.providers.service_category IS 'Categoria/subcategoria operacional informada pelo prestador';
COMMENT ON COLUMN public.providers.validation_notes IS 'Informações complementares enviadas pelo prestador na validação';
