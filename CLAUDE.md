# Ajudaê — Claude Context File

**Project:** Ajudaê Marketplace (Mudança, Frete, Entrega)  
**Type:** React Native (Expo) — Dual-role mobile app (Cliente + Prestador)  
**Stack:** TypeScript, React Native, Expo SDK 54, Supabase (Auth + DB + Edge Functions), expo-notifications  
**Status:** MVP Stage 2 — UI Layer v2 + Notificações + LGPD compliant  
**Stage:** ~90% MVP testável — ready for closed QA with real Supabase backend

---

## Project Overview

Ajudaê is a **two-sided marketplace** for service delivery (moving, freight, delivery). The app has:

- **Cliente (Customer)**: Creates service requests, tracks in real-time, confirms dual-PINs, rates providers
- **Prestador (Service Provider)**: Accepts jobs, delivers services, generates PINs, manages portfolio + pricing

### Key Documents

| File | Purpose |
|------|---------|
| `arquitetura/HANDOFF_2026-05-04.md` | **Latest** handoff — bug fixes, notifications, permissions (2026-05-04) |
| `arquitetura/HANDOFF_2026-04-28.md` | UI Layer v2 handoff — design decisions, API contracts |
| `arquitetura/MVP_STATUS.md` | Feature completeness by screen |
| `arquitetura/CPO_ASSESSMENT.md` | Product assessment + roadmap |
| `arquitetura/PROGRESS.md` | Implementation tracker (33 items) |

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
│   ├── PermissionGate.tsx     # LGPD modal + OS permission onboarding  ← NEW
│   ├── SideSheet.tsx          # Side navigation
│   └── [other components]
├── contexts/
│   ├── AuthContext.tsx         # Role + user state (Supabase Auth)
│   ├── PermissionsContext.tsx  # OS permissions + LGPD + Supabase sync  ← NEW
│   ├── NotificationContext.tsx # Push notifications — 22-event catalog  ← NEW
│   ├── PortfolioContext.tsx    # Cross-screen portfolio state            ← NEW
│   ├── ServiceContext.tsx      # Active service state (djb2 hash, Edge Fns)
│   ├── RequestsContext.tsx     # Service requests list
│   ├── PaymentsContext.tsx     # Payment state
│   └── SupportContext.tsx      # Support tickets
└── constants/
    ├── mockData.tsx            # MOCK_PROVIDERS, categories, etc.
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
| **Both** | Push notifications on every state change (22 events) | ✅ 100% |
| **Both** | LGPD consent + OS permission onboarding | ✅ 100% |

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

### Fixing Overlapping Components

- Check `position: "absolute"` + `top`/`bottom` + `zIndex`
- Use `insets.top` / `insets.bottom` for safe areas
- Map container uses `bottom: sheetHeightAnim` to shrink as sheet rises

### Testing Flows

1. Expo Go: `npx expo start` → QR scan on device
2. Dual-device: Switch auth roles via ProfileOverlay logout
3. Notifications: All service state changes fire automatically; use `send()` to test manually
4. Permissions: Reset via device Settings → App → Permissions

---

## Backend Integration Status

| Item | Status |
|------|--------|
| Supabase Auth (signup, login, OTP) | ✅ Integrated |
| Profile → `geolocation_requested`, `camera_requested`, `notifications_requested`, `lgpd_accepted` sync | ✅ Integrated |
| Service creation via Edge Function `request_create` | ✅ Integrated |
| Service status via Edge Function `request_update_status` | ✅ Integrated |
| PIN verification via Edge Function `request_complete_with_otp` | ✅ Integrated |
| `MOCK_PROVIDERS` → `GET /providers/nearby` | ❌ Pending |
| Map coordinates SVG → Google Maps / Mapbox | ❌ Pending |
| Real-time WebSocket `/providers/positions` | ❌ Pending |
| Pix/Stripe payment processing | ❌ Pending |
| Chat WebSocket | ❌ Pending |
| djb2 hash → HMAC-SHA256 (`expo-crypto`) | ❌ Pre-prod migration |
| Image picker → S3/GCS bucket upload | ❌ Pending |

