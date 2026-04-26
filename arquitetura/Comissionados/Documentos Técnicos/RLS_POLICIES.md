# RLS_POLICIES.md — Ajudaê

> Row Level Security garante que nenhum usuário acesse ou modifique dados que não são dele.
> **Regra crítica:** Toda transição de status crítica deve passar por Edge Function, não por RLS direto.
> **Regra:** Nenhum membro altera policies sem revisão do Tech Lead (Sócio 1).

---

## Como aplicar no Supabase

1. Habilitar RLS em cada tabela: `ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;`
2. Criar as policies abaixo
3. Testar impersonando cada role antes de ir para produção
4. Edge Functions usam `service_role` key — bypassam RLS intencionalmente

---

## Helpers reutilizáveis

> **Fonte de verdade do role:** `profiles.role`. Helpers e policies devem ler o role do banco via `auth.uid()`. JWT/app_metadata não substituem essa leitura.

```sql
-- Retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário é prestador verificado e ativo
CREATE OR REPLACE FUNCTION is_active_provider()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM providers
    WHERE id = auth.uid() AND verified = true AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## Tabela: `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Leitura: cada usuário vê apenas o próprio perfil; admin vê todos
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR is_admin()
  );

-- Update: cada usuário edita apenas o próprio perfil; admin edita qualquer um
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

-- Insert: apenas via trigger (handle_new_user). Usuários comuns não inserem diretamente.
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  WITH CHECK (false);  -- bloqueado; apenas service_role (trigger) insere

-- Delete: apenas admin (soft delete preferível)
CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE
  USING (is_admin());
```

---

## Tabela: `providers`

```sql
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Leitura pública: clientes veem apenas prestadores verificados e ativos
-- Prestador vê o próprio perfil independente do status
-- Admin vê todos
CREATE POLICY "providers_select"
  ON providers FOR SELECT
  USING (
    (verified = true AND active = true)  -- visível para clientes
    OR id = auth.uid()                   -- prestador vê o próprio
    OR is_admin()
  );

-- Update: prestador edita o próprio; admin edita qualquer um
-- IMPORTANTE: campos 'verified' só podem ser alterados pelo admin
CREATE POLICY "providers_update"
  ON providers FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (
    CASE
      WHEN is_admin() THEN true
      ELSE id = auth.uid()
        -- Prestador não pode alterar 'verified' nem 'rating_avg'
        -- Essa restrição é reforçada na Edge Function de update
    END
  );

-- Insert: apenas o próprio usuário cria seu perfil de prestador
CREATE POLICY "providers_insert"
  ON providers FOR INSERT
  WITH CHECK (id = auth.uid());

-- Delete: apenas admin
CREATE POLICY "providers_delete"
  ON providers FOR DELETE
  USING (is_admin());
```

---

## Tabela: `provider_categories`

```sql
ALTER TABLE provider_categories ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado pode ver (para a busca funcionar)
CREATE POLICY "provider_categories_select"
  ON provider_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert/Update/Delete: apenas o próprio prestador ou admin
CREATE POLICY "provider_categories_insert"
  ON provider_categories FOR INSERT
  WITH CHECK (provider_id = auth.uid() OR is_admin());

CREATE POLICY "provider_categories_update"
  ON provider_categories FOR UPDATE
  USING (provider_id = auth.uid() OR is_admin());

CREATE POLICY "provider_categories_delete"
  ON provider_categories FOR DELETE
  USING (provider_id = auth.uid() OR is_admin());
```

---

## Tabela: `categories`

```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado vê categorias ativas
CREATE POLICY "categories_select"
  ON categories FOR SELECT
  USING (active = true OR is_admin());

-- Escrita: apenas admin
CREATE POLICY "categories_insert"
  ON categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "categories_update"
  ON categories FOR UPDATE
  USING (is_admin());
```

---

## Tabela: `requests`

> Esta é a tabela mais crítica. Atenção máxima.

```sql
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Leitura:
-- Cliente vê os próprios pedidos
-- Prestador vê pedidos atribuídos a ele + pedidos 'requested' (para aceitar)
-- Admin vê todos
CREATE POLICY "requests_select"
  ON requests FOR SELECT
  USING (
    client_id = auth.uid()
    OR provider_id = auth.uid()
    OR (status = 'requested' AND auth_role() = 'provider')
    OR is_admin()
  );

-- Insert: apenas clientes criam pedidos (via Edge Function request_create)
-- A Edge Function valida e insere com service_role
-- Esta policy é uma camada extra de proteção
CREATE POLICY "requests_insert"
  ON requests FOR INSERT
  WITH CHECK (
    client_id = auth.uid() AND auth_role() = 'client'
  );

-- Update: BLOQUEADO para usuários comuns
-- Toda atualização de status passa pela Edge Function com service_role
-- Apenas admin pode fazer update direto (emergências operacionais)
CREATE POLICY "requests_update"
  ON requests FOR UPDATE
  USING (is_admin());

