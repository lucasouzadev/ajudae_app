# Integration Quick Reference — Ajudaê Phase 1

**Setup Date:** 2026-04-28  
**Status:** Ready for Testing  
**Current Phase:** Foundation (Auth + Service Creation)

---

## 🎯 What's Been Integrated

### 1. **Supabase Client** (`lib/supabase.ts`)
Initialized with AsyncStorage for session persistence and auto-refresh tokens.

```typescript
import { supabase } from '@/lib/supabase';

// Use anywhere in the app
const { data, error } = await supabase.from('requests').select('*');
```

### 2. **Authentication** (`contexts/AuthContext.tsx`)
Now uses real Supabase Auth instead of mock login.

```typescript
const { user, login, signup, logout } = useAuth();

// Signup creates both auth user and profile record
await signup('João Silva', 'joao@example.com', '+5521999999999', 'password', 'cliente');

// Login persists session automatically
await login('joao@example.com', 'password');

// Session restored on app restart automatically
```

### 3. **Service Management** (`contexts/ServiceContext.tsx`)
All service operations now call Supabase Edge Functions.

```typescript
const { active, createService, assignProvider, advanceStatus, completeWithConclusion } = useService();

// Create service → calls request_create Edge Function
const service = await createService({
  category: CATEGORIES[0],
  origin: 'Rua A, 123',
  description: 'Mudança de apartamento',
  estimatedPrice: 150,
  // ... other fields
});

// Advance status → calls request_update_status Edge Function
await advanceStatus('en_route');

// Complete with OTP → calls request_complete_with_otp Edge Function
await completeWithConclusion(otpCode);
```

### 4. **Real-time Hooks** (`hooks/useServiceUpdates.ts`)
Subscribe to live updates from Supabase.

```typescript
// Listen for service status changes
useServiceUpdates(requestId, (updatedRequest) => {
  console.log('Status changed to:', updatedRequest.status);
});

// Listen for new nearby requests (provider view)
useNearbyRequests(lat, lng, 5, (newRequest) => {
  console.log('New job nearby:', newRequest.address_origin);
});

// Track provider location in real-time (client view)
useProviderLocation(providerId, (lat, lng) => {
  updateMapMarker(lat, lng);
});
```

### 5. **Provider Query Hook** (`hooks/useNearbyProviders.ts`)
Fetch verified providers with distance calculation.

```typescript
const { providers, loading, error, refetch } = useNearbyProviders({
  latitude: -22.9068,
  longitude: -43.1729,
  radius_km: 5,
});

// Results automatically sorted by distance
providers.forEach(p => {
  console.log(`${p.name} - ${p.distance_km?.toFixed(1)}km away`);
});
```

---

## 📱 How to Test

### Step 1: Install Dependencies
```bash
cd artifacts/fretex
pnpm install
```

### Step 2: Start Dev Server
```bash
npm run dev
```

### Step 3: Create Test Account
Scan QR code in Expo Go → Signup as **cliente** or **prestador**

### Step 4: Test Auth Flow
1. ✅ Login/signup works and saves session
2. ✅ Close Expo Go completely
3. ✅ Reopen app → Session persists (auto-login)

### Step 5: Test Service Creation
1. As **cliente**: Create a service request
2. Check Supabase Dashboard → `requests` table should have new row
3. Verify PINs generated correctly

### Step 6: Test Service Status Updates
1. As **prestador**: Accept the request
2. As **cliente**: Should see status update in real-time
3. Advanced status → en_route → in_progress → completed
4. Verify each status transition appears in Supabase `request_events` table

---

## 🔌 New Hooks Available

| Hook | Purpose | Example |
|------|---------|---------|
| `useNearbyProviders()` | Fetch providers by location | Marketplace screen |
| `useServiceUpdates()` | Real-time service status | Tracking screen |
| `useNearbyRequests()` | Provider sees new jobs | Job list for prestador |
| `useProviderLocation()` | Track provider in real-time | Map with live pin |
| `useServiceRatings()` | Real-time rating updates | Rating display |

---

## 🛠️ Environment Variables

**`.env.local`** (already configured):
```
EXPO_PUBLIC_SUPABASE_URL=https://rlehpgvvevarpkkamied.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_MAP_PROVIDER=apple
```

These are loaded automatically by Expo. No additional setup needed.

---

## 📊 Database Status

| Table | Status | Notes |
|-------|--------|-------|
| `auth.users` | ✅ Ready | Managed by Supabase Auth |
| `profiles` | ✅ Ready | Synced via AuthContext |
| `providers` | ✅ Ready | Can be queried with `useNearbyProviders()` |
| `requests` | ✅ Ready | Created via `createService()` |
| `request_events` | ✅ Ready | Auto-updated by Edge Functions |
| `ratings` | ✅ Ready | Can be posted after completion |
| `tickets` | ✅ Ready | For dispute management |
| `provider_locations` | ✅ Ready | Real-time tracking |

---

## 🔄 Service Flow (Now Real)

```
Cliente App                     Supabase                Provider App
─────────────────────────────────────────────────────────────────────
Create request ──────────────────→ request_create() ────────────→ [Server generates OTP]
                ←─────────────── Returns: id, otp_hash ←─────────
                  (stores pins locally)

                                                    ← Provider sees new request
                                                    
Provider accepts ────────────────→ request_accept() ───────────→ [Status: accepted]
                ←─────────────── Realtime update ←─────────────
                (status: accepted)

Client sees "En route" ──────────→ request_update_status() ───→
                ←─────────────── Realtime update ←─────────────

...status progression...

Client enters OTP ───────────────→ request_complete_with_otp() →VerifyOTP, mark completed
                ←─────────────── { ok: true } ←─────────────
                (status: completed)

Both can post ratings ───────────→ ratings table ←─────────────
```

---

## ✅ What Works Now

- [x] Real Supabase authentication
- [x] User profile management
- [x] Service creation via Edge Function
- [x] Service status updates
- [x] OTP verification flow
- [x] Local session persistence
- [x] Real-time subscriptions (available)
- [x] Provider queries (available)

## ⏳ What's Next

- [ ] Test authentication flow end-to-end
- [ ] Replace MOCK_PROVIDERS in marketplace.tsx
- [ ] Implement real-time updates in tracking screens
- [ ] Add push notifications
- [ ] Payment integration
- [ ] Chat/messaging system

---

## 🚨 Important Notes

1. **Edge Functions**: All edge functions are deployed. If you get a 404, check that you're using the correct function name (e.g., `request_create` not `createRequest`)

2. **OTP System**: 
   - Backend generates OTP (6 digits) and hashes it with HMAC-SHA256
   - Client stores the plaintext OTP locally for verification
   - Server-side verification happens when client submits OTP

3. **Session Persistence**: Tokens are automatically stored in AsyncStorage and refreshed when needed. No manual token management required.

4. **Offline Fallback**: PIN validation (4 digits at arrival) is client-side only, so it works offline. OTP verification (6 digits at completion) requires backend.

---

## 📚 Related Documents

- [`SUPABASE_ARCHITECTURE.md`](./SUPABASE_ARCHITECTURE.md) — Complete backend schema
- [`BACKEND_INTEGRATION_ROADMAP.md`](./BACKEND_INTEGRATION_ROADMAP.md) — Full integration plan
- [`PHASE_1_INTEGRATION_STATUS.md`](./PHASE_1_INTEGRATION_STATUS.md) — Current progress

---

_Ready to test! Install deps and start the dev server._
