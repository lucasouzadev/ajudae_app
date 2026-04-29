# Supabase Architecture — Ajudaê Backend

**Status:** ✅ Produção-ready  
**Ambiente:** Supabase (rlehpgvvevarpkkamied.supabase.co)  
**Data:** 2026-04-28

---

## 🗂️ Database Schema

### Core Tables

**profiles** (extend auth.users)
```
- id (uuid) → PK from auth.users
- role: 'client' | 'provider' 
- name, phone, avatar_url
- is_active boolean
- Auto-sync trigger: on_auth_user_created
```

**providers** (extend profiles for providers)
```
- id (uuid) → FK profiles.id
- verified, active boolean
- bio text
- location_lat/lng (numeric 10,7) + index
- vehicle_type, vehicle_plate, capacity_kg
- rating_avg (3,2), rating_count
- service_radius_km
- Índice compound: (location_lat, location_lng) WHERE verified AND active
```

**categories**
```
- id (uuid)
- slug: 'mudanca' | 'frete' | 'entrega'
- name, emoji, color
```

**requests** (main order entity)
```
- id (uuid)
- client_id → FK profiles
- provider_id → FK providers (nullable)
- category_id → FK categories
- status: 'requested' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
- address_origin, address_dest (text)
- origin_lat/lng, dest_lat/lng (numeric)
- description, media_urls (jsonb [])
- needs_helper boolean
- scheduled_for (timestamptz, nullable)
- price_estimated, price_final, platform_fee
- otp_code_hash, otp_expires_at
- cancel_reason, cancel_note, cancelled_by
- expires_at (default: now + 30 min)
- Índices: (client_id, status), (provider_id, status), (status, created_at)
```

**request_events** (audit log)
```
- id (uuid)
- request_id → FK requests
- status (enum)
- message text
- metadata (jsonb)
- created_at
```

**ratings**
```
- id (uuid)
- request_id → FK requests
- rater_id, ratee_id → FK profiles
- score (numeric 2,1) 1-5
- comment text
- created_at
```

**tickets**
```
- id (uuid)
- request_id → FK requests (nullable)
- user_id → FK profiles
- category: 'dispute' | 'damage' | 'lost_item' | 'other'
- status: 'open' | 'in_review' | 'resolved' | 'closed'
- subject, description text
- created_at, resolved_at
```

**quick_messages**
```
- id (uuid)
- content text (max 150)
```

**provider_locations** (real-time tracking)
```
- id (uuid)
- provider_id → FK providers
- latitude, longitude (numeric)
- accuracy_meters (numeric)
- updated_at (timestamptz)
- Índice: (provider_id, updated_at)
```

---

## 🔌 Edge Functions

### 1. **request_create**
```
POST /functions/v1/request_create
Body: {
  category_id: uuid,
  address_origin: string (10+ chars),
  address_dest?: string,
  origin_lat?: number,
  origin_lng?: number,
  dest_lat?: number,
  dest_lng?: number,
  description?: string (500 chars max),
  media_urls?: string[] (5 max),
  needs_helper?: boolean,
  scheduled_for?: ISO8601,
  price_estimated?: number
}

Returns: {
  id: uuid,
  otp_code_hash: string,
  otp_expires_at: ISO8601,
  price_estimated: number,
  platform_fee: number
}

Logic:
- Validate input (Zod)
- Check MAX_CONCURRENT_REQUESTS (default 3)
- Generate OTP (6 digits)
- Hash OTP (HMAC-SHA256)
- Save request + request_event
- Return to client
- Client stores OTP locally for PIN verification
```

### 2. **request_accept**
```
POST /functions/v1/request_accept
Body: {
  request_id: uuid
}

Returns: { ok: true, request: {...} }

Logic:
- Validate provider is verified & active
- Check request still in 'requested' status
- Update request: provider_id, status = 'accepted'
- Create request_event
- Broadcast via Realtime
```

### 3. **request_update_status**
```
POST /functions/v1/request_update_status
Body: {
  request_id: uuid,
  status: 'en_route' | 'in_progress' | 'completed'
}

Returns: { ok: true }

Logic:
- Validate status transition (VALID_TRANSITIONS)
- Update request.status
- Create request_event
- Broadcast via Realtime
```

### 4. **request_complete_with_otp**
```
POST /functions/v1/request_complete_with_otp
Body: {
  request_id: uuid,
  otp_code: string (6 digits)
}

Returns: { ok: true } | { ok: false, error: string }

Logic:
- Hash otp_code (HMAC-SHA256 with salt)
- Compare with request.otp_code_hash
- If match: update status = 'completed', calculate final price
- If mismatch: increment attempts counter
- After 5 failed: auto-transition to 'disputed'
```

### 5. **provider_toggle_active**
```
POST /functions/v1/provider_toggle_active
Body: { active: boolean }

Returns: { ok: true, provider: {...} }

Logic:
- Update providers.active
- If active=true AND not verified: reject
- Broadcast via Realtime
```

