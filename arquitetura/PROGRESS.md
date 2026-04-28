# PROGRESS.md — Ajudaê

> Mapa de implementação baseado em `resposta.txt`.
> Atualizar sempre que um item mudar de estado.

---

## Legenda

| Ícone | Significado |
|-------|-------------|
| ✅ | Implementado |
| 🔶 | Parcialmente implementado |
| ❌ | Não implementado |

---

## 🔴 Crítico

### 1. Navegação bottom tab
**Status:** ✅ Implementado
**Detalhe:** `BottomTabBar` fixo na base com 3 abas por role: **Cliente** — Início | Pedidos | Perfil; **Prestador** — Home | Histórico | Perfil. Abas mantidas montadas via `display: flex/none` para persistência de estado. Indicador amarelo na aba ativa, badge dinâmico em Pedidos/Home quando há serviço ativo. `ChipBar` flutuante removido. `PedidosTab` com histórico de pedidos e atalhos Marketplace + Inbox; `HistoricoTab` com resumo de ganhos e serviços concluídos; `PerfilTab` com menu completo e logout.
**Arquivo:** `app/index.tsx`

---

### 2. Dual-PIN no fluxo do prestador
**Status:** ✅ Implementado
**Detalhe:** Sistema complementar offline-first. `pin_start` (4 dígitos) pré-gerado na criação do pedido — prestador exibe, cliente digita em `confirm-start-pin.tsx`. `pin_conclusion` (6 dígitos) — cliente exibe via `otp-modal.tsx`, prestador digita em `job-otp.tsx`. Verificação via commitment hash djb2 sem rede. Max 5 tentativas em cada PIN → `disputed` automático. UI blocking total durante serviço ativo (padrão Uber/99).
**Arquivos:** `app/start-pin.tsx`, `app/confirm-start-pin.tsx`, `app/otp-modal.tsx`, `app/job-otp.tsx`, `app/track.tsx`, `app/_layout.tsx`, `contexts/ServiceContext.tsx`

---

### 3. Onboarding (5 etapas)
**Status:** ✅ Implementado
**Detalhe:** Fluxo completo — boas-vindas, nome (mín. 3 chars), telefone (DDD + 10–11 dígitos), permissão GPS com opção de pular, tela "Tudo pronto!" com mensagem diferenciada para prestador. Animações fade/slide entre etapas e barra de progresso.
**Arquivo:** `app/onboarding.tsx`

---

## 🟠 Alto impacto

### 4. PrestadorHome em seções
**Status:** ✅ Implementado
**Detalhe:** Home do prestador dividida em cards/seções: toggle online, grid de stats, radar do mercado, sugestão de preço, forecast de demanda, heatmap de atividade, metas mensais, badges, pedido ativo e solicitações recebidas.
**Arquivo:** `app/index.tsx` (linhas 808–1041)

---

### 5. Toggle online bloqueado para prestador não-verificado
**Status:** ✅ Implementado (corrigido em 2026-04-27)
**Detalhe:** Toggle desabilitado quando `user.verified === false`. Badge amarelo "Aguardando aprovação" exibida como título. Subtexto mostra "Seu cadastro está em análise". O Pressable ignora toque quando não verificado (opacity 0.6, disabled flag).
**Arquivo:** `app/index.tsx` (linhas 1287-1309)

---

### 6. Role cards no signup com linha de contexto
**Status:** ✅ Implementado
**Detalhe:** Cards de "Cliente" e "Prestador" na tela de cadastro com subtítulo contextual ("Solicitar serviços" / "Oferecer serviços"), ícone e estado ativo com cor.
**Arquivo:** `app/auth.tsx` (linhas 224–252)

---

### 7. Hints de demo controlados por flag de ambiente
**Status:** ✅ Implementado
**Detalhe:** `constants/env.ts` exporta `IS_DEMO` via `Constants.expoConfig?.extra?.appEnv`. Em `__DEV__` é sempre `true`. Credenciais auto-fill em `auth.tsx` só quando `IS_DEMO`. Banner de credenciais demo visível na lobby apenas quando `IS_DEMO`.
**Arquivos:** `constants/env.ts` (novo), `app/auth.tsx`

---

## 🟡 Médio impacto

