# Ajudaê — Claude Context File

**Project:** Ajudaê Marketplace (Mudança, Frete, Entrega)  
**Type:** React Native (Expo) — Dual-role mobile app (Cliente + Prestador)  
**Stack:** TypeScript, React Native, Expo SDK 54, Supabase (Auth + DB + Edge Functions), expo-notifications  
**Status:** MVP Test Closed Sprint — QA fechado com backend Supabase real  
**Stage:** ~90% MVP — providers reais em integração; pagamento e chat ainda pendentes

---

## Project Overview

Ajudaê is a **two-sided marketplace** for service delivery (moving, freight, delivery). The app has:

- **Cliente (Customer)**: Creates service requests, tracks in real-time, confirms dual-PINs, rates providers
- **Prestador (Service Provider)**: Accepts jobs, delivers services, generates PINs, manages portfolio + pricing

### Key Documents

| File | Purpose |
|------|---------|
| `arquitetura/HANDOFF_2026-05-04_MVP_CLOSED_SPRINT.md` | **Latest** handoff — sprint bugs, providers reais, QA manual (2026-05-04) |
| `arquitetura/HANDOFF_2026-05-04.md` | Handoff anterior — bug fixes, notifications, permissions |
| `arquitetura/HANDOFF_2026-04-28.md` | UI Layer v2 handoff — design decisions, API contracts |
| `arquitetura/PRD.md` | Product Requirements Document — estado real, fluxos, critérios de aceite |
| `arquitetura/BETA_ROADMAP.md` | Roadmap 24 meses — 4 fases com estimativas e dependências |
| `arquitetura/MVP_STATUS.md` | Feature completeness by screen |
| `arquitetura/CPO_ASSESSMENT.md` | Product assessment + roadmap |
| `arquitetura/PROGRESS.md` | Implementation tracker (33 items) |

---

## Regra de Segurança — Credenciais

**Nunca commitar credenciais de teste no código.**

- Senhas, e-mails de contas de teste, chaves de API e tokens não entram em nenhum arquivo do repositório
- Usar `.env.local` (não commitado) para variáveis de ambiente locais
- Credenciais de QA são documentadas fora do repositório (ex: gerenciador de senhas da equipe)
- Se encontrar credencial hardcoded no código, remover imediatamente antes de qualquer commit

---

## Architecture Quick Ref

```
artifacts/fretex/
├── app/
│   ├── index.tsx              # ClienteHome + PrestadorHome (dual-role)
│   ├── marketplace.tsx        # Marketplace list + MapExpandModal
│   ├── provider/[id].tsx      # Provider profile (syncs with PortfolioContext)
│   ├── request.tsx            # Create service request (helper toggle aware)
│   ├── track.tsx              # Track active service
│   ├── confirm-start-pin.tsx  # Client PIN input (4 digits)
│   ├── otp-modal.tsx          # Show PIN completion (6 digits)
│   ├── job.tsx                # Provider job details
│   ├── start-pin.tsx          # Show PIN start (provider side)
│   ├── job-otp.tsx            # Provider PIN input (6 digits)
│   ├── rate.tsx               # Post-service rating
│   ├── portfolio.tsx          # Provider portfolio editor
│   └── [auth, inbox, support, ticket, payment, onboarding, etc.]
├── components/
│   ├── MapReal.tsx            # react-native-maps MapView with recenter()
│   ├── MarketMap.tsx          # Reusable map + pin UI
│   ├── ProviderPin.tsx        # Individual pin visual
│   ├── TopNav.tsx             # Header with badges
│   ├── ProfileOverlay.tsx     # Profile menu (permission toggles wired)
│   ├── PermissionGate.tsx     # LGPD modal + OS permission onboarding
│   ├── SideSheet.tsx          # Side navigation
│   └── [other components]
├── contexts/
│   ├── AuthContext.tsx         # Role + user state (Supabase Auth)
│   ├── PermissionsContext.tsx  # OS permissions + LGPD + Supabase sync
│   ├── NotificationContext.tsx # Push notifications — 22-event catalog
│   ├── PortfolioContext.tsx    # Cross-screen portfolio state (local, não persistido no DB)
│   ├── ServiceContext.tsx      # Active service state (djb2 hash, Edge Fns)
│   ├── RequestsContext.tsx     # Service requests list
│   ├── PaymentsContext.tsx     # Payment state
│   └── SupportContext.tsx      # Support tickets
├── lib/
│   └── providers.ts            # Query real de prestadores no Supabase (substitui MOCK_PROVIDERS)
└── constants/
    ├── mockData.tsx            # Categorias e dados auxiliares (MOCK_PROVIDERS removido)
    └── colors.tsx              # Design tokens
```

