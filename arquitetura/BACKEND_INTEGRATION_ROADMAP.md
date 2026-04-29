# Backend Integration Roadmap — Ajudaê React Native

**Data:** 2026-04-28  
**Status:** Planning phase  
**Backend:** Supabase (rlehpgvvevarpkkamied.supabase.co)

---

## 📊 Current State

### App (React Native / Expo)
✅ **Funcional no mock:**
- Autenticação (login/signup local)
- Criação de pedidos (cliente)
- Aceitação de pedidos (prestador)
- Sistema dual-PIN (offline validation)
- Avaliações pós-serviço
- Portfolio editor
- Mapa com Google Maps/Apple Maps (Apple no ExpoGo)
- UI/UX completa

❌ **Pendente (mock data):**
- Persistência em servidor
- Real-time updates
- Notificações push
- Pagamentos reais
- Histórico de serviços
- Chat/mensagens
- Dados de prestadores em tempo real

### Supabase
✅ **Existente:**
- Projeto criado e configurado
- Tabela `providers` (vazia)

❌ **Faltando:**
- Tabelas: `users`, `services`, `orders`, `payments`, `messages`, `ratings`
- Autenticação configurada
- Edge Functions para PIN verification
- Real-time subscriptions
- RLS (Row Level Security)
- Triggers para eventos

---

## 🎯 Integration Phases

### **FASE 1: Foundation (Semana 1)**
Prioridade: **CRÍTICA** — sem isso, nada funciona

**1.1 — Banco de dados**
- [ ] Criar tabelas: `users`, `providers`, `services`
- [ ] Definir relacionamentos (FK)
- [ ] Criar índices (lat/lng para geolocalização)
- [ ] Seed de prestadores (5 fornecedores test)

**1.2 — Autenticação**
- [ ] Supabase Auth (email/password ou passwordless)
- [ ] Sincronizar `users` table com `auth.users`
- [ ] RLS para `users` (can read own profile)
- [ ] RLS para `providers` (públicos, selectable)

**1.3 — API REST básica**
```
POST   /auth/signup          → criar usuário + cliente/prestador
POST   /auth/login           → JWT token
GET    /providers            → listar todos (com filtro lat/lng)
GET    /providers/{id}       → perfil público
PATCH  /providers/{id}       → atualizar portfolio
```

**Esforço:** ~8h  
**Blocker:** sem isso, app não sai do mock

---

### **FASE 2: Order Management (Semana 2)**
Prioridade: **ALTA** — fluxo principal

**2.1 — Serviços/Pedidos**
```
POST   /services             → criar pedido (cliente)
GET    /services/{id}        → detalhes do serviço
PATCH  /services/{id}/status → aceitar, en_route, in_progress, completed
```

**2.2 — PIN Verification (Edge Function)**
```
POST   /pin-verify-start      → validar PIN início
POST   /pin-verify-conclusion → validar PIN conclusão
```

**2.3 — Real-time status updates**
- [ ] Supabase Realtime: `services` → cliente/prestador
- [ ] Webhook: quando status muda → broadcast

**Esforço:** ~12h  
**Blocker:** ordem de serviço não pode ser criada

---

### **FASE 3: Notifications & Location (Semana 3)**
Prioridade: **MÉDIA** — UX melhor

**3.1 — Push Notifications**
- [ ] `expo-notifications` configurado
- [ ] Edge Function: listener em `services` → emit notif
- [ ] Notif tipos: novo pedido, aceito, prestador a caminho, concluído

**3.2 — Geolocalização real-time**
- [ ] Prestador envia `lat/lng` em intervalo
- [ ] Edge Function: salva em `provider_locations`
- [ ] Cliente vê posição ao vivo no mapa

**Esforço:** ~10h

---

### **FASE 4: Payments & Ratings (Semana 4)**
Prioridade: **BAIXA** — não bloqueia fluxo

**4.1 — Pagamentos**
- [ ] Integração Pix/Stripe (já existe na web?)
- [ ] `payments` table
- [ ] Edge Function: webhook do provider → marcar como pago

**4.2 — Avaliações**
- [ ] `ratings` table (cliente → prestador)
- [ ] Cálculo de `provider.rating_avg`
- [ ] Histórico de avaliações público

**Esforço:** ~8h

---

## 🗂️ Database Schema (Recomendado)