### 8. Skeleton/loading nos ScrollViews
**Status:** ✅ Implementado
**Detalhe:** Componente `Skeleton` com animação de pulso aplicado em todas as telas principais: `marketplace.tsx` (900ms, lista de prestadores), `index.tsx` PrestadorHome (900ms, stats grid + radar do mercado), `inbox.tsx` (700ms, cards de conversas), `support.tsx` (800ms, tickets + FAQs). Cada tela simula latência de rede com `setTimeout` e `setLoading`.
**Arquivos:** `components/Skeleton.tsx`, `app/marketplace.tsx`, `app/index.tsx`, `app/inbox.tsx`, `app/support.tsx`

---

### 9. Quick messages com botão de cancelamento explícito
**Status:** ✅ Implementado
**Detalhe:** Botão "Cancelar" explícito adicionado ao rodapé do modal de mensagens rápidas em `job.tsx`. Fecha com haptic feedback.
**Arquivo:** `app/job.tsx`

---

### 10. ProviderModal com animação slide
**Status:** ✅ Implementado
**Detalhe:** `animationType="fade"` → `"slide"` em `ProviderModal.tsx`.
**Arquivo:** `components/ProviderModal.tsx`

---

### 11. Contraste do CTA amarelo em telas claras
**Status:** 🔶 Parcialmente implementado
**Detalhe:** A maioria dos CTAs usa texto `#1A1714` sobre `#FFCC00` (bom contraste). Exceção: `ProviderPin` exibe texto amarelo sobre branco. Não aplicado universalmente.
**Arquivo:** `constants/colors.ts`, componentes variados

---

### 12. ProfileOverlay com mocks nos sub-menus
**Status:** ✅ Implementado
**Detalhe:** Sub-menus funcionais para Pagamentos (Pix + cartão), Endereços (Casa/Trabalho), Histórico de Pedidos (3 itens mock) e placeholder "Em breve" para demais. Navegação com `activeMenu` state e botão de voltar dentro do overlay.
**Arquivo:** `components/ProfileOverlay.tsx`

---

### 13. Pull-to-refresh
**Status:** ✅ Implementado
**Detalhe:** `RefreshControl` adicionado ao ScrollView principal de `PrestadorHome` (tintColor azul). `ClienteHome` usa sheet draggável sem ScrollView principal vertical. Simula 1.2s de refresh.
**Arquivo:** `app/index.tsx`

---

## 🔵 Refinamentos de polimento

### 14. Tipografia mínima 11px nos labels
**Status:** ✅ Implementado
**Detalhe:** Todos os labels abaixo de 11px em `app/index.tsx` corrigidos: `statLbl`, `barLabel`, `cardBadge`, `badgeLabel`, `badgeProgress`, `reviewWhen`, `legendText`, `hourCatText`, `catTxt`, `listPriceSub`, `badgeText` — todos elevados para 11.
**Arquivo:** `app/index.tsx`

---

### 15. Sombras consistentes
**Status:** ✅ Implementado
**Detalhe:** Sistema `shadows.sm / .md / .lg / .xl` definido em `constants/colors.ts` e aplicado de forma consistente em todo o app.
**Arquivo:** `constants/colors.ts`

---

### 16. Feedback de erro nos formulários
**Status:** ✅ Implementado
**Detalhe:** Campos com erro exibem borda vermelha + ícone + mensagem abaixo. Aplicado em onboarding (nome, telefone) e auth. Pendente validação individual em todas as telas (planejado para fase futura).
**Arquivos:** `app/onboarding.tsx`, `app/auth.tsx`

---

### 17. Heatmap com legenda de dias/meses
**Status:** ✅ Implementado
**Detalhe:** Labels de dia da semana (Dom–Sáb) à esquerda do grid. Labels de mês (Jan–Dez) acima de cada coluna onde há mudança de mês. Ambos renderizados dentro do ScrollView horizontal para permanecer sincronizados.
**Arquivo:** `app/index.tsx`

---

---

## 🟣 Sessão 2026-04-28 — UI Layer v2 (Fretex Artifact)