### Provider Tree (order matters)

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

### Core Flows

| Role | Flow | Status |
|------|------|--------|
| **Cliente** | Browse → Request → Track → PIN Start (confirm) → PIN End (show) → Rate | ✅ 100% |
| **Prestador** | Online → Accept → PIN Start (show) → PIN End (input) → Complete | ✅ 100% |
| **Both** | Dual-PIN offline validation (djb2 hash, max 5 attempts → dispute) | ✅ 100% |
| **Both** | Push notifications on every state change (22 events, foreground only) | ✅ 100% |
| **Both** | LGPD consent + OS permission onboarding | ✅ 100% |

---

## Provider Real Data

A partir desta sprint, a lista de prestadores vem do Supabase diretamente — não há mais dados mockados.

### Como usar `lib/providers.ts`

```typescript
import { fetchNearbyProviders } from '@/lib/providers';

// Busca prestadores online (active = true), ordenados por rating
const providers = await fetchNearbyProviders();

// O retorno segue o shape:
// {
//   id: string,
//   name: string,           // profiles.name
//   service_type: string,   // 'frete' | 'mudanca' | 'entrega'
//   rating_avg: number,
//   rating_count: number,
//   location_lat: number,
//   location_lng: number,
//   active: boolean
// }
```

**Regras importantes:**
- Só exibir prestadores com `active = true`
- Prestador com serviço ativo não deve aparecer para novos clientes (a ser implementado no filtro quando serviços reais estiverem integrados)
- Coordenadas são reais do banco — não usar coordenadas SVG/mock para novos desenvolvimentos
- Se a query retornar vazio, exibir estado vazio no mapa (não usar fallback para dados mock)

---

## Rules & Patterns

### When to Use Superpowers Skills

1. **Before any feature/fix:** Check for `/test-driven-development`, `/feature-dev`, `/systematic-debugging`
2. **Before code review:** Use `/superpowers:requesting-code-review` if major changes
3. **On bugs:** Always start with `/systematic-debugging`

### Code Patterns

- **Safe Area:** Always use `useSafeAreaInsets()` for modals + overlays
- **Styling:** Inline `StyleSheet.create()` at bottom of file; use `colors.light` for theming
- **Icons:** Use `Ionicons` (default) or `MaterialCommunityIcons` from `@expo/vector-icons`
- **Haptics:** `expo-haptics` for Light (UX), Medium (actions), NotificationSuccess (submits)
- **Permissions:** Always use `usePermissions()` — never call `Location` / `ImagePicker` / `Notifications` permission APIs directly in components
- **Notifications:** Use `useNotification().send(event, vars)` to fire a push notification
- **Portfolio state:** Use `usePortfolio()` — never local state for provider profile data
- **Animations:** `Animated` API (not Reanimated) for layout-affecting animations; `useNativeDriver: false` when animating layout props
- **Provider data:** Use `lib/providers.ts` — never referenciar `MOCK_PROVIDERS` em código novo

### File Size Limits

- Screens (`app/*.tsx`): Keep under 2500 lines; extract components to `components/` beyond
- Components: Typically 300–600 lines; split if logic gets complex

### Accessibility & Safe Areas

- All fullscreen modals need `View` with `height: safeTop` at top
- Use `position: "absolute"` + `zIndex` carefully in overlays
- Bottom buttons: account for `insets.bottom` (iPhone X+ notch)

---

## Common Tasks

### Adding a New Screen

1. Create `app/newscreen.tsx`
2. Use `useAuth()` for role-gating
3. Add to router in `_layout.tsx` (Expo Router auto-discovers `app/*.tsx`)
4. Extract components if exceeds 400 lines

