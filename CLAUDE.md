# Ajudaê — Claude Context File

**Project:** Ajudaê Marketplace (Mudança, Frete, Entrega)  
**Type:** React Native (Expo) — Dual-role mobile app (Cliente + Prestador)  
**Stack:** TypeScript, React Native, Expo, AsyncStorage (mock backend)  
**Status:** MVP Stage 1 — UI Layer v2 complete, backend-ready for integration  
**Stage:** ~80% MVP testável — ready for closed QA

---

## Project Overview

Ajudaê is a **two-sided marketplace** for service delivery (moving, freight, delivery). The app has:

- **Cliente (Customer)**: Creates service requests, tracks in real-time, confirms dual-PINs, rates providers
- **Prestador (Service Provider)**: Accepts jobs, delivers services, generates PINs, manages portfolio + pricing

### Key Documents

| File | Purpose |
|------|---------|
| `arquitetura/HANDOFF_2026-04-28.md` | Latest UI handoff (design decisions, API contracts, debt) |
| `arquitetura/MVP_STATUS.md` | Feature completeness by screen (80% MVP) |
| `arquitetura/CPO_ASSESSMENT.md` | Product assessment + roadmap |

---

## Architecture Quick Ref

```
artifacts/fretex/
├── app/
│   ├── index.tsx          # Cliente Home + Prestador Home (dual-role)
│   ├── marketplace.tsx    # Marketplace list + MapExpandModal
│   ├── provider/[id].tsx  # Provider profile
│   ├── request.tsx        # Create service request
│   ├── track.tsx          # Track active service
│   ├── confirm-start-pin.tsx  # Client PIN input (4 digits)
│   ├── otp-modal.tsx      # Show PIN completion (6 digits)
│   ├── job.tsx            # Provider job details
│   ├── start-pin.tsx      # Show PIN start (provider side)
│   ├── job-otp.tsx        # Provider PIN input (6 digits)
│   ├── rate.tsx           # Post-service rating
│   └── [auth, inbox, support, ticket, payment, etc.]
├── components/
│   ├── MarketMap.tsx      # Reusable map + pin UI
│   ├── MapSVG.tsx         # SVG map (static, placeholder for Mapbox)
│   ├── ProviderPin.tsx    # Individual pin visual
│   ├── TopNav.tsx         # Header with badges
│   ├── BottomTabBar.tsx   # Tab navigation
│   ├── ProfileOverlay.tsx # Profile menu
│   ├── SideSheet.tsx      # Side navigation
│   └── [other components]
├── contexts/
│   ├── AuthContext.tsx    # Role + user state (mock)
│   ├── ServiceContext.tsx # Active service state
│   └── [others]
└── constants/
    ├── mockData.tsx       # MOCK_PROVIDERS, categories, etc.
    └── colors.tsx         # Design tokens

```

### Core Flows

| Role | Flow | Status |
|------|------|--------|
| **Cliente** | Browse → Request → Track → PIN Start (confirm) → PIN End (show) → Rate | ✅ 100% |
| **Prestador** | Online → Accept → PIN Start (show) → PIN End (input) → Complete | ✅ 100% |
| **Both** | Dual-PIN offline validation (djb2 hash, max 5 attempts → dispute) | ✅ 95% |

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
- **State:** AsyncStorage for persistence (local mock); AuthContext for role/user
- **Animations:** `Animated` API for loops (e.g., hourly glass), position/opacity fades for modals

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
3. Add to router (Expo Router auto-discovers `app/*.tsx`)
4. Extract components if exceeds 400 lines

### Fixing Overlapping Components

- Check `position: "absolute"` + `top`/`bottom` + `zIndex`
- Use `insets.top` / `insets.bottom` for safe areas
- Increase spacing or reposition elements
- Test on iPhone SE (small) + Pro Max (large)

### Testing Flows

1. Expo Go: `npx expo start` → QR scan on device
2. Dual-device: Switch auth roles via ProfileOverlay logout
3. Mock data: Edit `constants/mockData.tsx` for MOCK_PROVIDERS, categories

---

## Backend Integration Checklist

When backend is ready (Phase 2), replace:

- [ ] `AsyncStorage` → API calls (JWT auth)
- [ ] `MOCK_PROVIDERS` → `GET /providers/nearby?lat=X&lng=Y`
- [ ] `djb2` hash → HMAC-SHA256 with `expo-crypto`
- [ ] Image picker → S3/GCS bucket upload
- [ ] Static SVG map → Google Maps / Mapbox
- [ ] Mock WebSocket → Real `/providers/positions` stream

---

## Recent Changes (2026-04-28)

- ✅ Dashboard restructured (urgency hierarchy)
- ✅ Portfolio editor (modal pageSheet with bio/services/promoção/pin-card)
- ✅ Pin callout 2-state logic + auto-close with sheet expansion
- ✅ Haptic feedback mapped (Light → Medium → Success)
- ✅ Marketplace redesign + MapExpandModal fullscreen
- ✅ Safe-area fix in MapExpandModal (status-bar black bar)

---

## Known Debt

| Item | Severity | Recomendation |
|------|----------|---------------|
| `PortfolioSheet` inline in `index.tsx` | Low | Extract to `components/PortfolioSheet.tsx` (file at 2000+ lines) |
| `MapExpandModal` inline in `marketplace.tsx` | Low | Extract to `components/MapExpandModal.tsx` |
| `djb2` vs HMAC-SHA256 | High | Migrate before production |
| Map coordinates SVG vs real GPS | High | Integrate Mapbox when backend ready |

---

## CPO Notes (Product Priorities)

1. **Now:** Closed QA on current MVP (80% testável)
2. **Week 1–2:** Polishments (skeleton loading, pull-to-refresh, contrast fixes)
3. **Week 2–3:** Backend integration (API, JWT, WebSocket)
4. **Week 4:** Closed testing + launch prep

---

## Quick Links

- **Vercel Preview:** [Check recent deployment link from CI/CD]
- **Expo Go:** `npx expo start` then scan QR
- **Git:** Main branch is production-ready; create feature branches off `main`
- **Tests:** No automated tests yet; manual QA via Expo Go

---

_Last Updated: 2026-04-28 — UI Layer v2 Complete_
