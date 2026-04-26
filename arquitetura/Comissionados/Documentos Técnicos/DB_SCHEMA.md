# DB_SCHEMA.md — Ajudaê

> Fonte de verdade do banco de dados. Toda migration deve ser versionada em `/supabase/migrations/`.
> **Regra:** Nenhum membro da equipe altera o schema sem revisão e aprovação do Tech Lead (Sócio 1).

---

## Stack

- **Banco:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth (`auth.users`)
- **Extensões necessárias:** `uuid-ossp`, `pgcrypto`

---

## Notas de Alinhamento

- **Fonte de verdade do role:** `profiles.role`. Dados extras em JWT/app_metadata podem existir, mas não substituem a leitura do banco.
- **Tentativas de OTP:** o schema atual não possui coluna `otp_attempts` em `requests`. No MVP, persistir tentativas em `request_events.meta` ou criar migration nova antes de introduzir coluna dedicada.
- **Pagamentos:** o schema atual não possui `payment_status` nem campos correlatos. Qualquer fluxo de Stripe / Link exige migration nova antes da implementação.

---

## Convenções

| Convenção       | Padrão                                             |
| --------------- | -------------------------------------------------- |
| Nomes de tabela | `snake_case`, plural                               |
| PKs             | `uuid` gerado por `gen_random_uuid()`              |
| Timestamps      | `timestamptz`, sempre UTC                          |
| Enums           | definidos como `TYPE` no Postgres                  |
| Soft delete     | coluna `deleted_at timestamptz` (quando aplicável) |

## Migration 001 — Extensões e Enums

```sql
-- 001_extensions_and_enums.sql

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles de usuário
CREATE TYPE user_role AS ENUM ('client', 'provider', 'admin');

-- Status do pedido (máquina de estados)
CREATE TYPE request_status AS ENUM (
  'requested',    -- criado pelo cliente, aguardando aceite
  'accepted',     -- prestador aceitou
  'en_route',     -- prestador a caminho
  'in_progress',  -- serviço em execução
  'completed',    -- concluído com OTP confirmado
  'cancelled',    -- cancelado com motivo
  'expired',      -- nenhum prestador aceitou no prazo
  'disputed'      -- entrou em ticket/disputa
);

-- Motivos de cancelamento
CREATE TYPE cancel_reason AS ENUM (
  'client_gave_up',
  'provider_unavailable',
  'wrong_address',
  'price_disagreement',
  'no_show',
  'other'
);

-- Status do ticket
CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_review',
  'resolved',
  'closed'
);

-- Tipo de veículo
CREATE TYPE vehicle_type AS ENUM (
  'car',
  'utility',
  'van',
  'truck_small',
  'truck_large'
);
```

---

## Migration 002 — Perfis e Usuários

```sql
-- 002_profiles.sql

-- Perfil base (espelha auth.users)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'client',
  name        text NOT NULL,
  phone       text,
  avatar_url  text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, name)
  VALUES (
    NEW.id,
    'client',
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Migration 003 — Prestadores

```sql
-- 003_providers.sql