### 6. **provider_kyc_start**
```
POST /functions/v1/provider_kyc_start
Body: {
  document_type: 'cpf' | 'cnpj',
  document_number: string,
  bank_account?: { bank, agency, account, type }
}

Returns: { kyc_session_id: uuid, status: 'pending' }

Logic:
- Validate document format
- Create kyc_session record
- Queue for verification (external service)
```

### 7. **admin_verify_provider**
```
POST /functions/v1/admin_verify_provider
Body: { provider_id: uuid, verified: boolean, reason?: string }

Returns: { ok: true }

Logic:
- Only admin role
- Update providers.verified
- If verified=true, send welcome notification
```

### 8. **ticket_open**
```
POST /functions/v1/ticket_open
Body: {
  request_id?: uuid,
  category: 'dispute' | 'damage' | 'lost_item' | 'other',
  subject: string,
  description: string
}

Returns: { ticket_id: uuid }

Logic:
- Create ticket record
- Send notification to admin
- Create request_event if request_id provided
```

---

## 🔐 RLS Policies

**Profiles**
- Public read (name, avatar, rating)
- Self write (all fields except role)
- Provider read (full profile if provider active/verified)

**Providers**
- Public read (verified & active providers)
- Self write (bio, vehicle, location)
- Admin write (verified, active)

**Requests**
- Client read: own requests only
- Provider read: assigned requests or nearby requests
- Client write: own requests
- Provider write: assigned requests (status only)

**Ratings**
- Public read: all ratings
- Self write: only own ratings (post-completion)

---

## 📡 Real-time Subscriptions

```typescript
// Client listening to request status updates
supabase
  .from('requests')
  .on('UPDATE', { event: '*', schema: 'public' }, (payload) => {
    if (payload.new.id === requestId) {
      // Update local state
      setRequestStatus(payload.new.status)
    }
  })
  .subscribe()

// Provider listening to new requests nearby
supabase
  .from('requests')
  .on('INSERT', { event: '*', schema: 'public' }, (payload) => {
    // Check if within provider's radius
    const distance = haversine(providerLat, providerLng, payload.new.origin_lat, payload.new.origin_lng)
    if (distance <= provider.service_radius_km) {
      showNotification(`Novo pedido em ${payload.new.address_origin}`)
    }
  })
  .subscribe()
```

---

## 🚀 API Endpoints Ready

| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| POST | `/auth/signup` | ✅ Supabase Auth | |
| POST | `/auth/login` | ✅ Supabase Auth | JWT token |
| POST | `/functions/v1/request_create` | ✅ | OTP generation |
| POST | `/functions/v1/request_accept` | ✅ | Provider assignment |
| POST | `/functions/v1/request_update_status` | ✅ | Status transitions |
| POST | `/functions/v1/request_complete_with_otp` | ✅ | OTP verification |
| POST | `/functions/v1/provider_toggle_active` | ✅ | Online/offline |
| POST | `/functions/v1/provider_kyc_start` | ✅ | KYC workflow |
| POST | `/functions/v1/admin_verify_provider` | ✅ | Admin panel |
| POST | `/functions/v1/ticket_open` | ✅ | Support tickets |

---

## 🔗 React Native Integration Points

### Authentication
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: { name: 'João Silva', role: 'client' }
  }
})

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})

// Auto-login on app launch
const { data } = await supabase.auth.getSession()
if (data.session) {
  // User logged in
}
```

### Create Request
```typescript
const { data, error } = await supabase.functions.invoke('request_create', {
  body: {
    category_id: 'uuid-here',
    address_origin: 'Rua A, 123',
    address_dest: 'Rua B, 456',
    origin_lat: -22.9068,
    origin_lng: -43.1729,
    description: 'Mudança apartamento',
    needs_helper: true,
    price_estimated: 150
  }
})

const { id, otp_code_hash, otp_expires_at } = data
// Save locally: ServiceContext
```

### Listen to Status Updates
```typescript
const channel = supabase
  .channel(`request:${requestId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'requests',
    filter: `id=eq.${requestId}`
  }, (payload) => {
    setRequestStatus(payload.new.status)
  })
  .subscribe()

// Cleanup
return () => channel.unsubscribe()
```

---

## ⚠️ Missing / To-Do

| Item | Status | Priority |
|------|--------|----------|
| Storage bucket config (media uploads) | ✅ Configured | - |
| Payment integration (Pix/Stripe) | ⏳ In 015_payment_fields | Medium |
| Chat/messages table | ❌ Not found | Low |
| Notifications push (device tokens) | ❌ Not found | Medium |
| Stripe webhook handler | ❌ Not found | Medium |
| Analytics/events tracking | ❌ Not found | Low |

---

## 📦 Deployment Status

✅ **Schema:** All migrations ready  
✅ **RLS:** Policies in place  
✅ **Functions:** Edge functions deployed  
⏳ **Secrets:** SUPABASE_URL, SERVICE_ROLE_KEY, APP_URL configured?  
⏳ **Storage:** Verify bucket access in React Native  

---

_Ajudaê Backend — Supabase Architecture — Production Ready_
