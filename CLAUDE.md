# Ajudaê — Claude Context File

**Project:** Ajudaê Marketplace (Mudança, Frete, Entrega)  
**Type:** React Native (Expo) mobile app + CRM Web admin  
**Stack:** TypeScript, React Native, Expo SDK 54, Supabase (Auth + DB + Edge Functions), expo-notifications; CRM: Vite + React 19 + Tailwind v4  
**Status:** Build-Ready — brand identity completa, mocks removidos, portfólio persistido  
**Stage:** ~95% MVP — pronto para EAS build (TestFlight/APK); bloqueadores são externos (EAS Secrets, anon key rotation, mascote assets)

---

## Project Overview

Ajudaê is a **two-sided marketplace** for service delivery (moving, freight, delivery). The project has:

- **App Mobile** (`artifacts/fretex`): React Native/Expo — dual-role (Cliente + Prestador)
- **CRM Web** (`artifacts/crm`): Vite/React — painel admin interno (acesso exclusivo via Supabase role=admin)

### Key Documents

| File | Purpose |
|------|---------|
| `arquitetura/HANDOFF_2026-05-10.md` | **Latest** handoff — brand identity (6 etapas), EmptyState, BottomTabBar |
| `arquitetura/LAUNCH_CHECKLIST.md` | Checklist completo de lançamento (EAS Secrets, builds, QA) |
| `arquitetura/EXTERNAL_TASKS_2026-05-10.md` | Tasks externas bloqueadoras (mascote, key rotation, builds) |
| `arquitetura/GITHUB_ACTIONS_SETUP.md` | GitHub Actions workflows para EAS build e submit |
| `arquitetura/PRD.md` | Product Requirements Document |
| `arquitetura/BETA_ROADMAP.md` | Roadmap 24 meses — 4 fases |
| `arquitetura/MVP_STATUS.md` | Feature completeness by screen |
| `arquitetura/CPO_ASSESSMENT.md` | Product assessment + roadmap |
| `arquitetura/PROGRESS.md` | Implementation tracker |
| `arquitetura/Comissionados/Documentos Técnicos/` | Database schema, Edge Functions, RLS policies, KYC, Architecture |
| `arquitetura/Comissionados/Documentos JurídicosLegais/` | Terms of Service, Privacy Policy, Shareholder Agreement |

---

## Regra de Segurança — Credenciais

**Nunca commitar credenciais de teste no código.**

- Senhas, e-mails de contas de teste, chaves de API e tokens não entram em nenhum arquivo do repositório
- Usar `.env.local` (não commitado) para variáveis de ambiente locais
- `.claude/settings.local.json` está no `.gitignore` — nunca remover essa entrada (pode conter tokens)
- Credenciais de QA são documentadas fora do repositório (ex: gerenciador de senhas da equipe)
- Se encontrar credencial hardcoded no código, remover imediatamente antes de qualquer commit
- **Atenção:** a `anon key` do Supabase ajudae_banco foi exposta em git history (2026-05-06) e deve ser rotacionada

---

## Architecture Quick Ref

### App Mobile (`artifacts/fretex`)

```
artifacts/fretex/
├── app/
│   ├── index.tsx                  # ClienteHome + PrestadorHome (dual-role)
│   ├── marketplace.tsx            # Marketplace list + MapExpandModal
│   ├── provider/[id].tsx          # Provider profile (syncs with PortfolioContext)
│   ├── request.tsx                # Create service request
│   ├── track.tsx                  # Track active service
│   ├── confirm-start-pin.tsx      # Client PIN input (4 digits)
│   ├── otp-modal.tsx              # Show PIN completion (6 digits)
│   ├── job.tsx                    # Provider job details
│   ├── start-pin.tsx              # Show PIN start (provider side)
│   ├── job-otp.tsx                # Provider PIN input (6 digits)
│   ├── rate.tsx                   # Post-service rating
│   ├── portfolio.tsx              # Provider portfolio editor
│   ├── provider-validation.tsx    # Formulário prestador — 5 etapas paginadas ← atualizado
│   └── [auth, inbox, support, ticket, payment, onboarding, etc.]
├── components/
│   ├── MapReal.tsx                # react-native-maps MapView with recenter()
│   ├── MarketMap.tsx              # Reusable map + pin UI
│   ├── ProviderPin.tsx            # Individual pin visual
│   ├── TopNav.tsx                 # Header with badges
│   ├── ProfileOverlay.tsx         # Profile menu (permission toggles wired)
│   ├── PermissionGate.tsx         # LGPD modal + OS permission onboarding
│   ├── SideSheet.tsx              # Side navigation
│   └── [other components]
├── contexts/
│   ├── AuthContext.tsx            # Role + user state (Supabase Auth)
│   ├── PermissionsContext.tsx     # OS permissions + LGPD + Supabase sync
│   ├── NotificationContext.tsx    # Push notifications — 22-event catalog
│   ├── PortfolioContext.tsx       # Cross-screen portfolio state
│   ├── ServiceContext.tsx         # Active service state (djb2 hash, Edge Fns)
│   ├── RequestsContext.tsx        # Service requests list
│   ├── PaymentsContext.tsx        # Payment state
│   └── SupportContext.tsx         # Support tickets
├── lib/
│   └── providers.ts              # Query real de prestadores no Supabase
└── constants/
    ├── mockData.tsx              # Categorias e dados auxiliares (MOCK_PROVIDERS removido)
    └── colors.tsx                # Design tokens
```