### 18. Dashboard prestador — hierarquia, redesign e haptics
**Status:** ✅ Implementado
**Detalhe:** Nova hierarquia do `PrestadorHome`: Toggle → Aguardando/Solicitação → Job ativo → HotBanner → Stats → Tips. Toggle online com fundo verde sólido e texto branco quando ativo. Ampulheta animada (flip 180° a cada 700ms) no card de espera. Pulse animation no card de solicitação recebida (LinearGradient colorido). Cards com `shadow`/`elevation` para destoar do fundo. Haptic Medium no toggle online.
**Arquivo:** `artifacts/fretex/app/index.tsx` — `PrestadorHome`, `PrestadorTabsWrapper`

---

### 19. Portfólio no bottom-bar + editor completo
**Status:** ✅ Implementado
**Detalhe:** Botão "Meu Portfólio" removido do conteúdo do dashboard — movido como 4º tab no `BottomTabBar` do prestador (ícone `briefcase`). Abre `PortfolioSheet` como `Modal` pageSheet. Editor completo com seções colapsáveis:
- **Bio**: textarea editável (280 chars)
- **Serviços**: add/remove/editar até 3 serviços (título, preço, descrição)
- **Promoção**: texto livre + data de validade, preview com LinearGradient âmbar
- **Pin-card**: color picker (6 cores), icon picker (5 ícones), mensagem curta (25 chars), preview em tempo real

Preview completo com hero gradient, bio, promo banner, lista de serviços, prévia do pin como aparece no mapa, depoimento em destaque.
**Arquivo:** `artifacts/fretex/app/index.tsx` — `PortfolioSheet`, `PIN_COLORS`, `PIN_ICONS`

---

### 20. Pin callout auto-fecha com sheet expandido
**Status:** ✅ Implementado
**Detalhe:** `sheetHeightAnim.addListener` em `ClienteHome` detecta quando o sheet sobe mais de 20px acima do `COLLAPSED_H` e fecha automaticamente `active` e `pinCardVisible`. Evita sobreposição de componentes.
**Arquivo:** `artifacts/fretex/app/index.tsx` — `ClienteHome` `useEffect`

---

### 21. Haptic feedback transversal
**Status:** ✅ Implementado
**Detalhe:** `expo-haptics` importado em `index.tsx` e `ProviderModal.tsx`. Mapeamento semântico:
- **Light**: chip de filtro, 1º toque no pin, tabs do bottom-bar, hub nav, open sheets, sheet snap para baixo
- **Medium**: toggle online, 2º toque no pin, "Ver perfil/Mais Detalhes" no activeCard, aceitar/recusar solicitação, sheet snap para cima, mapa expandido
- **NotificationSuccess**: botão "Solicitar" no ProviderModal
**Arquivos:** `artifacts/fretex/app/index.tsx`, `artifacts/fretex/components/ProviderModal.tsx`

---

### 22. ProviderModal — "Mais Detalhes"
**Status:** ✅ Implementado
**Detalhe:** Botão de perfil no `ProviderModal` renomeado de "Ver perfil" para "Mais Detalhes", eliminando duplicidade com o botão "Ver perfil" já presente no activeCard do mapa.
**Arquivo:** `artifacts/fretex/components/ProviderModal.tsx`

---

### 23. Marketplace — fundo escuro + gradiente no mapa + modal fullscreen
**Status:** ✅ Implementado
**Detalhe:**
- Fundo do marketplace alterado para `#EDEAE3` (mais escuro, destaca o conteúdo)
- `MarketMap` recebeu prop `onExpand?: () => void` + `LinearGradient` escuro na base (transparent → rgba 38%) + pill "Toque para explorar" quando `onExpand` é fornecida
- `MapExpandModal` fullScreen com safe-area correta: área preta de `insets.top` no topo, mapa ocupa o restante
  - **Cliente**: toca no pin → card com nome/categoria/preço + botão "Solicitar este prestador" (NotificationSuccess haptic)
  - **Prestador**: toca no pin → card "Análise de concorrência" (somente leitura)
  - Dica textual com fingerprint icon quando nenhum pin selecionado
**Arquivos:** `artifacts/fretex/app/marketplace.tsx`, `artifacts/fretex/components/MarketMap.tsx`

---

## Contagem geral

| Status | Quantidade |
|--------|-----------|
| ✅ Implementado | 23 |
| 🔶 Parcial | 0 |
| ❌ Pendente | 0 |
| **Total** | **23** |

---

_Ajudaê — PROGRESS v1.5 — atualizado em 2026-04-28 — **23/23 ✅** (UI Layer v2 completo)_
