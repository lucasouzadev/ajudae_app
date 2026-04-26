# EDGE_FUNCTIONS.md — Ajudaê

> Contrato de cada Edge Function crítica. O Dev 1 implementa com base neste documento.
> **Regra:** Toda lógica de negócio sensível (status, OTP, pagamento) vive aqui, nunca no frontend.
> **Stack:** Supabase Edge Functions (Deno/TypeScript) com `service_role` key.

---

## Padrões Gerais

### Estrutura base de toda função

```typescript
// Toda Edge Function segue este padrão
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // bypass RLS intencional
)

Deno.serve(async (req: Request) => {
  // 1. Autenticar o usuário pelo JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return error(401, 'Não autenticado')

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) return error(401, 'Token inválido')

  // 2. Buscar perfil e role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // 3. Lógica da função...
})

// Helper de resposta
function error(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

### Regra de log de eventos

**Nota de alinhamento:** a fonte de verdade do role continua sendo `profiles.role`, consultado a partir de `auth.uid()`. Dados em JWT/app_metadata não substituem essa verificação.

### Regra de log de eventos

Toda função que altera o status de um pedido **deve** gravar em `request_events`. Em transições automáticas do sistema (por exemplo, expiração automática), `actor_id` pode ser `null`:

```typescript
async function logEvent(
  requestId: string,
  actorId: string | null,
  fromStatus: string | null,
  toStatus: string,
  meta: Record<string, unknown> = {},
) {
  await supabase.from('request_events').insert({
    request_id: requestId,
    actor_id: actorId,
    from_status: fromStatus,
    to_status: toStatus,
    meta,
  })
}
```

---

## Função 1: `request_create`

**Endpoint:** `POST /functions/v1/request_create`
**Quem chama:** Cliente (role: `client`)

### Input

```typescript
{
  category_id: string           // UUID da categoria
  address_origin: string        // Endereço de origem (obrigatório)
  address_dest?: string         // Endereço de destino (opcional no MVP)
  origin_lat?: number
  origin_lng?: number
  dest_lat?: number
  dest_lng?: number
  description?: string          // Detalhes do serviço
  media_urls?: string[]         // URLs já salvas no Storage
  needs_helper?: boolean        // Precisa de ajudante? default: false
  scheduled_for?: string        // ISO 8601 — null = imediato
  price_estimated?: number      // Estimativa do cliente (opcional)
}
```

### Output (sucesso)

```typescript
{
  id: string // UUID do pedido criado
  status: 'requested'
  expires_at: string // ISO 8601
  otp_code: string // PIN de 6 dígitos — mostrar ao cliente AGORA
}
```

### Fluxo interno

```
1. Validar JWT → confirmar role = 'client'
2. Validar input obrigatório (category_id, address_origin)
3. Verificar se category_id existe e está ativo
4. Gerar OTP: 6 dígitos aleatórios
5. Gerar hash do OTP: crypt(otp, gen_salt('bf'))
6. Calcular expires_at: now() + 30 minutos
7. INSERT em requests com status = 'requested'
8. logEvent(request.id, user.id, null, 'requested')
9. Retornar { id, status, expires_at, otp_code }
   ⚠️  otp_code é retornado APENAS aqui, uma vez.
       Nunca mais exposto — apenas o hash fica no banco.