### CRM Web (`artifacts/crm`)

```
artifacts/crm/
├── src/
│   ├── App.tsx                   # Rotas protegidas
│   ├── components/
│   │   ├── Layout.tsx            # Sidebar responsiva com hamburger mobile
│   │   └── ProtectedRoute.tsx    # Guarda session + adminVerified
│   ├── contexts/
│   │   └── AuthContext.tsx       # Auth + role=admin check + rate limiter (5/15min)
│   ├── lib/
│   │   ├── supabase.ts           # Client VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
│   │   └── security.ts           # sanitizeText, getSignedUrl(s) — 300s TTL
│   └── pages/
│       ├── Login.tsx             # Form sem hints de sistema
│       ├── Dashboard.tsx         # KPIs: providers, tickets, requests ativos
│       ├── Providers.tsx         # Lista com busca + filtro por status
│       ├── Documents.tsx         # Análise docs com signed URLs (5min)
│       ├── Tickets.tsx           # Gestão de tickets (tabela: tickets)
│       └── Forms.tsx             # Formulários de onboarding
├── public/
│   └── _headers                  # Cloudflare Pages: CSP, HSTS, X-Frame-Options, etc.
├── vercel.json                   # Mesmos headers para Vercel
└── .env.example                  # Template: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

**Deploy:** Cloudflare Pages  
**Build:** `pnpm --filter @workspace/crm run build`  
**Output:** `artifacts/crm/dist`  
**Supabase project:** ajudae_banco (`https://rlehpgvvevarpkkamied.supabase.co`)

### Provider Tree — App Mobile (order matters)

```
AuthProvider
  └─ PermissionsProvider        ← reads user; syncs all OS perms to Supabase
       └─ PortfolioProvider
            └─ RequestsProvider
                 └─ ServiceProvider
                      └─ NotificationProvider   ← reactive service state watcher
                           └─ PaymentsProvider
                                └─ SupportProvider
                                     └─ AuthGate
                                          └─ PermissionGate   ← LGPD + perm screens
```

### Core Flows — App Mobile

| Role | Flow | Status |
|------|------|--------|
| **Cliente** | Browse → Request → Track → PIN Start (confirm) → PIN End (show) → Rate | ✅ 100% |
| **Prestador** | Online → Accept → PIN Start (show) → PIN End (input) → Complete | ✅ 100% |
| **Both** | Dual-PIN offline validation (djb2 hash, max 5 attempts → dispute) | ✅ 100% |
| **Both** | Push notifications on every state change (22 events, foreground only) | ✅ 100% |
| **Both** | LGPD consent + OS permission onboarding | ✅ 100% |
| **Prestador** | Formulário de onboarding paginado (5 etapas, validação por campo) | ✅ 100% |

### Core Flows — CRM Web

| Página | Status |
|--------|--------|
| Login com role check (admin only) + rate limiting | ✅ |
| Dashboard com KPIs reais | ✅ |
| Lista de prestadores com busca | ✅ |
| Análise de documentos (signed URLs) + Aprovar/Reprovar | ✅ |
| Gestão de tickets (mudar status) | ✅ |
| Visualização de formulários de onboarding | ✅ |
| Responsividade mobile (hamburger + painéis alternados) | ✅ |

---

## Provider Real Data

A lista de prestadores vem do Supabase diretamente — não há mais dados mockados.

```typescript
import { fetchNearbyProviders } from '@/lib/providers';
const providers = await fetchNearbyProviders();
// { id, name, service_type, rating_avg, rating_count, location_lat, location_lng, active }
```

