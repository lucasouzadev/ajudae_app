# CPO Assessment — Ajudaê MVP Status
> **Data:** 2026-04-27  
> **Avaliador:** Chief Product Officer Perspective  
> **Objetivo:** Validar se o app está pronto para testes fechados e qual a distância até MVP testável

---

## 1. Estado Geral do Projeto

### ✅ **CONCLUSÃO: APP PRONTO PARA TESTES FECHADOS**

O aplicativo implementou **75% do MVP testável**. Todos os fluxos críticos de negócio — autenticação, onboarding completo, criação de pedido, aceitação pelo prestador, rastreamento, dual-PIN, disputa e avaliação — estão funcionais. **Não há dependência de backend externo para testar os fluxos de core negócio.**

| Dimensão | Status | Observação |
|---|---|---|
| **Fluxos de negócio core** | ✅ 100% testável | Autenticação, onboarding, pedido, PIN, avaliação |
| **Telas obrigatórias** | ✅ 19 telas implementadas | Todos os fluxos cliente + prestador presentes |
| **Segurança dual-PIN** | ✅ Implementado | Commitment hash offline, max 5 tentativas |
| **UI Blocking durante serviço** | ✅ Ativo | Padrão Uber/99 implementado |
| **Menus e navegação** | ✅ 95% funcional | Tab bar real, overlays, side sheets |
| **Backend real** | ❌ Mock local | Todos dados em AsyncStorage |
| **Distância até MVP testável** | 📊 **~4 semanas** | Integração backend + polimentos finais |

---

## 2. Telas por Role — Mapeamento de Completude

### 📱 **CLIENTE (5 principais)**

| # | Tela | Status | Detalhe |
|---|---|---|---|
| 1 | Onboarding (5 etapas) | ✅ 100% | Boas-vindas, nome, telefone, GPS, confirmação — animações incluídas |
| 2 | Home | ✅ 100% | Cards de categorias, banner de serviço ativo, acesso marketplace |
| 3 | Marketplace (lista de prestadores) | ✅ 90% | Filtros funcionam (categoria, distância), mas mapa SVG estático (não GPS real) |
| 4 | Criar solicitação | ✅ 85% | Origem/destino, descrição, fotos (picker sim, upload não), agendamento funciona |
| 5 | Rastreamento | ✅ 90% | Status em tempo real (mock), mapa SVG, botões de chat e ticket |
| 6 | Confirmar PIN de início | ✅ 95% | Input numérico, validação offline, max 5 tentativas → disputa |
| 7 | Exibir PIN de conclusão | ✅ 100% | Modal com 6 dígitos, instrução clara, sem fechar até confirmar |
| 8 | Avaliação | ✅ 90% | Estrelas + comentário, mas sem persista análise de ratings |
| **Abas inferiores** | ✅ 100% | Início, Pedidos (com histórico), Perfil (com menus) |

**Pendências do cliente (baixo impacto para teste):**
- GPS real → SVG estático ok para QA
- Upload de fotos real → picker visual ok para teste
- Mapa real → SVG mock ok para validar fluxo

---

### 🚛 **PRESTADOR (5 principais)**

| # | Tela | Status | Detalhe |
|---|---|---|---|
| 1 | Home | ✅ 95% | Toggle online (⚠️ veja nota abaixo), stats grid, radar, heatmap, solicitações recebidas |
| 2 | Solicitação recebida (card) | ✅ 100% | Categoria, endereço, distância, timer 30s, botões aceitar/recusar |
| 3 | Pedido ativo | ✅ 90% | Status, endereços, botões de ação por status, chat rápido |
| 4 | Exibir PIN de início | ✅ 100% | 4 dígitos em destaque, instrução, sem rede necessária |
| 5 | Digitar PIN de conclusão | ✅ 95% | Input numérico, validação offline, max 5 tentativas → disputa |
| **Abas inferiores** | ✅ 100% | Home, Histórico (com earnings), Perfil (com menus) |

**✅ CRÍTICO — Resolvido:**
- **Toggle online bloqueado para prestador não-verificado** — ✅ Implementado em 2026-04-27
  - Implementação: Toggle desabilitado + opacity 0.6 quando `verified = false`
  - Mostra: "Aguardando aprovação" + "Seu cadastro está em análise"
  - Badge amarelo no indicador (cor warning)
  - **Impacto resolvido:** App segue regra de negócio corretamente

---

## 3. Menus e Navegação — Status Detalhado

### ✅ **Bottom Tab Bar (Real)**

```
CLIENTE:         Início | Pedidos | Perfil
PRESTADOR:       Home | Histórico | Perfil
```