```

### Regras de validação

```
- address_origin: obrigatório, mínimo 10 caracteres
- category_id: deve existir e estar ativo
- scheduled_for: se fornecido, deve ser no futuro (> now() + 10 min)
- media_urls: máximo 5 URLs
- Um cliente não pode ter mais de 3 pedidos simultâneos com status 'requested' ou 'accepted'
```

### Erros possíveis

| Código | Mensagem                               | Causa                      |
| ------ | -------------------------------------- | -------------------------- |
| 401    | Não autenticado                        | JWT inválido               |
| 403    | Apenas clientes podem criar pedidos    | Role != 'client'           |
| 400    | Categoria inválida ou inativa          | category_id não encontrado |
| 400    | Endereço de origem obrigatório         | Campo vazio                |
| 429    | Limite de pedidos simultâneos atingido | Mais de 3 pedidos abertos  |

---

## Função 2: `request_accept`

**Endpoint:** `POST /functions/v1/request_accept`
**Quem chama:** Prestador (role: `provider`)

### Input

```typescript
{
  request_id: string // UUID do pedido a aceitar
}
```

### Output (sucesso)

```typescript
{
  request_id: string
  status: 'accepted'
  client_name: string           // Para exibir ao prestador
  address_origin: string
  address_dest?: string
}
```

### Fluxo interno

```
1. Validar JWT → confirmar role = 'provider'
2. Buscar provider: verificar verified = true e active = true
3. Buscar pedido pelo request_id
4. Verificar: status = 'requested' (não expirado)
5. Verificar: expires_at > now()
6. Verificar: provider não tem outro pedido ativo (status IN 'accepted','en_route','in_progress')
7. UPDATE requests SET provider_id = user.id, status = 'accepted'
8. logEvent(request_id, user.id, 'requested', 'accepted')
9. [Notificação] Disparar push para o cliente (Expo/Web Push)
10. Retornar dados do pedido
```

### Regras de validação

```
- Prestador deve estar verified = true e active = true
- Pedido deve estar em status 'requested'
- Pedido não pode estar expirado
- Prestador não pode aceitar se já tiver pedido ativo (1 por vez no MVP)
```

### Erros possíveis

| Código | Mensagem                       | Causa                                             |
| ------ | ------------------------------ | ------------------------------------------------- |
| 403    | Apenas prestadores verificados | Não verificado / inativo                          |
| 404    | Pedido não encontrado          | request_id inválido                               |
| 409    | Pedido já foi aceito           | Race condition — outro prestador aceitou primeiro |
| 409    | Você já tem um serviço ativo   | Prestador com pedido em andamento                 |
| 410    | Pedido expirado                | expires_at no passado                             |

---

## Função 3: `request_update_status`

**Endpoint:** `POST /functions/v1/request_update_status`
**Quem chama:** Prestador (transitions normais) ou Admin (qualquer)

### Input

```typescript
{
  request_id: string
  new_status: 'en_route' | 'in_progress' | 'cancelled' | 'disputed'
  cancel_reason?: string        // Obrigatório se new_status = 'cancelled'
  cancel_note?: string          // Texto livre opcional
}
```

### Output (sucesso)

```typescript
{
  request_id: string
  previous_status: string
  new_status: string
  updated_at: string
}
```

### Fluxo interno

```
1. Validar JWT
2. Buscar pedido e status atual
3. Validar transição pela tabela de transições válidas:

   Prestador pode:
     accepted     → en_route
     en_route     → in_progress
     requested    → cancelled
     accepted     → cancelled

   Admin pode qualquer transição (exceto → completed sem OTP)

4. Se cancelled: validar cancel_reason obrigatório
5. UPDATE requests SET status = new_status, cancel_reason, cancelled_by
6. logEvent(request_id, user.id, old_status, new_status, { cancel_reason, cancel_note })
7. [Notificação] Disparar push para a outra parte
8. Retornar resultado
```

### Tabela de transições permitidas por role

```
Role: provider
  accepted     → en_route      ✅
  en_route     → in_progress   ✅
  requested    → cancelled     ✅
  accepted     → cancelled     ✅
  qualquer     → completed     ❌ (use request_complete_with_otp)
  qualquer     → disputed      ❌ (use ticket_open)

Role: client
  requested    → cancelled     ✅
  qualquer     → disputed      ❌ (use ticket_open)

Role: admin
  qualquer     → qualquer      ✅ (exceto completed sem OTP)
```

### Erros possíveis

| Código | Mensagem                           | Causa                                |
| ------ | ---------------------------------- | ------------------------------------ |
| 403    | Transição não permitida            | Role sem permissão para essa mudança |
| 404    | Pedido não encontrado              | request_id inválido                  |
| 400    | Motivo de cancelamento obrigatório | cancel_reason ausente                |
| 409    | Transição inválida: X → Y          | Sequência não permitida              |

---

## Função 4: `request_complete_with_otp`

**Endpoint:** `POST /functions/v1/request_complete_with_otp`
**Quem chama:** Prestador (com OTP fornecido pelo cliente)

### Input

```typescript
{
  request_id: string
  otp_code: string // PIN de 6 dígitos informado pelo cliente ao prestador
}
```

### Output (sucesso)

```typescript
{
  request_id: string
  status: 'completed'
  price_final: number
  platform_fee: number
  provider_amount: number // price_final - platform_fee
  completed_at: string
}
```

### Fluxo interno

```
1. Validar JWT → confirmar role = 'provider'
2. Buscar pedido: status deve ser 'in_progress'
3. Confirmar provider_id = user.id (só o prestador do pedido)
4. Validar OTP:
   a. Buscar otp_code_hash e otp_expires_at do pedido
   b. Verificar otp_expires_at > now()
   c. Comparar: crypt(otp_code, otp_code_hash) = otp_code_hash
   d. Se inválido: registrar tentativas em `request_events.meta` ou outro mecanismo persistente já suportado por migration; não assumir coluna `otp_attempts` no schema atual
5. Calcular financeiro:
   a. price_final = requests.price_final (ou price_estimated se final não definido)
   b. platform_fee = price_final * COMMISSION_RATE (15% no MVP)
   c. provider_amount = price_final - platform_fee
6. UPDATE requests SET
     status = 'completed',
     price_final,
     platform_fee