**Regras:**
- Só exibir prestadores com `active = true`
- Se a query retornar vazio, exibir estado vazio no mapa (não usar fallback para dados mock)

---

## CRM — Schema do Banco (ajudae_banco)

Tabelas usadas pelo CRM e seus nomes reais:

| Tabela | Uso |
|--------|-----|
| `providers` | Lista de prestadores, documentos, formulários |
| `profiles` | Join para nome (`profiles(name)`) — **sem coluna email** |
| `tickets` | Tickets de suporte (status: open/in_review/resolved/closed) |
| `requests` | Pedidos de serviço (status: requested/accepted/en_route/in_progress/...) |

**Migration aplicada:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));
```

---

## Rules & Patterns

### Code Patterns — App Mobile

- **Safe Area:** Always use `useSafeAreaInsets()` for modals + overlays
- **Styling:** Inline `StyleSheet.create()` at bottom of file; use `colors.light` for theming
- **Icons:** Use `Ionicons` (default) or `MaterialCommunityIcons` from `@expo/vector-icons`
- **Haptics:** `expo-haptics` for Light (UX), Medium (actions), NotificationSuccess (submits)
- **Permissions:** Always use `usePermissions()` — never call `Location` / `ImagePicker` / `Notifications` APIs directly
- **Notifications:** Use `useNotification().send(event, vars)` to fire a push notification
- **Portfolio state:** Use `usePortfolio()` — never local state for provider profile data
- **Animations:** `Animated` API (not Reanimated); `useNativeDriver: false` when animating layout props
- **Provider data:** Use `lib/providers.ts` — never reference `MOCK_PROVIDERS`

### Code Patterns — CRM Web

- **Auth guard:** Usar `ProtectedRoute` — nunca acessar dados sem `session && adminVerified`
- **DB output:** Sempre passar por `sanitizeText()` antes de entrar no estado React
- **Document URLs:** Sempre usar `getSignedUrl()` / `getSignedUrls()` — nunca `getPublicUrl()`
- **Search:** Usar `String.includes()` — nunca regex em input do usuário (ReDoS)

### File Size Limits — App Mobile

- Screens (`app/*.tsx`): Keep under 2500 lines; extract components to `components/` beyond
- Components: Typically 300–600 lines; split if logic gets complex

---

## Common Tasks

### Adding a New Screen (App Mobile)

1. Create `app/newscreen.tsx`
2. Use `useAuth()` for role-gating
3. Add to router in `_layout.tsx` (Expo Router auto-discovers `app/*.tsx`)
4. Extract components if exceeds 400 lines

### Adding a New Admin to the CRM

```sql
-- Executar no SQL Editor do Supabase (ajudae_banco)
UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'novo-admin@exemplo.com');
```

### Requesting a Permission (App Mobile)

```typescript
const { requestLocation, requestCamera, requestNotifications, openSettings } = usePermissions();
if (location.granted) { /* use location */ }
else if (location.canAsk) { await requestLocation(); }
else { openSettings(); }
```

### Testing Flows

1. **App:** `npx expo start` → QR scan; dual-device para trocar roles
2. **CRM:** Deploy no Cloudflare Pages ou `pnpm --filter @workspace/crm run dev`
3. **Providers reais:** verificar tabela `providers` no Supabase — ao menos 1 com `active = true`

---

## Backend Integration Status

| Item | Status |
|------|--------|
| Supabase Auth (signup, login, OTP) | ✅ Integrado |
| Profile sync (permissions, LGPD) | ✅ Integrado |
| Service creation via Edge Function `request_create` | ✅ Integrado |
| Service status via Edge Function `request_update_status` | ✅ Integrado |
| PIN verification via Edge Function `request_complete_with_otp` | ✅ Integrado |
| `MOCK_PROVIDERS` → query real Supabase (`lib/providers.ts`) | ✅ Integrado |
| Toggle online do prestador → `providers.active` | ✅ Integrado |
| CRM Web — login, role check, todas as páginas | ✅ Integrado |
| `profiles.role` migration (admin access) | ✅ Aplicado em ajudae_banco |
| Map coordinates SVG → GPS real | ⏳ Parcial — colunas existem, frontend adaptando |
| Real-time WebSocket `/providers/positions` | ❌ Pendente (Fase 1.3) |
| Pix/Stripe payment processing | ❌ Pendente (Fase 1.1) |
| Chat WebSocket (Supabase Realtime) | ❌ Pendente (Fase 1.2) |
| Push em background (push_token + servidor) | ❌ Pendente (Fase 1.5) |
| DELETE /users/me (LGPD Art. 18) | ❌ Pendente (Fase 1.4) |
| djb2 hash → HMAC-SHA256 (`expo-crypto`) | ❌ Migração pré-produção (Fase 2.1) |
| Image picker → S3/GCS bucket upload | ❌ Pendente (Fase 2.2) |
| `PortfolioContext` → `PATCH /providers/me/portfolio` | ❌ Pendente (Fase 3.4) |

---

## Recent Changes (2026-05-31 — Production Build Readiness + Documentation Organization)

- ✅ **Documentation reorganization:** limpeza de `arquitetura/` removendo guias operacionais (`Runbooks`, `Documentacao da Equipe`, `TODO_Comissionados`) mantendo apenas docs técnicos e legais importantes em `Comissionados/`
- ✅ **Removed old/superseded docs:** deletados `HANDOFF_2026-05-06.md`, `SUMMARY_2026-05-10.md`, `Introducao/` (guides obsoletos)
- ✅ **Kept essential technical docs:** `ARCHITECTURE.md`, `DB_SCHEMA.md`, `EDGE_FUNCTIONS.md`, `RLS_POLICIES.md`, `KYC_IDWALL.md` em `Comissionados/Documentos Técnicos/`
- ✅ **Kept legal docs:** `Documentos JurídicosLegais/` com Termos de Serviço, Política de Privacidade, Acordo de Sócios
- ✅ **Replit removal:** simplicado `scripts/build.js` (removidos checks para `REPLIT_*` env vars), atualizado `pnpm-workspace.yaml`
- ✅ **Removed @replit packages:** deletados de mockup-sandbox e pnpm-workspace.yaml
- ✅ **package.json architecture fix:** ALL native modules (`react-native-reanimated`, `gesture-handler`, `screens`, `keyboard-controller`, etc) movidos de devDependencies → dependencies
- ✅ **app.config.js plugins:** adicionados `expo-location`, `expo-image-picker`, `react-native-keyboard-controller`
- ✅ **iOS deployment target:** `deploymentTarget: "16.0"` (requerido por New Architecture + Reanimated 4.1.x)
- ✅ **Crash fixes:** AsyncStorage JSON parse wrapped em try/catch; `expo-crypto` SHA256 para commitment hash
- ✅ **ExpoGO compatibility:** app roda em Expo Go (nenhum EAS-only modules)
- ✅ **EAS channels:** configured `preview` e `production` channels com OTA updates

## Recent Changes (2026-05-30 — Build Fixes)

- ✅ `newArchEnabled: true` — reativado: `react-native-reanimated@4.1.x` exige New Architecture; `react-native-maps@1.20.1` já suporta
- ✅ `app.config.js` — removida definição de `config: undefined` que causava crash em `eas credentials`
- ✅ `.github/workflows/eas-submit-ios.yml` — workflow dedicado de submit iOS → TestFlight

## Recent Changes (2026-05-11 — Launch-Ready UX)

- ✅ Todos os mocks removidos — dados reais ou estados vazios honestos em todos os fluxos
- ✅ `ProposalAlert` — overlay fullscreen 99-style com countdown 60s (Accept/Decline)
- ✅ `NotificationContext` — canal Android MAX-importance `ajudae-proposals`, action buttons, Expo Push API
- ✅ `PortfolioContext` — debounced writes (1.2s) para `portfolio_data JSONB` no Supabase
- ✅ Migration `029_portfolio_data.sql` — `portfolio_data jsonb` em `providers`
- ✅ `provider-validation.tsx` — tela de confirmação com código de protocolo `AJD-{userId}`
- ✅ `payment.tsx` — botão "Copiar código Pix" com Share sheet nativo
- ✅ `proposals.tsx` — chips de horário rápido (4 opções)
- ✅ `BottomTabBar` — badge polling a cada 30s na tabela `proposals`
- ✅ Edge Function `notify_new_proposal` — WhatsApp (Z-API) / SMS (Twilio) / Expo Push
- ✅ `job.tsx` — badge "1º serviço · sem taxa!" para prestadores com 0 serviços concluídos
- ✅ `lib/providers.ts` — filtro Haversine 30km, campo `provider.km`
- ✅ `ProfileOverlay` — sistema de indicações com código djb2 + Share sheet

## Recent Changes (2026-05-10 — UI/UX Brand Identity)

- ✅ Color tokens: `primary: #FFC90E`, `background: #FAF9ED` (branding preciso)
- ✅ Fontes: Fraunces → Nunito (700/800/900)
- ✅ Zero emojis — 23+ substituições por Ionicons/MCI
- ✅ Novo componente `EmptyState` com mascote flutuante + fallback gracioso
- ✅ Novo componente `BottomTabBar` role-aware (#1F1F1F bg, #FFC90E ativo)
- ✅ Novo hook `useEntranceAnim` (fade + slide 280ms)
- ✅ `Skeleton` — shimmer LinearGradient (substitui opacity pulse)
- ✅ `chat.tsx` — bubble "me" usa `c.primary` (#FFC90E)
- ✅ `payment.tsx` — TopNav padronizado
- ✅ Heatmap 2-tons, stats grid uniforme, ProfileOverlay toggle simplificado

## Recent Changes (2026-05-07 — Correções Críticas Android)

- ⚠️ `newArchEnabled: false` — workaround temporário para crash Android (revertido em 2026-05-30)
- ✅ Animação sheet: `Animated.spring` → `Animated.timing` com `Easing.out(Easing.cubic)`
- ✅ Botão localizar: guard `?? Promise.resolve()` para TypeError síncrono

## Recent Changes (2026-05-06)

- ✅ CRM Web criado em `artifacts/crm` — Vite + React + Tailwind v4 + Supabase
- ✅ Formulário do prestador reescrito em 5 etapas paginadas com validação, máscaras e câmera
- ✅ Security hardening no CRM: CSP, HSTS, signed URLs, sanitização, rate limiting
- ✅ Schema corrigido: `support_tickets→tickets`, `services→requests`, `not_started→incomplete`
- ✅ `.claude/settings.local.json` removido do tracking git + adicionado ao `.gitignore`
- ⚠️ `anon key` do ajudae_banco exposta — **rotacionar no Supabase dashboard (CRÍTICO)**

## Recent Changes (2026-05-04)

- ✅ `lib/providers.ts` — query real na tabela `providers` (substitui `MOCK_PROVIDERS`)
- ✅ Toggle online do prestador atualiza `providers.active` no banco
- ✅ Push notifications: 22 eventos com watcher reativo, 3 canais Android
- ✅ LGPD + permissões OS: modal bloqueante, sync para `profiles`

---

## Known Debt

| Item | Severity | Recomendação |
|------|----------|-------------|
| `anon key` ajudae_banco exposta em git history | **Crítica** | Rotacionar no Supabase dashboard — **bloqueador de deploy** |
| EAS Secrets não configurados | **Crítica** | `eas secret:create` para URL, anon key e Google Maps key — blockers para TestFlight build |
| Mascote assets ausentes | Alta | Fornecer `mascot-running.png` + `mascot-standing.png` em `assets/images/mascot/` |
| Cloudflare Access sem domínio customizado | Alta | Registrar domínio para habilitar Zero Trust no CRM |
| Bucket `provider-docs` deve ser privado | Alta | Configurar no Supabase Storage |
| Push em background | Alta | Backend salvar `expo_push_token` e chamar Expo Push API (Fase 1.5) |
| Coordenadas GPS dos prestadores no mapa | Alta | Popular `location_lat`/`lng` no Supabase e conectar ao `react-native-maps` |
| `lib/providers.ts` sem cache | Média | Adicionar SWR ou React Query antes da beta |
| CRM sem paginação nas listas | Baixa | Adicionar quando volume crescer |
| `PortfolioSheet` inline em `index.tsx` | Baixa | Extrair para `components/PortfolioSheet.tsx` |
| `MapExpandModal` inline em `marketplace.tsx` | Baixa | Extrair para `components/MapExpandModal.tsx` |

---

## Quick Links

- **App Mobile:** `npx expo start` → scan QR
- **Build APK:** `cd artifacts/fretex && eas build --platform android --profile preview`
- **Build iOS:** `cd artifacts/fretex && eas build --platform ios --profile preview`
- **CRM Dev:** `pnpm --filter @workspace/crm run dev`
- **CRM Prod:** Cloudflare Pages (ajudae-app.pages.dev)
- **Git:** branch principal: `main` (último PR: #22, 2026-05-11)
- **Supabase ajudae_banco:** `https://rlehpgvvevarpkkamied.supabase.co`
- **Handoff mais recente:** `arquitetura/HANDOFF_2026-05-10.md`
- **Launch checklist:** `arquitetura/LAUNCH_CHECKLIST.md`
- **Roadmap:** `arquitetura/BETA_ROADMAP.md`

---

_Last Updated: 2026-05-31 — Production-build-ready + cleanup + Replit removed + package.json fixed + crash recovery_