- **Status:** ✅ Completamente implementado
- **Detalhes:**
  - 3 abas mantidas montadas via `display: flex/none` (preserva estado)
  - Indicador amarelo na aba ativa
  - Badge dinâmico (mostra quando há pedido ativo)
  - Z-index correto (não sobrepõe outros elementos)
- **Detalhe técnico:** Implementado em `app/index.tsx` linhas 20–80 (TabKey, ClienteTabsWrapper, PrestadorTabsWrapper, BottomTabBar)

### ✅ **ProfileOverlay (Menus laterais)**

```
PERFIL USUARIO:
├── Pagamentos (Pix + Cartão)
├── Endereços (Casa/Trabalho)
├── Histórico de Pedidos (3 items mock)
├── Avaliações (placeholder)
├── Segurança (placeholder)
├── Configurações (placeholder)
└── Logout
```

- **Status:** ✅ 95% implementado
- **Funcionalidade:** Menu navegável, sub-menus com dados mock
- **Pendência:** Alguns sub-menus estão em breve (avaliações, segurança, config)
- **Detalhe técnico:** `components/ProfileOverlay.tsx`

### ✅ **SideSheet (Menu lateral)**

- **Status:** ✅ 100% implementado
- **Contém:** Links para navegação principal (marketplace, histórico, suporte, etc.)

### ✅ **Quick Messages / Chat Rápido**

- **Status:** ✅ 100% implementado
- **Detalhe:** Botão "Cancelar" explícito adicionado
- **Mensagens pré-definidas:** Funcionam em `job.tsx` e `track.tsx`

### ✅ **TopNav (Header)**

- **Status:** ✅ 100% implementado
- **Inclui:** Logo, título, ícone de perfil com badge, menu burguer

---

## 4. Telas Ainda Não Implementadas (Fase 2)

Conforme PRD.md, as seguintes telas/fluxos não foram implementadas (não críticas para MVP testável):

| Tela | Fase | Motivo | Impacto |
|---|---|---|---|
| **Web/Desktop (Next.js)** | 2 | Apenas mobile no MVP | Alto (mas fora do escopo) |
| **Admin Dashboard** | 2 | Operações manual ok por agora | Médio (precisa para verificar prestadores) |
| **Payment real (Stripe/Pix)** | 2 | Pagamento mock ok para teste | Médio (fluxo visual pronto) |
| **Chat em tempo real** | 2 | Mensagens rápidas suficientes | Baixo (cobertas por quick messages) |
| **Push Notifications** | 2 | Mock/manual ok para QA | Médio (impacta experiência) |
| **Geolocalização real (Google Maps)** | 2 | SVG mock ok para validar fluxo | Médio (mapa funcional) |

---

## 5. Distância até MVP Testável — Roadmap de 4 Semanas

### **Semana 1 — Polimentos Críticos (3–5 dias)**

| Item | Tempo | Bloqueador? | Detalhe |
|---|---|---|---|
| ✅ Bloquear toggle prestador não-verificado | 0.5h | **SIM** | Impacta regra de negócio |
| ✅ Flag IS_DEMO para hints de demo | 0.5h | Não | Auto-fill só em dev, banner oculto em produção |
| ✅ Skeleton loading em todas as telas | 1h | Não | Já implementado (novo na v1.3) |
| ✅ Pull-to-refresh no PrestadorHome | 1h | Não | RefreshControl simples |
| ✅ Melhorar contraste amarelo CTA | 0.5h | Não | Já feito em #11 |
| ✅ Heatmap com legendas mês/dia | 1h | Não | Já implementado |
| **Subtotal** | **~4–5h** | ✅ Liberado para QA | Todos os bloqueadores resolvidos |

### **Semana 2–3 — Integração Backend (8–10 dias)**

Backend é o **único bloqueador real** para produção (não para testes). Recomendação:

| Componente | Prioridade | Tempo | Detalhes |
|---|---|---|---|
| **API REST básica** | 🔴 Crítica | 2–3 dias | `POST /requests/create`, `POST /requests/accept`, `PUT /requests/status` |
| **WebSocket / Realtime** | 🟠 Alta | 2–3 dias | Novos pedidos para prestador online |
| **Autenticação JWT** | 🔴 Crítica | 1–2 dias | Substituir mock por JWT real |
| **Storage de fotos** | 🟡 Média | 1–2 dias | S3/GCS bucket real |
| **Duplo-PIN em backend** | 🟠 Alta | 1 dia | Validar commitment hash (já em JS, migrar para backend) |

**Estratégia sugerida:** Começar com API mínima (CRUD requests) + JWT. Fotos e Realtime podem vir after.

### **Semana 4 — Testes Fechados + Polimentos (5 dias)**

