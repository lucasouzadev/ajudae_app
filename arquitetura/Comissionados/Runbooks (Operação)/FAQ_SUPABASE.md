# FAQ_SUPABASE.md — Ajudaê

> Guia para o COO e time operacional consultarem o Supabase sem precisar do Tech Lead para tudo.
> **Acesso:** Solicite ao Tech Lead seu login no Supabase Dashboard com permissão de leitura.

---

## Acessando o Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Faça login com a conta da equipe (Tech Lead fornece credenciais)
3. Selecione o projeto "Ajudaê"

---

## FAQ — Perguntas Frequentes

---

### "Como vejo os pedidos no banco?"

1. No menu lateral: clique em **Table Editor**
2. Selecione a tabela `requests`
3. Use os filtros no topo para buscar por:
   - `status` = `disputed` (para ver pedidos em disputa)
   - `client_id` = (cole o UUID do cliente)
   - `provider_id` = (cole o UUID do prestador)

**Colunas importantes:**
| Coluna | O que significa |
|---|---|
| `status` | Estado atual do pedido |
| `client_id` | Quem criou o pedido |
| `provider_id` | Quem aceitou |
| `created_at` | Quando foi criado |
| `expires_at` | Quando expira (se ainda em 'requested') |
| `cancel_reason` | Motivo do cancelamento |

---

### "Como vejo o histórico completo de um pedido?"

1. **Table Editor** → tabela `request_events`
2. Filtre por `request_id` = (cole o UUID do pedido)
3. Ordene por `created_at` crescente

Você verá todas as transições de status: quem mudou, quando, e de qual status para qual.

---

### "Como encontro o UUID de um usuário?"

1. No menu lateral: clique em **Authentication**
2. Clique em **Users**
3. Busque pelo e-mail ou telefone
4. O `UUID` está na coluna `id` (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

---

### "Como vejo os tickets abertos?"

1. **Table Editor** → tabela `tickets`
2. Filtre por `status` = `open`
3. Ordene por `created_at` crescente (mais antigos primeiro = prioridade)

---

### "Como vejo os prestadores aguardando aprovação?"

1. **Table Editor** → tabela `providers`
2. Filtre por `verified` = `false`

---

### "Como vejo os logs de erro das Edge Functions?"

1. No menu lateral: clique em **Edge Functions**
2. Clique no nome da função (ex: `request_create`)
3. Clique na aba **Logs**
4. Os erros aparecem em vermelho com timestamp

**O que procurar nos logs:**

- `Error:` — erro na função
- `status: 4xx` — erro do cliente (input inválido)
- `status: 5xx` — erro interno (chamar Tech Lead)

---

### "Como vejo os logs gerais da API?"

1. No menu lateral: clique em **Logs**
2. Selecione **API** no dropdown
3. Filtre por período e/ou busque por texto (ex: nome da tabela ou função)

---

### "Como vejo se o banco está saudável?"

1. No menu lateral: clique em **Reports**
2. Veja:
   - **Database health** — uso de CPU e memória
   - **Query performance** — queries lentas
3. Se algo estiver em vermelho: chame o Tech Lead imediatamente

---

### "Como testo se uma RLS policy está funcionando?"

Isso é tarefa do Tech Lead. Não tente fazer sozinho — uma policy errada pode expor dados de todos os usuários.

---

### "Como aplico uma migration nova?"

Isso é tarefa exclusiva do Tech Lead.

**Nunca clique em "Run" no SQL Editor sem revisão do Tech Lead.**

---

### "O que fazer se o banco der erro 500?"

1. Registre o horário exato do erro
2. Vá em **Logs → Database** e copie as linhas de erro
3. Chame o Tech Lead imediatamente com essas informações

---

## Comandos SQL de consulta seguros (somente leitura)

Você pode rodar estes no **SQL Editor** do Supabase sem risco, pois são apenas consultas:

```sql
-- Ver pedidos dos últimos 7 dias por status
SELECT status, COUNT(*) as total
FROM requests
WHERE created_at > now() - interval '7 days'
GROUP BY status
ORDER BY total DESC;

-- Ver prestadores ativos e verificados
SELECT p.id, pr.name, p.rating_avg, p.rating_count
FROM providers p
JOIN profiles pr ON p.id = pr.id
WHERE p.verified = true AND p.active = true
ORDER BY p.rating_avg DESC;

-- Ver tickets abertos com mais de 4 horas
SELECT t.id, t.reason, t.created_at, pr.name as aberto_por
FROM tickets t
JOIN profiles pr ON t.opened_by = pr.id
WHERE t.status = 'open'
AND t.created_at < now() - interval '4 hours'
ORDER BY t.created_at ASC;

-- Ver timeline completa de um pedido (substitua o UUID)
SELECT from_status, to_status, pr.name as ator, re.created_at, re.meta
FROM request_events re
JOIN profiles pr ON re.actor_id = pr.id
WHERE re.request_id = 'COLE-O-UUID-AQUI'
ORDER BY re.created_at ASC;

-- Pedidos com status antigo (possível travamento)
SELECT id, status, updated_at, client_id, provider_id
FROM requests
WHERE status IN ('accepted', 'en_route', 'in_progress')
AND updated_at < now() - interval '3 hours'
ORDER BY updated_at ASC;
```

**⚠️ NUNCA rode UPDATE, DELETE ou INSERT no SQL Editor sem o Tech Lead.**

---

## Contato para escalada

| Problema                     | Quem chamar                                    |
| ---------------------------- | ---------------------------------------------- |
| Erro 500 no banco            | Tech Lead (urgente)                            |
| Usuário não consegue logar   | Tech Lead                                      |
| Edge Function falhando       | Tech Lead                                      |
| Dúvida em consulta SQL       | Tech Lead                                      |
| Pedido travado (operacional) | Resolver via painel admin (README_OPERACAO.md) |
