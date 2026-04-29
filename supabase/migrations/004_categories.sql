CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO categories (name, description) VALUES
  ('Frete', 'Transporte de itens e cargas em geral'),
  ('Mudança', 'Mudança residencial ou comercial'),
  ('Carreto', 'Carreto de pequeno porte')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS provider_categories (
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  price_base numeric(10,2),
  PRIMARY KEY (provider_id, category_id)
);