### Requesting a Permission

```typescript
// Never call expo-location directly — always go through the context:
const { requestLocation, requestCamera, requestNotifications, openSettings } = usePermissions();

// Check state before requesting
if (location.granted) { /* use location */ }
else if (location.canAsk) { await requestLocation(); }
else { openSettings(); /* permanently denied */ }
```

### Firing a Push Notification

```typescript
const { send } = useNotification();
// From any screen/context inside NotificationProvider:
await send('service_accepted', { name: provider.name });
await send('new_message', { name: 'João', preview: 'Estou a caminho...' });
```

**Atenção:** `send()` só funciona com o app em foreground. Para push com app fechado, o backend precisa chamar a Expo Push API diretamente usando o `push_token` salvo em `profiles`. Ver `arquitetura/HANDOFF_2026-05-04_MVP_CLOSED_SPRINT.md` para o contrato de API.

### Fixing Overlapping Components

- Check `position: "absolute"` + `top`/`bottom` + `zIndex`
- Use `insets.top` / `insets.bottom` for safe areas
- Map container uses `bottom: sheetHeightAnim` to shrink as sheet rises

### Testing Flows

1. Expo Go: `npx expo start` → QR scan on device
2. Dual-device: Switch auth roles via ProfileOverlay logout
3. Notifications: All service state changes fire automatically; use `send()` to test manually
4. Permissions: Reset via device Settings → App → Permissions
5. Providers reais: verificar tabela `providers` no Supabase — deve haver ao menos 1 registro com `active = true` para o mapa não aparecer vazio no QA

---

## Backend Integration Status

| Item | Status |
|------|--------|
| Supabase Auth (signup, login, OTP) | ✅ Integrado |
| Profile → `geolocation_requested`, `camera_requested`, `notifications_requested`, `lgpd_accepted` sync | ✅ Integrado |
| Service creation via Edge Function `request_create` | ✅ Integrado |
| Service status via Edge Function `request_update_status` | ✅ Integrado |
| PIN verification via Edge Function `request_complete_with_otp` | ✅ Integrado |
| `MOCK_PROVIDERS` → query real Supabase (`lib/providers.ts`) | ✅ Em integração nesta sprint |
| Toggle online do prestador → `providers.active` no banco | ✅ Em integração nesta sprint |
| Map coordinates SVG → GPS real (Supabase `location_lat`/`lng`) | ⏳ Parcial — colunas existem no DB, frontend ainda adaptando |
| Real-time WebSocket `/providers/positions` | ❌ Pendente (Fase 1.3 do roadmap) |
| Pix/Stripe payment processing | ❌ Pendente (Fase 1.1 do roadmap) |
| Chat WebSocket (Supabase Realtime) | ❌ Pendente (Fase 1.2 do roadmap) |
| Push em background (push_token salvo no banco + servidor envia) | ❌ Pendente (Fase 1.5 do roadmap) |
| DELETE /users/me (LGPD Art. 18) | ❌ Pendente (Fase 1.4 do roadmap) |
| djb2 hash → HMAC-SHA256 (`expo-crypto`) | ❌ Migração pré-produção (Fase 2.1) |
| Image picker → S3/GCS bucket upload | ❌ Pendente (Fase 2.2 do roadmap) |
| `PortfolioContext` → `PATCH /providers/me/portfolio` | ❌ Pendente (Fase 3.4 do roadmap) |

---

## Recent Changes (2026-05-04)

### Sprint MVP Test Closed — Bugs Corrigidos

- ✅ Duplicate `locating` state removido — erro de bundling Metro corrigido
- ✅ `expo-notifications` crash no bundling corrigido em `NotificationContext`
- ✅ `useAuth` fora do `AuthProvider` corrigido — hook movido para dentro da árvore correta

### Sprint MVP Test Closed — Implementações

- ✅ `lib/providers.ts` criado — query real na tabela `providers` do Supabase (substitui `MOCK_PROVIDERS`)
- ✅ Toggle online do prestador atualiza `providers.active` no banco
- ✅ Credenciais demo hardcoded removidas do código
- ✅ Métricas do dashboard do prestador (`rating_avg`, `rating_count`) lidas do banco