```sql
-- Usuarios (clientes + prestadores)
CREATE TABLE users (
  id UUID PRIMARY KEY (auth.users.id),
  email TEXT,
  name TEXT,
  phone TEXT,
  role ENUM('cliente', 'prestador'),
  verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Prestadores (extensão de users)
CREATE TABLE providers (
  id UUID PRIMARY KEY (FOREIGN KEY users.id),
  bio TEXT,
  rating_avg FLOAT,
  completed_jobs INT,
  is_online BOOLEAN,
  lat FLOAT,
  lng FLOAT,
  color TEXT,        -- pin color customizado
  icon TEXT,         -- pin icon
  pin_message TEXT,  -- custom message
  category ENUM('Mudança', 'Frete', 'Entrega'),
  price_from INT,
  vehicles TEXT[],
  equipment TEXT[],
  work_areas TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Serviços/Pedidos
CREATE TABLE services (
  id UUID PRIMARY KEY,
  customer_id UUID (FOREIGN KEY users.id),
  provider_id UUID (FOREIGN KEY providers.id),
  category ENUM('Mudança', 'Frete', 'Entrega'),
  status ENUM('requested', 'accepted', 'en_route', 'in_progress', 'completed', 'cancelled', 'disputed'),
  origin TEXT,
  destination TEXT,
  description TEXT,
  estimated_price INT,
  final_price INT,
  pin_start TEXT,    -- 4 dígitos (hash)
  pin_conclusion TEXT, -- 6 dígitos (hash)
  commitment TEXT,   -- HMAC-SHA256 verification
  photos TEXT[],
  needs_helper BOOLEAN,
  scheduled BOOLEAN,
  scheduled_for TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Avaliações
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  service_id UUID (FOREIGN KEY services.id),
  rater_id UUID (FOREIGN KEY users.id),
  ratee_id UUID (FOREIGN KEY users.id),
  score FLOAT (1-5),
  comment TEXT,
  created_at TIMESTAMP
);

-- Pagamentos
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  service_id UUID (FOREIGN KEY services.id),
  provider_id UUID (FOREIGN KEY providers.id),
  amount INT,
  method ENUM('pix', 'stripe'),
  status ENUM('pending', 'paid', 'refunded'),
  created_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- Mensagens (chat)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  service_id UUID (FOREIGN KEY services.id),
  sender_id UUID (FOREIGN KEY users.id),
  content TEXT,
  created_at TIMESTAMP
);
```

---

## 🔌 API Contracts (Detalhado)

### Auth
```typescript
// POST /auth/signup
{
  "email": "user@example.com",
  "password": "...",
  "name": "João Silva",
  "phone": "+5521999999999",
  "role": "cliente" | "prestador"
}
→ { token, user: User }

// POST /auth/login
{ "email", "password" }
→ { token, user: User }
```

### Providers
```typescript
// GET /providers?lat=-22.9&lng=-43.17&radius=5&category=Frete
→ Provider[]

// GET /providers/{id}
→ Provider (with portfolio)

// PATCH /providers/{id}/status
{ "online": boolean }
→ { ok: true }
```

### Services
```typescript
// POST /services
{
  "provider_id": "uuid",
  "category": "Frete",
  "origin": "Rua A",
  "destination": "Rua B",
  "description": "...",
  "photos": [...],
  "estimated_price": 150,
  "needs_helper": false,
  "scheduled": false,
  "scheduled_for": null
}
→ { id, pin_start, pin_conclusion, commitment }

// PATCH /services/{id}/status
{ "status": "accepted" | "en_route" | "in_progress" | "completed" }
→ { ok: true }

// POST /pin-verify-start
{ "service_id": "uuid", "pin_entered": "1234" }
→ { ok: true, error?: string }
```

---

## 📱 React Native Integration Checklist

### Autenticação
- [ ] Remover `AuthContext` mock
- [ ] Integrar `@supabase/supabase-js`
- [ ] Login/signup → Supabase Auth
- [ ] Persistir token em Secure Storage
- [ ] Auto-login na abertura

### Serviços
- [ ] `ServiceContext.createService()` → POST /services
- [ ] Receber `pin_start`, `pin_conclusion`, `commitment`
- [ ] Salvar localmente (AsyncStorage) antes de HMAC server-side
- [ ] Real-time listener no status do serviço

### Mapa
- [ ] GET /providers → refetch periódico (ou WebSocket)
- [ ] Mostrar prestadores reais do Supabase
- [ ] Portfolio modal → dados reais

### Notificações
- [ ] Configurar `expo-notifications`
- [ ] Registrar device token no Supabase
- [ ] Edge Function listener → emit notif

---

## ⚠️ Decisões Arquiteturais

| Item | Decisão | Motivo |
|------|---------|--------|
| PIN Verification | Server-side (Edge Function) | Segurança — não confia no hash do cliente |
| Real-time | Supabase Realtime | Nativo, sem WebSocket manual |
| Auth | Supabase Auth | Integração simples, JWTs |
| Pagamentos | Stripe/Pix (backend) | App não toca em cartões |
| Location | Polling cada 30s | WebSocket overkill, Realtime.postgres_changes suficiente |

---

## 📋 Próximos Passos

1. **Você:** Enviar schema SQL ou prints das tabelas Supabase
2. **Você:** Listar edge functions já criadas
3. **Eu:** Criar Supabase client no projeto React Native
4. **Eu:** Integrar Fase 1 (auth + providers)
5. **Ambos:** Testar fluxo end-to-end no App

---

_Ajudaê — Backend Integration Plan — Ready for execution_
