# MVP_STATUS.md — Ajudaê
> Estado atual do app para testes fechados. Atualizado em 2026-05-06.

---

## Resumo Executivo

O app está **pronto para o primeiro build (TestFlight + APK)**. Todos os fluxos críticos — autenticação, onboarding, LGPD, dual-PIN, push notifications, portfólio persistido — estão implementados com dados reais do Supabase. Todos os mocks foram removidos. Identidade visual alinhada ao branding (Nunito, #FFC90E, zero emojis). Os únicos bloqueadores para o build são externos: configurar EAS Secrets, rotacionar a anon key e fornecer os assets do mascote.

| Dimensão | Status |
|---|---|
| Fluxos de negócio core | ✅ 100% testável |
| Segurança dual-PIN | ✅ Implementado (commitment hash djb2) |
| UI Blocking durante serviço | ✅ Implementado |
| Push notifications foreground | ✅ 22 eventos — todos os fluxos cobertos |
| Push notifications background | ⚠️ Expo Push API configurada — requer expo_push_token salvo no server |
| LGPD / permissões OS | ✅ Implementado com sync no DB |
| Backend real (Auth + Edge Fns) | ✅ Supabase integrado |
| MOCK_PROVIDERS → API real | ✅ `lib/providers.ts` com Haversine 30km |
| Todos os mocks removidos | ✅ Dados reais ou estados vazios honestos |
| Portfolio persistence | ✅ Debounced writes → Supabase `portfolio_data` JSONB |
| Identidade visual (brand) | ✅ #FFC90E, Nunito, zero emojis, BottomTabBar |
| ProposalAlert (99-style) | ✅ Overlay fullscreen + countdown 60s |
| Mapa real (coords GPS) | ❌ react-native-maps pronto; coords reais pendentes no DB |
| Chat em tempo real | ❌ Dados estáticos |
| Pagamento real | ❌ Pix copy button; sem gateway integrado |
| Mascote assets | ❌ EmptyState usa placeholder circular |

---

## Código-base

| Métrica | Valor |
|---|---|
| Total de linhas estimado | ~18.000+ |
| Telas (`app/*.tsx`) | 26 |
| Componentes (`components/`) | 30+ (EmptyState, BottomTabBar, ProposalAlert adicionados) |
| Contextos (`contexts/`) | 8 (Auth, Permissions, Notifications, Portfolio, Service, Requests, Payments, Support) |
| Edge Functions (Supabase) | 5+ (request_create, request_update_status, request_complete_with_otp, notify_new_proposal, ...) |
| Último PR mergeado | #22 (2026-05-11) |
| Branch de produção | `main` |

---

## Fluxos Funcionais (testáveis agora)

### Autenticação
| Tela | O que funciona |
|---|---|
| `auth.tsx` | Login/cadastro via Supabase Auth, validação de e-mail com OTP, seleção de role, persistência de sessão |

Criar contas reais via onboarding do app. Para QA: criar 1 conta cliente e 1 conta prestador no Supabase.

---

### LGPD & Permissões (novo em 2026-05-04)

Fluxo exibido automaticamente após a primeira autenticação:

```
Login/Cadastro
  ↓
Tela LGPD (blocking) — explica coleta de dados, links para Política e Termos
  ↓ aceitar
Tela Localização — "Permitir" (dispara dialog OS) ou "Agora não"
  ↓
Tela Notificações — "Permitir" ou "Agora não"
  ↓
App desbloqueado
```

Após isso, o usuário pode reativar permissões a qualquer momento em **Perfil → Configurações**.

- Toggle verde = granted
- Toggle cinza + "Toque para ativar" = OS pode ainda pedir
- Ícone laranja + "Abrir Configurações" = negado permanentemente → abre OS Settings

Todo consentimento é salvo no campo `lgpd_accepted`, `geolocation_requested`, `camera_requested`, `notifications_requested` e `last_consent_update` em `profiles` no Supabase.

---

### Onboarding (5 etapas)
| Etapa | Conteúdo |
|---|---|
| 1 | Boas-vindas com animação |
| 2 | Nome (mín. 3 chars, validação em tempo real) |
| 3 | Telefone (DDD + 8–9 dígitos, máscara) |
| 4 | Permissão GPS (pode pular — integra com `PermissionsContext`) |
| 5 | "Tudo pronto!" com mensagem diferenciada por role |

`geolocation_requested` agora persiste no DB ao finalizar onboarding.

---

### Fluxo do Cliente

```
Home → Solicitar pedido → Aguardar prestador → Rastreamento →
→ Prestador chegou → Digitar PIN início (4 dígitos) →
→ Serviço em andamento → Mostrar PIN conclusão (6 dígitos) →
→ Serviço concluído → Avaliação
```

| Tela | O que funciona |
|---|---|
| `index.tsx` (cliente) | Home com mapa, pin card persiste sobre o sheet, filtros por categoria, localizar com spin animation |
| `marketplace.tsx` | Lista de prestadores com filtros, mapa com gradiente, modal fullscreen com CTA navegando para `/request` |
| `provider/[id].tsx` | Perfil completo sincronizado com `PortfolioContext`; helper badge "Sim"/"Não" |
| `request.tsx` | Formulário com origem/destino, fotos, agendamento; toggle de ajudante oculto se prestador não suporta |
| `track.tsx` | Rastreamento do pedido, status em tempo real (mock), acesso ao ticket |
| `confirm-start-pin.tsx` | Input 4 dígitos, validação offline (djb2 commitment hash), max 5 tentativas → disputa |
| `otp-modal.tsx` | Exibe PIN de conclusão de 6 dígitos |
| `rate.tsx` | Avaliação em estrelas + comentário após conclusão |
| `payment.tsx` | Tela de pagamento (mock visual) |

---

### Fluxo do Prestador

```
Home (online) → Receber solicitação → Aceitar → En route →
→ Exibir PIN de início (4 dígitos) → Cliente confirma →
→ Serviço em andamento → Digitar PIN de conclusão (6 dígitos) →
→ Concluído
```

| Tela | O que funciona |
|---|---|
| `index.tsx` (prestador) | Home reestruturada por urgência, toggle verde sólido, ampulheta animada, portfólio como 4º tab |
| `portfolio.tsx` | Editor completo (bio, serviços, promoção, pin-card, ajudantes on/off com contador) — sincronizado via `PortfolioContext` |
| `job.tsx` | Detalhes do job ativo, aceite, status, chat |
| `start-pin.tsx` | Exibe `pin_start` com animação de pulso, funciona offline |
| `job-otp.tsx` | Input de 6 dígitos para PIN de conclusão, validação offline, max 5 tentativas → disputa |

---

### Push Notifications (novo em 2026-05-04)

22 eventos automáticos cobrindo todos os fluxos:

| Grupo | Eventos disparados |
|---|---|
| **Cliente — Serviço** | `service_requested/accepted/en_route/in_progress/completed/cancelled/disputed` |
| **Cliente — PIN** | `pin_start_wrong` (X tentativas restantes), `pin_start_disputed`, `pin_end_wrong`, `pin_end_disputed` |
| **Prestador — Job** | `new_job_request`, `job_accepted/en_route/in_progress/completed/cancelled/disputed` |
| **Compartilhado** | `new_message`, `payment_authorized`, `payout_processed`, `email_confirmed`, `provider_verified` |

As notificações disparam automaticamente ao alterar `ServiceContext`. Toque na notificação navega para a tela correta.

---

### Sistema Dual-PIN (Segurança)
| Propriedade | Valor |
|---|---|
| Algoritmo | djb2 duplo-passe: `hash(serviceId \| pin_start \| pin_conclusion)` |
| Dependência de rede | Nenhuma — 100% offline |
| Tentativas máximas | 5 → status `disputed` automático |
| `pin_start` | 4 dígitos — prestador exibe, cliente digita |
| `pin_conclusion` | 6 dígitos — cliente exibe, prestador digita |

---

### UI Blocking durante Serviço Ativo
- **Cliente**: só acessa `track`, `confirm-start-pin`, `otp-modal`, `ticket`, `rate`, `inbox`
- **Prestador**: só acessa `job`, `start-pin`, `job-otp`, `ticket`, `inbox`
- Redirecionamento automático idêntico ao Uber/99

---

### Fluxos Auxiliares
| Tela/Componente | Status |
|---|---|
| `inbox.tsx` | Lista de conversas por role, hubs de suporte |
| `support.tsx` | Tela de suporte com categorias |
| `ticket.tsx` | Abertura de ticket de disputa |
| `ProfileOverlay.tsx` | Overlay com sub-menus completos (Histórico, Avaliações, Segurança, Configurações com toggles reais) |

---

## O que NÃO está pronto para produção

| Item | Detalhe | Bloqueador de build? |
|---|---|---|
| Mapa real GPS | `react-native-maps` integrado; coords reais dos prestadores precisam estar no DB | Não |
| WebSocket posições | Sem stream de posições em tempo real dos prestadores | Não |
| Pagamento real | Pix copy button existe; sem integração com gateway | Não |
| Chat em tempo real | `chat.tsx` mostra estado vazio honesto; sem WebSocket | Não |
| Push em background | Funciona em foreground; server precisa salvar `expo_push_token` e chamar Expo Push API | Não |
| djb2 → HMAC-SHA256 | Migrar para `expo-crypto` antes de produção pública | Não |
| Upload de fotos | `request.tsx` tem picker mas sem upload real (sem S3/GCS) | Não |
| LGPD exclusão de conta | `DELETE /users/me` (Art. 18) não implementado | Não |
| Mascote assets | `EmptyState` usa placeholder circular; assets em `assets/images/mascot/` | Não (visual) |
| **EAS Secrets** | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | **Sim — build** |
| **Anon key rotation** | Chave exposta no git history (2026-05-06) — rotacionar antes de qualquer deploy público | **Sim — segurança** |

---

## Roteiro de Teste Sugerido (QA Fechado)

### Cenário 0 — LGPD e Permissões (novo)
1. Instalar via Expo Go em dispositivo novo (ou limpar dados do app)
2. Fazer login → verificar que a tela LGPD aparece e bloqueia o app
3. Aceitar → verificar as telas de localização e notificações em sequência
4. Ir em Perfil → Configurações → verificar que toggles mostram estado real do OS
5. Negar uma permissão pelo OS e reabrir o app → verificar badge "Abrir Configurações" laranja

### Cenário 1 — Fluxo completo feliz
1. Criar conta como **cliente** → completar onboarding
2. Solicitar um frete com fotos e agendamento
3. Mudar para conta **prestador** → aceitar o pedido
4. Verificar notificação push em cada mudança de status
5. Exibir PIN de início → cliente digita → ambos avançam para `in_progress`
6. Cliente anota PIN de conclusão → prestador digita → conclusão e avaliação

### Cenário 2 — PIN incorreto (segurança)
1. Digitar PINs incorretos repetidamente
2. Verificar notificação "PIN incorreto — X tentativas restantes"
3. Após 5 tentativas: notificação "Limite atingido" + status `disputed` automático

### Cenário 3 — UI Blocking
1. Com serviço ativo, tentar navegar para `/marketplace` ou `/auth`
2. Verificar redirecionamento automático para `/track` ou `/job`

### Cenário 4 — Reinício do app
1. Com serviço em andamento, forçar fechamento
2. Reabrir → estado restaurado do AsyncStorage; notificações não re-disparam

---

## Métricas de Completude por Área

| Área | Completude estimada |
|---|---|
| Autenticação e onboarding | 95% |
| LGPD e permissões OS | 95% |
| Push notifications (foreground) | 98% |
| Push notifications (background) | 40% (Expo Push API configurada; falta save token no server) |
| Fluxo do cliente (criação → conclusão) | 95% |
| Fluxo do prestador (aceitação → conclusão) | 95% |
| Sistema de segurança dual-PIN | 95% |
| Dashboard do prestador (UX/UI) | 98% |
| Portfólio do prestador | 85% (UX 100%, persistence ✅, S3 upload ❌) |
| Marketplace (UX/UI) | 92% |
| ProposalAlert (UX) | 100% |
| Identidade visual (brand) | 98% (mascote assets pendentes) |
| Inbox / Chat | 35% (estado vazio honesto; WebSocket pendente) |
| Pagamentos | 25% (Pix copy button; gateway pendente) |
| Mapa e geolocalização | 35% (react-native-maps pronto; coords reais pendentes) |
| **MVP build-ready (TestFlight/APK)** | **~95%** |

---

## Próximos Passos para o Primeiro Build

### Pré-requisitos externos (bloqueadores reais)
1. **Rotacionar anon key** — Supabase Dashboard → Settings → API → Generate new key
2. **Configurar EAS Secrets** — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
3. **Fornecer mascote assets** — `assets/images/mascot/mascot-running.png` + `mascot-standing.png`
4. **Conta Apple Developer** — bundle ID `com.ajuda.app` registrado (para iOS)

### Build commands
```bash
cd artifacts/fretex
eas build --platform android --profile preview  # APK para testes
eas build --platform ios --profile preview       # IPA para TestFlight
```

### Pós-build (próximas iterações)
1. **Coords GPS reais** — popular `location_lat`/`location_lng` nos prestadores no DB
2. **Push background** — salvar `expo_push_token` no `profiles` e chamar Expo Push API server-side
3. **Chat real** — Supabase Realtime na tabela `messages`
4. **Pagamento** — integração Pix/Mercado Pago
5. **djb2 → HMAC-SHA256** — migrar via `expo-crypto` antes da produção pública
6. **LGPD exclusão** — endpoint `DELETE /users/me`

---

## Documentação de Referência

| Documento | Conteúdo |
|---|---|
| `arquitetura/PROGRESS.md` | 33 itens implementados com detalhe técnico |
| `arquitetura/HANDOFF_2026-05-06.md` | **Latest** — CRM Web, formulários, security hardening |
| `arquitetura/HANDOFF_2026-05-04.md` | Handoff anterior (bugs, notificações, LGPD) |
| `arquitetura/HANDOFF_2026-04-28.md` | Handoff UI Layer v2 (contratos de API, decisões de design) |
| `arquitetura/PIN_SYSTEM.md` | Sistema dual-PIN detalhado |
| `arquitetura/Comissionados/Documentos Técnicos/DB_SCHEMA.md` | Schema do banco de dados |

---

_Ajudaê — MVP Status v4.0 — 2026-05-14 — Brand Identity + mocks removidos + portfolio persistido, ~95% build-ready_