### Session 3 — Permissions & LGPD (handoff anterior)

- ✅ `PermissionsContext` — single source of truth for all OS permissions + `lgpd_accepted`; syncs to Supabase `profiles` on every change
- ✅ `PermissionGate` — blocking LGPD consent modal + sequential permission onboarding (location → notifications)
- ✅ `ProfileOverlay` Configurações: toggles show live OS state; permanently-denied → "Abrir Configurações" (`Linking.openSettings()`)
- ✅ `AuthContext.completeOnboarding` now persists `geolocation_requested` + `last_consent_update` to DB
- ✅ `NotificationContext` simplified — delegates all permission management to `PermissionsContext`

### Session 2 — Push Notifications (handoff anterior)

- ✅ `NotificationContext` with 22-event catalog (service lifecycle, PIN failures, job events, chat, payments, auth)
- ✅ Reactive service state watcher — auto-fires on every `status`, `startPinAttempts`, `conclusionAttempts` change
- ✅ 3 Android notification channels (`ajudae-default`, `ajudae-service`, `ajudae-jobs`)
- ✅ Notification tap → navigates to relevant screen via `AuthGate` listener

---

## Known Debt

| Item | Severity | Recomendação |
|------|----------|-------------|
| `djb2` vs HMAC-SHA256 no dual-PIN | **Alta** | Migrar antes da produção via `expo-crypto` (Fase 2.1 do roadmap) |
| Push apenas foreground (app aberto) | **Alta** | Backend precisa salvar `push_token` e chamar Expo Push API (Fase 1.5) |
| `PortfolioContext` não persistido no Supabase | Média | Wire `PATCH /providers/me/portfolio` quando endpoint pronto (Fase 3.4) |
| Coordenadas SVG no mapa vs GPS real | **Alta** | Conectar `location_lat`/`lng` reais do banco ao mapa (em progresso) |
| `lib/providers.ts` sem cache | Média | Adicionar cache local (SWR ou React Query) antes da beta — query a cada render |
| Prestador online com serviço ativo aparece no mapa | Média | Adicionar filtro na query: excluir prestadores com serviço ativo |
| `PortfolioSheet` inline em `index.tsx` | Baixa | Extrair para `components/PortfolioSheet.tsx` (arquivo próximo de 2500 linhas) |
| `MapExpandModal` inline em `marketplace.tsx` | Baixa | Extrair para `components/MapExpandModal.tsx` |
| Camera permission não solicitada no onboarding (prestador) | Baixa | Adicionar etapa de câmera no `PermissionGate` para role `provider` |

---

## CPO Notes (Product Priorities)

1. **Agora:** QA fechado com 2 dispositivos reais — validar fluxo completo com dados reais do Supabase
2. **Semana 1:** Concluir integração de providers reais; corrigir bugs de QA
3. **Semana 2–4 (Fase 1):** Pagamento Pix, Chat, GPS ao vivo, DELETE /users/me, Push background
4. **Mês 3–6 (Fase 2):** HMAC-SHA256, upload fotos, histórico real, disputas, rating real
5. **Mês 6–12 (Fase 3):** PostGIS, push servidor por área, dashboard analítico, portfólio no banco, KYC

Ver `arquitetura/BETA_ROADMAP.md` para detalhamento completo.

---

## Quick Links

- **Expo Go:** `npx expo start` then scan QR
- **Git:** Feature branches off `main`; branch atual: `claude/fix-provider-profile-sync-DOXXR`
- **Supabase:** Edge Functions para `request_create`, `request_update_status`, `request_complete_with_otp`
- **Tests:** QA manual via Expo Go com 2 celulares — ver `arquitetura/HANDOFF_2026-05-04_MVP_CLOSED_SPRINT.md`
- **Roadmap:** `arquitetura/BETA_ROADMAP.md`
- **PRD:** `arquitetura/PRD.md`

---

_Last Updated: 2026-05-04 — Sprint MVP Test Closed (providers reais + remoção de mocks)_
