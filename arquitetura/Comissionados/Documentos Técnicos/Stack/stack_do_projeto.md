# Projeto (MVP Local) — Marketplace de Bairro (Cliente ↔ Prestador)

> Objetivo: lançar um **MVP local** (bairro + arredores) com **1 dev** e **2 operadores** que ajudam com correções leves via IA (Codex/Claude), validando tração com ~**1000 usuários**.

## Visão Geral

Este projeto é um **middleware operacional** entre **Cliente** e **Prestador**:

- Cliente cria uma solicitação de serviço.
- Prestador recebe, aceita e executa.
- A plataforma controla **status**, **confirmação de conclusão**, **histórico**, **tickets** e **auditoria** (eventos).
- No MVP, a prioridade é **liquidez** (oferta + demanda) e **operação simples**, não perfeição.

---

## Metas do MVP

1. **Demanda real**: usuários criando solicitações.
2. **Oferta disponível**: prestadores aceitando e entregando.
3. **Fluxo operacional controlado**: status e conclusão confiáveis.
4. **Resolução de problemas**: tickets + intervenção manual.

### O que não entra no MVP

- Split complexo / marketplace financeiro completo no dia 1
- Chat completo e ilimitado
- Matching inteligente avançado
- Antifraude complexa antes da validação do modelo

---

## Estratégia de entrega

Uma base única em React + TypeScript com três cascas:

1. **WebApp (PWA)** — produto principal do MVP
2. **Mobile (Expo)** — evolução posterior
3. **Desktop (Electron)** — console de operação/admin

---

## Stack Recomendada

### Frontend

- TypeScript
- Next.js (WebApp + PWA)
- Expo (React Native)
- Electron (Desktop/Admin)
- Turborepo + pnpm

### Backend / Dados

- Supabase
  - Postgres (fonte de verdade)
  - Auth (roles: cliente, prestador, admin)
  - Storage (imagens)
  - Realtime (status do pedido, presença simples)
  - Edge Functions (regras críticas e seguras)

### Infra / Edge / Segurança

- Vercel
  - Hosting do WebApp
  - Preview deployments por PR
- Cloudflare
  - DNS, SSL, WAF e CDN
  - Workers (BFF leve opcional, rate-limit, proteções e recursos auxiliares)

### Observabilidade / Produto

- Sentry (crash + performance)
- PostHog (eventos do produto)

### Pagamentos (MVP)

- Fase 1: Pix manual ou fluxo simples de cobrança
- Fase 2+: split/marketplace financeiro completo

---

## Arquitetura (alto nível)

```txt
[WebApp PWA]         [Mobile Expo]         [Electron Admin]
     |                    |                      |
     |--------------------|----------------------|
                          |
                      [API Layer]
                (Supabase SDK + Edge Functions)
                          |
                 [Supabase Postgres + RLS]
                          |
     [Realtime] [Storage] [Auth] [Edge Functions]
                          |
          [Vercel (hosting)] + [Cloudflare (DNS/Workers/WAF)]
```

### Princípios de arquitetura

- Postgres como fonte de verdade
- Status do pedido via máquina de estados
- Event Log para toda transição
- Regras críticas no backend (Edge Functions + RLS)
- Operação manual possível para exceções

---

## Domínios do MVP

### 1. Identidade e Perfis

Roles:

- `client`
- `provider`
- `admin`

Regras:

- Prestador só aparece na busca se estiver `verified = true` e `active = true`.

### 2. Catálogo / Categorias / Serviços

- Lista de categorias
- Prestador com categorias, preço base opcional, descrição e raio de atendimento
- Busca simples por categoria + proximidade no MVP

### 3. Solicitações (Requests)

Estados recomendados:

- `requested`
- `accepted`
- `en_route`
- `in_progress`
- `completed`
- `cancelled`
- `expired`
- `disputed`

Regra crítica:

- toda mudança de estado deve ser registrada em `request_events`
- toda mudança sensível deve ser validada por Edge Function + RLS

### 4. Realtime

- Mudanças de estado do pedido
- Presença simples do prestador
- Tracking leve no MVP

### 5. Conclusão segura

- Cliente recebe PIN/OTP
- Prestador digita o PIN ao final
- Backend valida e muda para `completed`

### 6. Tickets e operação

- Ticket vinculado ao request
- Admin pode resolver, mudar status e bloquear prestador

### 7. Avaliações

- 1–5 estrelas + comentário opcional
- Só após `completed`

---

## Modelo de Dados (core)

- `profiles`
- `providers`
- `provider_categories`
- `categories`
- `requests`
- `request_events`
- `tickets`
- `ratings`
- `quick_messages`

---

## RLS (alto nível)

- `profiles`: usuário vê/edita apenas o próprio perfil; admin vê todos
- `providers`: prestador edita o próprio; cliente lê apenas verificados e ativos
- `requests`: cliente vê os próprios; prestador vê os atribuídos; admin vê tudo
- `request_events`: leitura pelas partes; escrita apenas via Edge Function
- `tickets`: leitura pelas partes; escrita operacional pelo admin

---

## Edge Functions críticas

1. `request_create`
2. `request_accept`
3. `request_update_status`
4. `request_complete_with_otp`
5. `ticket_open`

---

## Entregáveis de produto

### Cliente

- Onboarding
- Home com categorias
- Lista de prestadores
- Criar solicitação
- Acompanhar solicitação em realtime
- Avaliação
- Tickets

### Prestador

- Perfil + categorias + raio
- Toggle online/offline
- Solicitações recebidas
- Solicitação ativa
- Conclusão com OTP
- Histórico

### Admin / Operação

- Prestadores pendentes
- Lista de requests
- Detalhe do request com timeline
- Tickets
- Bloqueios simples

---

## Deploy (MVP)

### Web

- Vercel para build e hosting do Next.js
- Cloudflare para DNS, SSL, WAF, CDN e serviços de edge
- Env vars: Supabase URL / Anon Key / Sentry / PostHog

### Supabase

- Migrations versionadas
- Edge Functions versionadas
- Storage buckets (`request-media`, `avatars`, etc.)

### Desktop

- Electron carregando admin/web interno
- Distribuição simples no MVP

---

## Observabilidade e Métricas

### Ferramentas

- Sentry
- PostHog

### Eventos mínimos

- `signup_completed`
- `provider_verified`
- `request_created`
- `request_accepted`
- `request_completed`
- `ticket_opened`
- `request_cancelled`

---

## Fases de execução

### Fase 0 — Setup

- Monorepo + padrões
- Auth + roles
- Tabelas core
- Deploy web + Supabase prontos

### Fase 1 — MVP operacional

- Cadastro prestador + verificação manual
- Criar solicitação + aceitar + status realtime
- Concluir com OTP/PIN
- Painel admin básico
- Ticket mínimo

### Fase 2 — Pós-validação

- Pagamentos
- Chat real
- Antifraude avançada
- Melhorias de matching e tracking

---

## Próximos passos recomendados

1. Criar repo + monorepo + apps base
2. Modelar DB + RLS mínimo
3. Implementar requests + estados + events
4. Implementar OTP de conclusão
5. Criar painel admin mínimo
6. Lançar no bairro com PWA primeiro e medir eventos