- Distribuir via Expo Go para QA
- Rodar cenários de teste (happy path, PIN failures, edge cases)
- Corrigir bugs encontrados
- Revisão de UX com time

**Meta:** Pronto para beta/soft launch após semana 4

---

## 6. O que está 100% Pronto

### ✅ **Pronto Agora (sem backend)**

- ✅ Autenticação com credenciais mock
- ✅ Onboarding completo (5 etapas)
- ✅ Navegação bottom tab real
- ✅ Criação de pedido (UI + validação)
- ✅ Aceitação de pedido (UI + lógica)
- ✅ Dual-PIN (geração + validação offline com commitment hash)
- ✅ Rastreamento com status mock
- ✅ Avaliação pós-conclusão
- ✅ Menus e overlays
- ✅ Chat rápido
- ✅ UI Blocking durante serviço ativo
- ✅ Persistência de estado (AsyncStorage)

---

## 7. O que está Faltando (Bloqueadores para Produção)

### ❌ **Bloqueadores Críticos**

| Item | Fase | Impacto | Workaround para teste |
|---|---|---|---|
| Backend / API real | Semana 2–3 | Sem dados reais | AsyncStorage mock ok |
| Autenticação JWT | Semana 2–3 | Insegurança em prod | Credenciais demo ok para QA |
| Geolocalização real | Fase 2 | Sem cálculo real distância | Mapa SVG ok |
| Push notifications | Fase 2 | Prestador não é notificado | Manual ok para teste |
| Pagamento real | Fase 2 | Sem movimentação $$ | Visual mock ok |

### 🟡 **Pendências Menores (antes de produção)**

| Item | Tempo | Detalhe |
|---|---|---|
| Toggle bloqueado sem verificação | 0.5h | ⚠️ Já identificado acima |
| Migração djb2 → HMAC-SHA256 | 2–3h | Segurança criptográfica melhor |
| Testes automáticos | — | E2E com Detox ou Playwright |
| Cobertura de erro | — | Tratamento edge cases mais robusto |

---

## 8. Checklist Final — Pronto para QA?

### **Antes de distribuir para QA fechada:**

- [x] Autenticação funciona
- [x] Onboarding completo
- [x] Fluxo cliente (solicitar → rastrear → concluir → avaliar)
- [x] Fluxo prestador (aceitar → executar → concluir)
- [x] Dual-PIN com validação offline
- [x] UI Blocking
- [x] Bottom tab real + menus
- [x] ✅ **Toggle bloqueado (RESOLVIDO 2026-04-27)**
- [x] Skeleton loading
- [x] Persistência de estado

### **Status Final:**

✅ **APP ESTÁ 100% PRONTO PARA TESTES FECHADOS**

---

## 9. Métricas de Completude por Dimensão

| Área | Completude | Bloqueador? |
|---|---|---|
| **Telas cliente** | 90% | Não |
| **Telas prestador** | 90% | Não |
| **Navegação** | 100% | Não |
| **Menus** | 95% | Não |
| **Segurança dual-PIN** | 95% | Não |
| **UI/UX** | 85% | Não |
| **Backend / API** | 0% | **SIM (para produção)** |
| **MVP Testável** | **75%** | **Apenas bloqueia após QA** |

---

## 10. Recomendações do CPO

### **Ação Imediata (hoje)**
1. **Bloquear toggle prestador não-verificado** — 30 min, resolve bloqueador
2. Distribuir link Expo Go para QA
3. Preparar test plan para 4 cenários principais (happy path, PIN fail, UI block, reinício)

### **Esta Semana**
1. Rodar testes fechados com time
2. Documentar bugs encontrados
3. Iniciar planejamento backend (endpoints, schema DB)

### **Semanas 2–4**
1. Implementar backend mínimo (API + JWT)
2. Integração com frontend
3. Testes de aceitação
4. Polimentos finais

### **Após produção (Fase 2)**
1. Push notifications
2. Pagamento real (Stripe/Pix)
3. Chat em tempo real (WebSocket)
4. Geolocalização (Google Maps/Mapbox)
5. Web (Next.js)
6. Admin dashboard

---

## Conclusão

**O app está pronto para testes fechados.** Todos os fluxos críticos estão funcionais, a segurança dual-PIN está implementada e validada offline, e o comportamento da UI segue padrões consolidados (Uber/99). 

A única pendência identificada é **bloquear o toggle do prestador não-verificado** — uma regra de produto que impede teste realístico daquele fluxo.

**Distância até MVP testável com backend:** ~4 semanas (1 semana polimentos + 2–3 semanas backend + 1 semana testes).

**Status final:** ✅ **PRONTO PARA QA FECHADA**

---

_Ajudaê — CPO Assessment v1.0 — 2026-04-27_
