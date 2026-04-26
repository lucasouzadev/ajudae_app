# ARCHITECTURE.md — Ajudaê

> Decisões de arquitetura, diagrama de componentes e princípios de engenharia.
> **Owner:** Tech Lead (Sócio 1) — atualizar a cada decisão arquitetural relevante.

---

## Visão Geral

O Ajudaê é uma plataforma cliente↔prestador construída sobre uma base única de código React/TypeScript distribuída em 3 "cascas": WebApp, Mobile e Desktop (admin).

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                │
├──────────────┬──────────────────┬──────────────────────────────┤
│  WebApp/PWA  │   Mobile (Expo)  │   Desktop Admin (Electron)   │
│  Next.js     │   React Native   │   Carrega web/admin          │
└──────┬───────┴────────┬─────────┴──────────────┬───────────────┘
       │                │                         │
       └────────────────┼─────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │    Supabase SDK    │  (cliente direto nas queries seguras)
              │  + Edge Functions  │  (lógica crítica de negócio)
              └─────────┬──────────┘
                        │
         ┌──────────────▼──────────────────┐
         │         SUPABASE                │
         ├─────────────────────────────────┤
         │  PostgreSQL + RLS               │
         │  Auth (JWT, roles)              │
         │  Storage (mídia)                │
         │  Realtime (status do pedido)    │
         │  Edge Functions (Deno)          │
         └──────────────┬──────────────────┘
                        │
         ┌──────────────▼──────────────────┐
         │      VERCEL + CLOUDFLARE        │
         ├─────────────────────────────────┤
         │  Vercel: hosting do WebApp      │
         │  Cloudflare: DNS, SSL e WAF     │
         │  CDN / Workers quando necessário│
         └─────────────────────────────────┘
```

---

## Estrutura do Monorepo

```
ajudae/
├── apps/
│   ├── web/              # Next.js 14 — WebApp + PWA (produto principal)
│   ├── mobile/           # Expo — App iOS/Android (Fase 2)
│   ├── desktop/          # Electron — Admin console
│   └── admin/            # (opcional) Next.js admin separado
│
├── packages/
│   ├── ui/               # Design system compartilhado (Radix UI + Tailwind)
│   ├── shared/           # Types TypeScript, schemas Zod, utils
│   └── api/              # Supabase client + wrappers das Edge Functions
│
├── supabase/
│   ├── migrations/       # SQL versionado (DB_SCHEMA.md)
│   ├── functions/        # Edge Functions (EDGE_FUNCTIONS.md)
│   └── seed.sql          # Dados iniciais (categorias, admin)
│
├── runbooks/             # Documentação operacional
├── docs/                 # Documentação técnica (este arquivo, PRD, etc.)
│
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Stack Completa

| Camada       | Tecnologia              | Justificativa                                  |
| ------------ | ----------------------- | ---------------------------------------------- |
| Linguagem    | TypeScript              | Tipagem compartilhada entre frontend e backend |
| WebApp       | Next.js 14 (App Router) | SSR/SSG + PWA + deploy fácil na Vercel         |
| Mobile       | Expo (React Native)     | Compartilha lógica com a web (Fase 2)          |
| Desktop      | Electron                | Carrega o web admin — zero código extra        |
| Monorepo     | Turborepo + pnpm        | Build cache + workspaces                       |
| Banco        | Supabase PostgreSQL     | Postgres gerenciado + RLS + Realtime embutido  |
| Auth         | Supabase Auth           | JWT + roles + magic link                       |
| Storage      | Supabase Storage        | Upload de mídia com validação                  |
| Realtime     | Supabase Realtime       | WebSocket para status do pedido                |
| Backend      | Supabase Edge Functions | Deno — lógica crítica serverless               |
| Deploy web   | Vercel                  | Hosting do WebApp + preview deploys por PR     |
| Edge / Infra | Cloudflare              | DNS, SSL, WAF, CDN e Workers                   |
| Proteção     | Cloudflare WAF          | Rate limit + bloqueio de bots                  |
| Erros        | Sentry                  | Crash reporting frontend                       |
| Analytics    | PostHog                 | Eventos de produto                             |
| Validação    | Zod                     | Schema compartilhado entre frontend/backend    |

---

## Princípios de Arquitetura

### 1. PostgreSQL é a fonte de verdade

Toda regra de negócio que importa existe no banco. O frontend nunca é a última palavra sobre estado.

### 2. Lógica crítica no backend

Transições de status, OTP, cálculo de comissão, validação de permissão → sempre em Edge Function. Nunca no cliente.

### 3. RLS como segunda linha de defesa

As Edge Functions usam `service_role` e validam regras de negócio. O RLS protege contra acessos diretos à API. As duas camadas existem independentemente.

### 4. Auditoria de tudo

Toda mudança de estado em `requests` gera um registro em `request_events`. Isso nunca é opcional.