-- Delete: NUNCA deletar pedidos — apenas admin em casos extremos
CREATE POLICY "requests_delete"
  ON requests FOR DELETE
  USING (false);  -- ninguém deleta requests
```

---

## Tabela: `request_events`

> Tabela de auditoria. Append-only. Ninguém atualiza ou deleta.

```sql
ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;

-- Leitura: cliente e prestador do pedido; admin vê tudo
CREATE POLICY "request_events_select"
  ON request_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_events.request_id
      AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
    )
    OR is_admin()
  );

-- Insert: apenas via Edge Function (service_role). Usuários não inserem diretamente.
CREATE POLICY "request_events_insert"
  ON request_events FOR INSERT
  WITH CHECK (false);

-- Update e Delete: NUNCA
CREATE POLICY "request_events_update"
  ON request_events FOR UPDATE
  USING (false);

CREATE POLICY "request_events_delete"
  ON request_events FOR DELETE
  USING (false);
```

---

## Tabela: `tickets`

```sql
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Leitura: quem abriu ou está no pedido relacionado; admin vê tudo
CREATE POLICY "tickets_select"
  ON tickets FOR SELECT
  USING (
    opened_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = tickets.request_id
      AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
    )
    OR is_admin()
  );

-- Insert: cliente ou prestador envolvido no pedido
CREATE POLICY "tickets_insert"
  ON tickets FOR INSERT
  WITH CHECK (
    opened_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_id
      AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
    )
  );

-- Update: apenas admin (para resolver tickets)
CREATE POLICY "tickets_update"
  ON tickets FOR UPDATE
  USING (is_admin());

-- Delete: ninguém
CREATE POLICY "tickets_delete"
  ON tickets FOR DELETE
  USING (false);
```

---

## Tabela: `ratings`

```sql
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Leitura: todos os autenticados veem avaliações (para exibir no perfil do prestador)
CREATE POLICY "ratings_select"
  ON ratings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert: apenas o cliente do pedido, após status = 'completed'
CREATE POLICY "ratings_insert"
  ON ratings FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = ratings.request_id
      AND r.client_id = auth.uid()
      AND r.status = 'completed'
    )
  );

-- Update e Delete: ninguém (avaliação é imutável)
CREATE POLICY "ratings_update"
  ON ratings FOR UPDATE
  USING (false);

CREATE POLICY "ratings_delete"
  ON ratings FOR DELETE
  USING (false);
```

---

## Tabela: `quick_messages`

```sql
ALTER TABLE quick_messages ENABLE ROW LEVEL SECURITY;

-- Leitura: partes envolvidas no pedido
CREATE POLICY "quick_messages_select"
  ON quick_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = quick_messages.request_id
      AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
    )
    OR is_admin()
  );

-- Insert: apenas quem está no pedido e ele está em status ativo
CREATE POLICY "quick_messages_insert"
  ON quick_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_id
      AND (r.client_id = auth.uid() OR r.provider_id = auth.uid())
      AND r.status IN ('accepted', 'en_route', 'in_progress')
    )
  );

-- Update e Delete: ninguém
CREATE POLICY "quick_messages_update"
  ON quick_messages FOR UPDATE
  USING (false);

CREATE POLICY "quick_messages_delete"
  ON quick_messages FOR DELETE
  USING (false);
```

---

## Checklist de Validação (antes de ir para produção)

Execute estes testes impersonando cada role no Supabase Dashboard:

### Como testar no Supabase

```sql
-- Testar como cliente
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "UUID_DO_CLIENTE", "role": "authenticated"}';

-- Testar como prestador
SET LOCAL request.jwt.claims = '{"sub": "UUID_DO_PRESTADOR", "role": "authenticated"}';
```

### Cenários obrigatórios a testar

| Cenário                                                    | Resultado Esperado                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| Cliente tenta ver pedido de outro cliente                  | ❌ Bloqueado                                               |
| Prestador tenta ver pedido não atribuído e não 'requested' | ❌ Bloqueado                                               |
| Prestador tenta alterar status diretamente em `requests`   | ❌ Bloqueado                                               |
| Cliente tenta inserir em `request_events`                  | ❌ Bloqueado                                               |
| Admin consegue ver qualquer pedido                         | ✅ Permitido                                               |
| Cliente cria avaliação sem pedido `completed`              | ❌ Bloqueado                                               |
| Prestador não verificado aparece na busca                  | ❌ Não aparece                                             |
| `notes_admin` do ticket visível para cliente               | ❌ Bloqueado (campo retornado mas policy de select limita) |

---

## Notas Importantes

- **Edge Functions usam `service_role`**: elas bypassam RLS. Por isso as regras de negócio dentro delas devem ser rigorosas.
- **Nunca expor a `service_role` key no frontend.**
- **Testar RLS a cada migration nova** que adicione tabelas ou colunas sensíveis.
- **`notes_admin`** em tickets: considerar uma view sem essa coluna para expor ao cliente/prestador, ao invés de confiar apenas no SELECT policy.