---

## Recent Changes (2026-05-04)

### Session 1 — Bug Fixes
- ✅ `crypto.subtle.digest` crash replaced with pure-JS djb2 hash in `ServiceContext`
- ✅ `PortfolioContext` created — provider profile panel now syncs with portfolio editor
- ✅ Helper badges show "Sim"/"Não" text; helper option hidden in request flow when disabled by provider
- ✅ ProfileOverlay sub-menus (Avaliações, Segurança, Configurações) now have full mock content
- ✅ Marketplace map CTAs navigate correctly (client → `/request`, provider → `/provider/[id]`)
- ✅ Home map pin card persists above sheet while a pin is selected (no longer disappears on expand)
- ✅ Map area now shrinks correctly when bottom sheet rises (`bottom: sheetHeightAnim`)
- ✅ Locate button anchored at fixed position in map container; shows spinning animation + blue active state

### Session 2 — Push Notifications
- ✅ `NotificationContext` with 22-event catalog (service lifecycle, PIN failures, job events, chat, payments, auth)
- ✅ Reactive service state watcher — auto-fires on every `status`, `startPinAttempts`, `conclusionAttempts` change
- ✅ 3 Android notification channels (`ajudae-default`, `ajudae-service`, `ajudae-jobs`)
- ✅ Notification tap → navigates to relevant screen via `AuthGate` listener

### Session 3 — Permissions & LGPD
- ✅ `PermissionsContext` — single source of truth for all OS permissions + `lgpd_accepted`; syncs to Supabase `profiles` on every change
- ✅ `PermissionGate` — blocking LGPD consent modal + sequential permission onboarding (location → notifications)
- ✅ `ProfileOverlay` Configurações: toggles show live OS state; permanently-denied → "Abrir Configurações" (`Linking.openSettings()`)
- ✅ `AuthContext.completeOnboarding` now persists `geolocation_requested` + `last_consent_update` to DB
- ✅ `NotificationContext` simplified — delegates all permission management to `PermissionsContext`

---

## Known Debt

| Item | Severity | Recommendation |
|------|----------|----------------|
| `PortfolioSheet` inline in `index.tsx` | Low | Extract to `components/PortfolioSheet.tsx` (file approaching 2500 lines) |
| `MapExpandModal` inline in `marketplace.tsx` | Low | Extract to `components/MapExpandModal.tsx` |
| `djb2` vs HMAC-SHA256 | **High** | Migrate before production via `expo-crypto` |
| Map coordinates SVG vs real GPS | **High** | Integrate Mapbox/Google Maps when backend ready |
| `MOCK_PROVIDERS` static data | Medium | Replace with `GET /providers/nearby` + WebSocket stream |
| `PortfolioContext` not persisted to Supabase | Medium | Wire `PATCH /providers/me/portfolio` when endpoint ready |
| Camera permission not requested at onboarding | Low | Add camera step to `PermissionGate` for provider role |

---

## CPO Notes (Product Priorities)

1. **Now:** Closed QA with real Supabase backend (notifications + permissions fully live)
2. **Week 1:** Replace `MOCK_PROVIDERS` with real `GET /providers/nearby` + WebSocket positions
3. **Week 2:** Mapbox/Google Maps integration (real coordinates)
4. **Week 3:** Pix/Stripe payment integration
5. **Week 4:** Chat WebSocket + production hardening (HMAC-SHA256, S3 uploads)

---

## Quick Links

- **Expo Go:** `npx expo start` then scan QR
- **Git:** Feature branches off `main`; current active: `claude/fix-provider-profile-sync-DOXXR`
- **Supabase:** Edge Functions for `request_create`, `request_update_status`, `request_complete_with_otp`
- **Tests:** Manual QA via Expo Go; no automated tests yet

---

_Last Updated: 2026-05-04 — Notifications + LGPD Permissions complete_