CREATE TABLE providers (
  id                  uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  verified            boolean NOT NULL DEFAULT false,  -- aprovação manual pelo admin
  active              boolean NOT NULL DEFAULT false,  -- online/offline (o prestador controla)
  bio                 text,
  service_radius_km   numeric(5,2) NOT NULL DEFAULT 5.0,
  location_lat        numeric(10,7),
  location_lng        numeric(10,7),
  location_updated_at timestamptz,
  vehicle_type        vehicle_type,
  vehicle_plate       text,
  vehicle_capacity_kg numeric(8,2),
  rating_avg          numeric(3,2) NOT NULL DEFAULT 0.0,
  rating_count        integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índice para buscas por proximidade
CREATE INDEX idx_providers_location ON providers (location_lat, location_lng)
  WHERE verified = true AND active = true;
```

---

## Migration 004 — Categorias e Relação Prestador-Categoria

```sql
-- 004_categories.sql

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  icon_url    text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Categorias iniciais do MVP
INSERT INTO categories (name, description) VALUES
  ('Frete',    'Transporte de itens e cargas em geral'),
  ('Mudança',  'Mudança residencial ou comercial'),
  ('Carreto',  'Carreto de pequeno porte');

-- Relação N:N prestador <-> categoria
CREATE TABLE provider_categories (
  provider_id  uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  price_base   numeric(10,2),  -- preço base opcional do prestador para esta categoria
  PRIMARY KEY (provider_id, category_id)
);
```

---

## Migration 005 — Pedidos (Requests)

```sql
-- 005_requests.sql

CREATE TABLE requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES profiles(id),
  provider_id     uuid REFERENCES providers(id),  -- NULL até ser aceito
  category_id     uuid NOT NULL REFERENCES categories(id),
  status          request_status NOT NULL DEFAULT 'requested',

  -- Endereço e localização
  address_origin  text NOT NULL,
  address_dest    text,
  origin_lat      numeric(10,7),
  origin_lng      numeric(10,7),
  dest_lat        numeric(10,7),
  dest_lng        numeric(10,7),

  -- Detalhes do serviço
  description     text,
  media_urls      jsonb DEFAULT '[]',  -- array de URLs do Storage
  needs_helper    boolean NOT NULL DEFAULT false,
  scheduled_for   timestamptz,         -- NULL = imediato

  -- Financeiro
  price_estimated numeric(10,2),
  price_final     numeric(10,2),
  platform_fee    numeric(10,2),       -- calculado na conclusão

  -- Segurança / Anti-fraude
  otp_code_hash   text,                -- hash do PIN de conclusão
  otp_expires_at  timestamptz,

  -- Cancelamento
  cancel_reason   cancel_reason,
  cancel_note     text,
  cancelled_by    uuid REFERENCES profiles(id),

  -- Expiração automática
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices
CREATE INDEX idx_requests_client    ON requests (client_id, status);
CREATE INDEX idx_requests_provider  ON requests (provider_id, status);
CREATE INDEX idx_requests_status    ON requests (status, created_at);
CREATE INDEX idx_requests_expires   ON requests (expires_at) WHERE status = 'requested';
```

---

## Migration 006 — Eventos de Pedido (Auditoria)

```sql
-- 006_request_events.sql

-- Log imutável de todas as transições de estado
-- NUNCA deletar ou atualizar registros desta tabela
CREATE TABLE request_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES profiles(id),  -- NULL em transições automáticas do sistema (ex: expired)
  from_status  request_status,
  to_status    request_status NOT NULL,
  meta         jsonb DEFAULT '{}',  -- dados extras: motivo, OTP hash, etc.
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Índice para consulta por pedido
CREATE INDEX idx_request_events_request ON request_events (request_id, created_at);

-- Índice para auditoria por ator
CREATE INDEX idx_request_events_actor ON request_events (actor_id, created_at);
```

---

## Migration 007 — Tickets

```sql
-- 007_tickets.sql

CREATE TABLE tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL REFERENCES requests(id),
  opened_by    uuid NOT NULL REFERENCES profiles(id),
  status       ticket_status NOT NULL DEFAULT 'open',
  reason       text NOT NULL,
  description  text,
  media_urls   jsonb DEFAULT '[]',

  -- Resolução (preenchido pelo admin)
  resolved_by  uuid REFERENCES profiles(id),
  resolution   text,
  notes_admin  text,  -- notas internas, não visíveis ao usuário

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_tickets_request ON tickets (request_id);
CREATE INDEX idx_tickets_status  ON tickets (status, created_at);
```

---

## Migration 008 — Avaliações

```sql
-- 008_ratings.sql

CREATE TABLE ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL UNIQUE REFERENCES requests(id),  -- 1 avaliação por pedido
  client_id   uuid NOT NULL REFERENCES profiles(id),
  provider_id uuid NOT NULL REFERENCES providers(id),
  stars       smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ratings_provider ON ratings (provider_id, created_at);

-- Atualizar média do prestador após nova avaliação
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE providers
  SET
    rating_avg   = (SELECT AVG(stars) FROM ratings WHERE provider_id = NEW.provider_id),
    rating_count = (SELECT COUNT(*)   FROM ratings WHERE provider_id = NEW.provider_id)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_rating_insert
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_provider_rating();
```

---

## Migration 009 — Mensagens Rápidas

```sql
-- 009_quick_messages.sql
-- Sem chat livre. Apenas mensagens pré-definidas durante o serviço.

CREATE TABLE quick_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES profiles(id),
  message     text NOT NULL,  -- valor pré-definido (ex: "Estou a caminho")
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quick_messages_request ON quick_messages (request_id, created_at);

-- Mensagens pré-definidas (referência para o frontend)
-- O frontend só permite enviar estas opções:
-- "Estou a caminho"
-- "Atrasarei aproximadamente X minutos"
-- "Cheguei ao local"
-- "Não encontrei o endereço"
-- "Serviço iniciado"
-- "Serviço concluído, aguardando PIN"
```

---

## Diagrama de Relacionamentos (resumo)

```
auth.users
    │
    └──► profiles (1:1)
              │
              ├──► providers (1:1, se role = 'provider')
              │         │
              │         └──► provider_categories (N:N)
              │                     │
              │               categories
              │
              ├──► requests (client_id)
              │         │
              │         ├──► request_events (auditoria)
              │         ├──► tickets
              │         ├──► ratings
              │         └──► quick_messages
              │
              └──► [actor em request_events; pode ser NULL em ações do sistema]
```

---

## Máquina de Estados do Pedido

```
                    ┌─────────────┐
                    │  requested  │──── expires_at ───► expired
                    └──────┬──────┘
                           │ prestador aceita
                    ┌──────▼──────┐
                    │  accepted   │
                    └──────┬──────┘
                           │ prestador parte
                    ┌──────▼──────┐
                    │  en_route   │
                    └──────┬──────┘
                           │ prestador chegou
                    ┌──────▼──────┐
                    │ in_progress │
                    └──────┬──────┘
                           │ OTP validado
                    ┌──────▼──────┐
                    │  completed  │
                    └─────────────┘

Em qualquer estado (antes de completed):
  → cancelled  (com motivo)
  → disputed   (ticket aberto)
```

---

## Transições Válidas (para as Edge Functions)

| De                     | Para          | Quem pode                 |
| ---------------------- | ------------- | ------------------------- |
| `requested`            | `accepted`    | provider                  |
| `requested`            | `cancelled`   | client, provider, admin   |
| `requested`            | `expired`     | sistema (cron)            |
| `accepted`             | `en_route`    | provider                  |
| `accepted`             | `cancelled`   | client, provider, admin   |
| `en_route`             | `in_progress` | provider                  |
| `en_route`             | `cancelled`   | admin                     |
| `in_progress`          | `completed`   | provider (com OTP válido) |
| `in_progress`          | `disputed`    | client, admin             |
| `*` (exceto completed) | `disputed`    | client, admin             |

---

## Notas de Segurança

- `otp_code_hash`: nunca armazenar o OTP em texto plano. Usar `crypt(otp, gen_salt('bf'))` do pgcrypto.
- `media_urls`: validar tipo/tamanho no Storage antes de salvar a URL.
- `request_events`: a tabela é append-only. `actor_id` pode ser `NULL` apenas em transições automáticas do sistema. Adicionar policy de `NO UPDATE, NO DELETE` via RLS.
- `notes_admin` em tickets: never expor via RLS para client ou provider.
