-- Migration: 023_add_entrega_category_and_cpf.sql
-- 1. Adiciona categoria "Entrega" usada pelo app mobile
-- 2. Adiciona coluna cpf em profiles para clientes

INSERT INTO categories (name, description) VALUES
  ('Entrega', 'Entrega de itens e encomendas')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text;