### 5. Realtime para UX, não para lógica

O Supabase Realtime é usado para atualizar a UI. A fonte de verdade é sempre o banco — o Realtime só avisa o frontend para ir buscar o dado atualizado.

---

## Fluxo de Dados — Criar um Pedido

```
Cliente (browser)
    │
    ├── 1. Preenche formulário
    ├── 2. Chama packages/api/request_create(input)
    │
    ▼
packages/api (wrapper)
    │
    ├── 3. Valida input com Zod
    ├── 4. POST /functions/v1/request_create
    │      Authorization: Bearer {jwt}
    │
    ▼
Edge Function: request_create (Deno)
    │
    ├── 5. Valida JWT → extrai user.id
    ├── 6. Verifica role = 'client'
    ├── 7. Valida regras de negócio
    ├── 8. Gera OTP → hash com bcrypt
    ├── 9. INSERT em requests (service_role)
    ├── 10. INSERT em request_events
    ├── 11. Retorna { id, status, otp_code }
    │
    ▼
packages/api (wrapper)
    │
    ├── 12. Recebe resposta
    ├── 13. Retorna para o componente
    │
    ▼
Cliente (browser)
    │
    └── 14. Exibe modal com OTP
        15. Navega para Tela de Acompanhamento
        16. Supabase Realtime: subscribe ao canal requests:{id}
```

---

## Fluxo de Realtime — Atualização de Status

```
Prestador muda status (via Edge Function)
    │
    ▼
Edge Function atualiza requests.status
    │
    ▼
Supabase Realtime detecta UPDATE
    │
    ▼
Broadcast para canal requests:{request_id}
    │
    ▼
Cliente inscrito recebe evento
    │
    ▼
UI atualiza barra de progresso
```

---

## Decisões Arquiteturais Registradas

### ADR-001: Supabase como backend principal

**Decisão:** Usar Supabase (não construir API própria em Java/Node).
**Motivo:** Time de 1 dev. Supabase entrega Auth, DB, Storage, Realtime e Functions num só serviço. Reduz superfície de código a manter.
**Trade-off:** Vendor lock-in. Aceitável no MVP — migrar depois se necessário.

### ADR-002: Edge Functions em Deno, não Java/Spring

**Decisão:** Lógica de negócio em Deno/TypeScript nas Edge Functions.
**Motivo:** Mesma linguagem do frontend, deploy nativo no Supabase, sem servidor para gerenciar.
**Trade-off:** Dev 1 precisa aprender Deno se não conhece. Curva pequena — API similar ao Node.

### ADR-003: Sem chat livre no MVP

**Decisão:** Apenas mensagens rápidas pré-definidas.
**Motivo:** Chat aberto vira canal de suporte infinito. Drena operação. Adiar para Fase 2.

### ADR-004: Sem split de pagamento no MVP

**Decisão:** Pix manual (ou PSP simples) no MVP, split real na Fase 2.
**Motivo:** Integração de marketplace financeiro (KYC, split, conciliação) é complexa. Validar o negócio antes de investir nisso.

### ADR-005: PWA antes de app nativo

**Decisão:** WebApp/PWA é o produto principal do MVP.
**Motivo:** Zero atrito de instalação. Valida o produto sem passar pela loja.

---

## Segurança — Resumo das Camadas

```
Camada 1: HTTPS / Cloudflare WAF
  → Rate limiting, bloqueio de bots, DDoS básico

Camada 2: Supabase Auth (JWT)
  → Toda requisição precisa de token válido

Camada 3: RLS (Row Level Security)
  → Usuário só acessa seus próprios dados

Camada 4: Edge Functions
  → Validação de regras de negócio (transições, OTP, permissões)

Camada 5: Auditoria
  → request_events registra todo o histórico
```

---

## Observabilidade

| Ferramenta           | O que monitora                        | Quem usa |
| -------------------- | ------------------------------------- | -------- |
| Sentry               | Erros de JS (web/mobile/desktop)      | Dev 2    |
| PostHog              | Eventos de produto (funis, conversão) | CPO      |
| Supabase Dashboard   | Logs de DB, Edge Functions, Auth      | Dev 1    |
| Cloudflare Analytics | Tráfego, cache, bloqueios             | Dev 1    |

---

## Escalabilidade — O que muda quando crescer

O MVP aguenta ~1.000 usuários sem mudança. Quando escalar:

| Componente   | Bottleneck                   | Solução futura                  |
| ------------ | ---------------------------- | ------------------------------- |
| Realtime     | Muitas conexões simultâneas  | Ably ou Pusher                  |
| Localização  | Atualização frequente de GPS | Pipeline separado (Redis/Kafka) |
| Matching     | Busca por raio em Postgres   | PostGIS + índice espacial       |
| Pagamentos   | Pix manual                   | Stripe Connect ou PSP com split |
| Notificações | Push volume alto             | Serviço dedicado (OneSignal)    |