7. logEvent(request_id, user.id, 'in_progress', 'completed', { price_final, platform_fee })
8. [Financeiro] Enfileirar repasse ao prestador (D+1 — Fase 2)
9. [Notificação] Notificar cliente: serviço concluído, avalie!
10. Retornar resultado
```

### Regras críticas

```
- OTP expira em 60 minutos após a criação do pedido (otp_expires_at)
- Máximo de 5 tentativas erradas → pedido muda para `disputed` automaticamente
- Nunca logar o OTP em texto plano
- Hash com bcrypt (pgcrypto): crypt(otp, gen_salt('bf'))
```

### Erros possíveis

| Código | Mensagem                              | Causa                     |
| ------ | ------------------------------------- | ------------------------- |
| 403    | Não é o prestador deste pedido        | provider_id != user.id    |
| 400    | OTP inválido                          | Código errado             |
| 400    | OTP expirado                          | otp_expires_at no passado |
| 409    | Pedido não está em execução           | Status != 'in_progress'   |
| 429    | Muitas tentativas — pedido em disputa | 5+ tentativas erradas     |

---

## Função 5: `ticket_open`

**Endpoint:** `POST /functions/v1/ticket_open`
**Quem chama:** Cliente ou Prestador (qualquer role exceto admin)

### Input

```typescript
{
  request_id: string
  reason: string                // Descrição do problema (obrigatório)
  media_urls?: string[]         // Evidências (fotos)
}
```

### Output (sucesso)

```typescript
{
  ticket_id: string
  request_id: string
  status: 'open'
  created_at: string
}
```

### Fluxo interno

```
1. Validar JWT
2. Verificar que user é client_id ou provider_id do pedido
3. Verificar que pedido não está em 'completed' ou já 'disputed'
4. INSERT em tickets (status = 'open')
5. UPDATE requests SET status = 'disputed'
6. logEvent(request_id, user.id, old_status, 'disputed', { ticket_reason: reason })
7. [Notificação] Alertar admin sobre novo ticket
8. Retornar ticket criado
```

### Erros possíveis

| Código | Mensagem                   | Causa                         |
| ------ | -------------------------- | ----------------------------- |
| 403    | Você não está neste pedido | Usuário não é parte do pedido |
| 400    | Pedido já concluído        | Status = 'completed'          |
| 409    | Já existe um ticket aberto | Duplicata                     |

---

## Função 6: `provider_go_online` / `provider_go_offline`

**Endpoint:** `POST /functions/v1/provider_toggle_active`
**Quem chama:** Prestador

### Input

```typescript
{
  active: boolean               // true = online, false = offline
  location_lat?: number         // Atualizar localização ao ficar online
  location_lng?: number
}
```

### Output (sucesso)

```typescript
{
  provider_id: string
  active: boolean
  updated_at: string
}
```

### Fluxo interno

```
1. Validar JWT → role = 'provider'
2. Verificar verified = true (não verificado não pode ficar online)
3. Se active = false: verificar que não há pedido ativo (status in_progress, en_route)
4. UPDATE providers SET active, location_lat, location_lng, location_updated_at
5. Retornar resultado
```

---

## Função 7: `admin_verify_provider`

**Endpoint:** `POST /functions/v1/admin_verify_provider`
**Quem chama:** Admin

### Input

```typescript
{
  provider_id: string
  verified: boolean             // true = aprovar, false = reprovar/suspender
  notes?: string                // Motivo (obrigatório se verified = false)
}
```

### Output (sucesso)

```typescript
{
  provider_id: string
  verified: boolean
  updated_at: string
}
```

---

## Notas de Evolução de Schema

- otp_attempts não faz parte do schema atual. Se a equipe optar por coluna dedicada, criar migration nova antes da implementação.
- payment_create, payment_status e campos correlatos de pagamento também exigem migration nova, pois não estão no schema atual do MVP.

## Variáveis de Ambiente

```bash
# Obrigatórias em todas as funções
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Configurações de negócio
COMMISSION_RATE=0.15            # 15% de comissão
OTP_EXPIRY_MINUTES=60           # Expiração do OTP
MAX_OTP_ATTEMPTS=5              # Tentativas antes de disputed
REQUEST_EXPIRY_MINUTES=30       # Prazo para aceite do pedido
MAX_CONCURRENT_REQUESTS=3       # Pedidos simultâneos por cliente

# Notificações (Fase 1+)
EXPO_PUSH_TOKEN=                # Para notificações mobile
```

---

## Ordem de Implementação Recomendada

```
1. request_create              → testa o fluxo básico de criação
2. request_accept              → conecta cliente e prestador
3. request_update_status       → máquina de estados funciona
4. request_complete_with_otp   → fluxo completo fim a fim
5. ticket_open                 → operação consegue lidar com problemas
6. provider_toggle_active      → prestador controla disponibilidade
7. admin_verify_provider       → admin aprova prestadores
```
