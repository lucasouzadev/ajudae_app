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
| ✅ Implementado | 33 |
| 🔶 Parcial | 1 |
| ❌ Pendente | 0 |
| **Total** | **34** |

---

---

## 🟣 Sessão 2026-05-04 — Bug Fixes, Notificações e LGPD

### 24. Fix: crash `crypto.subtle.digest` no ServiceContext
**Status:** ✅ Implementado  
**Detalhe:** `crypto.subtle.digest` (Web Crypto API) não existe em React Native e causava `ReferenceError` na geração do commitment hash. Substituído por implementação pura em JS: `djb2Hash` com dois passes (forward + reverse FNV-1a) produzindo 16 hex chars. Sem dependências externas — funciona offline e sem `expo-crypto`.  
**Arquivo:** `contexts/ServiceContext.tsx`

---

### 25. PortfolioContext — sincronização cross-screen do portfólio
**Status:** ✅ Implementado  
**Detalhe:** `PortfolioContext` criado como fonte única de verdade para dados do portfólio do prestador (`bio`, `promoText`, `promoDue`, `services`, `supportsHelpers`, `helpersCount`, `photoSections`, `reviewSection`, `servicesSection`). Elimina a necessidade de estado local duplicado entre `portfolio.tsx` (editor) e `provider/[id].tsx` (visualização do cliente). `PortfolioProvider` inserido no tree de providers acima de `RequestsProvider`.  
**Arquivo:** `contexts/PortfolioContext.tsx` (novo)

---

### 26. Painel de perfil do prestador sincroniza com editor de portfólio
**Status:** ✅ Implementado  
**Detalhe:** `provider/[id].tsx` agora usa `usePortfolio()` para exibir bio, serviços e promoção quando o perfil visualizado é o do prestador logado (`isOwnProfile = provider.id === "p-1"`). Alterações feitas em `portfolio.tsx` refletem imediatamente no perfil público. `app/portfolio.tsx` refatorado para usar `usePortfolio()` em vez de estado local.  
**Arquivos:** `app/provider/[id].tsx`, `app/portfolio.tsx`

---

### 27. Badges de ajudantes com "Sim"/"Não" + configuração no portfólio
**Status:** ✅ Implementado  
**Detalhe:** Stats row em `provider/[id].tsx` exibe "Sim"/"Não" (em vez de número bruto) quando `supportsHelpers === false`. Badge fica cinza quando não suporta ajudantes. Em `request.tsx`, o toggle de "Precisa de ajudante" fica oculto com aviso explicativo quando o prestador não oferece esse recurso (`providerSupportsHelpers`). Editor de portfólio em `portfolio.tsx` ganhou seção "Ajudantes" com toggle on/off e contador (1–10).  
**Arquivos:** `app/provider/[id].tsx`, `app/request.tsx`, `app/portfolio.tsx`

---

### 28. ProfileOverlay — conteúdo completo nos sub-menus
**Status:** ✅ Implementado  
**Detalhe:** Sub-menus antes vazios ("Em breve") agora têm conteúdo mock rico para a apresentação de stakeholders:
- **Histórico de Pedidos**: 4 pedidos com ícone, rota, preço e badge de status colorido
- **Avaliações**: header com nota agregada (4.9/5, 5 estrelas), 3 avaliações individuais com texto
- **Segurança**: PIN ativo, 2FA SMS, CPF verificado, biometria — cada um com badge colorido
- **Configurações**: toggles de notificações e localização ligados ao estado real do OS (via `usePermissions()`), mais preferências estáticas (dark mode, idioma)  
**Arquivo:** `components/ProfileOverlay.tsx`

---

### 29. Marketplace — botões de ação do mapa navegam corretamente
**Status:** ✅ Implementado  
**Detalhe:** No `MapExpandModal` (mapa expandido do marketplace), os botões de CTA agora navegam:
- **Cliente** — "Solicitar este prestador": `router.push({ pathname: "/request", params: { providerId } })` + haptic NotificationSuccess
- **Prestador** — "Análise de concorrência": `router.push(\`/provider/${id}\`)` + haptic Medium  
Antes, ambos eram inertes (sem navegação).  
**Arquivo:** `app/marketplace.tsx`

---

### 30. Home — pin card persiste acima do sheet ao expandir/recolher
**Status:** ✅ Implementado  
**Detalhe:** O pin card (card de detalhes do prestador selecionado no mapa) agora segue o topo do sheet usando `sheetHeightAnim.interpolate()` como valor de `bottom`. Antes, o card desaparecia quando o sheet era expandido por causa de um `useEffect` que limpava `active` ao detectar expansão. Esse `useEffect` foi removido. A seleção de pin só é limpa quando o usuário explicitamente toca em outro pin ou fecha o card.  
**Arquivo:** `app/index.tsx` — `ClienteHome`

---

### 31. Home — mapa redimensiona com o sheet + botão localizar ancorado
**Status:** ✅ Implementado  
**Detalhe:** O container do mapa (`Animated.View`) agora tem `bottom: sheetHeightAnim` em vez de `bottom: 0`, fazendo com que a área do mapa encolha corretamente à medida que o sheet sobe (antes o mapa ficava em tamanho fixo com zoom distante e animação travada). O botão de localizar foi movido para dentro do container do mapa com `bottom: 16` fixo, ficando sempre ancorado na borda inferior visível do mapa. Botão exibe `locateSpin` (animação de rotação 360°) e fundo azul durante o recenter ativo.  
**Arquivo:** `app/index.tsx` — `ClienteHome`

---

### 32. Sistema de push notifications — 22 eventos
**Status:** ✅ Implementado  
**Detalhe:** `NotificationContext` com catálogo de 22 eventos cobrindo todos os fluxos críticos:
- **Cliente**: `service_requested/accepted/en_route/in_progress/completed/cancelled/disputed`, `pin_start_wrong/disputed`, `pin_end_wrong/disputed`
- **Prestador**: `new_job_request`, `job_accepted/en_route/in_progress/completed/cancelled/disputed`
- **Compartilhado**: `new_message`, `payment_authorized`, `payout_processed`, `email_confirmed`, `provider_verified`

Watcher reativo dentro de `NotificationProvider` detecta mudanças em `active.status`, `startPinAttempts` e `conclusionAttempts` via refs (evita hydration falsa do AsyncStorage; de-duplica notificação PIN+disputed). 3 canais Android pré-configurados por prioridade. Toque na notificação navega para a tela correta. Permissão delegada para `PermissionsContext`.  
**Arquivo:** `contexts/NotificationContext.tsx` (novo)

---

### 33. Sistema de permissões LGPD-compliant com sync no banco
**Status:** ✅ Implementado  
**Detalhe:** `PermissionsContext` como fonte única de verdade para todas as permissões do app:
- Lê estados do OS via `expo-location`, `expo-image-picker`, `expo-notifications` no boot e a cada retorno ao foreground (`AppState`)
- Sincroniza `geolocation_requested`, `camera_requested`, `notifications_requested`, `lgpd_accepted`, `last_consent_update` para `profiles` no Supabase
- `lgpd_accepted` armazenado em AsyncStorage (offline) + DB (fonte de verdade)

`PermissionGate` — modal que aparece após autenticação:
1. **Tela LGPD** (bloqueante): explica cada categoria de dados, links para Política e Termos, salva aceite em AsyncStorage + DB
2. **Tela Localização** (pode pular): explica uso; dispara dialog do OS
3. **Tela Notificações** (pode pular): explica uso; dispara dialog do OS

`ProfileOverlay` Configurações: toggle verde quando granted, "Toque para ativar" quando canAsk, "Abrir Configurações" (laranja + ícone external) quando permanentemente negado → `Linking.openSettings()`.

`AuthContext.completeOnboarding` atualizado para persistir `geolocation_requested` + `last_consent_update` no banco.  
**Arquivos:** `contexts/PermissionsContext.tsx` (novo), `components/PermissionGate.tsx` (novo), `contexts/AuthContext.tsx`, `components/ProfileOverlay.tsx`

---

## Contagem geral

| Status | Quantidade |
|--------|-----------|
| ✅ Implementado | 33 |
| 🔶 Parcial | 1 |
| ❌ Pendente | 0 |
| **Total** | **34** |

---

## 🟣 Sessão 2026-05-07 — Correções Críticas Android

### 34. Fix: crash silencioso Android (New Architecture)
**Status:** ✅ Implementado
**Detalhe:** `newArchEnabled: false` em `app.config.js` — módulos nativos (`react-native-maps`, `react-native-keyboard-controller`, `react-native-worklets`) não são compatíveis com a nova arch. Remove `reactCompiler` experimental pelo mesmo motivo. Remove `origin` hardcoded para replit.com que causava falhas de roteamento em builds externos.
**Arquivo:** `app.config.js`

---

### 35. Fix: animação do sheet e do mapa (spring → timing)
**Status:** ✅ Implementado
**Detalhe:** Substitui `Animated.spring` (oscillação visível por tension/friction) por `Animated.timing` com `Easing.out(Easing.cubic)` para movimento fluido e simultâneo entre mapa e sheet.
**Arquivo:** `app/index.tsx`, `app/marketplace.tsx`

---

### 36. Fix: botão de localização (TypeError síncrono)
**Status:** ✅ Implementado
**Detalhe:** `mapRef.current?.recenter()` retornava `undefined` e `.finally()` lançava `TypeError` síncrono, impedindo o `setLocating(true)` de ser commitado pelo React. Adicionado `?? Promise.resolve()` como guard. Borda azul permanente e opacidade no press para feedback visual.
**Arquivo:** `components/MapReal.tsx`, `app/index.tsx`

---

## 🟣 Sessão 2026-05-10 — UI/UX Brand Identity (6 Etapas)

### 37. Color tokens alinhados ao branding Ajudaê
**Status:** ✅ Implementado
**Detalhe:** Tokens atualizados — `primary: #FFC90E` (amarelo preciso), `background: #FAF9ED` (papel creme), `primaryLight: #FFF8D6`, `primaryMid: #FFE040`, `primaryDeep: #E6B400`, `bgDeep: #F0EDD8`. Splash e ícone Android corrigidos de `#FF5500` para `#FFC90E`.
**Arquivos:** `constants/colors.ts`, `app.config.js`

---

### 38. Fontes: Fraunces → Nunito
**Status:** ✅ Implementado
**Detalhe:** `@expo-google-fonts/fraunces` substituído por `@expo-google-fonts/nunito` (700Bold, 800ExtraBold, 900Black). Tokens `fonts.serif.*` remapeados. Dependência atualizada no `package.json`.
**Arquivos:** `constants/colors.ts`, `app/_layout.tsx`, `package.json`

---

### 39. Zero emojis (23+ substituições por Ionicons/MCI)
**Status:** ✅ Implementado
**Detalhe:** Todos os emojis removidos — mapeados para ícones vetoriais. `RadioRow` e `ServiceTypeCard` ganham prop `iconLib: "mci" | "ion"` para suportar ambas as bibliotecas. Arquivos afetados: `index.tsx`, `provider-validation.tsx`, `onboarding.tsx`.
**Arquivos:** `app/index.tsx`, `app/provider-validation.tsx`, `app/onboarding.tsx`

---

### 40. Novo componente: EmptyState
**Status:** ✅ Implementado (mascote assets pendentes)
**Detalhe:** Componente com mascote flutuante (±6px vertical, `Animated.loop`). Fallback gracioso com placeholder circular quando assets ausentes. Usado em: `inbox.tsx`, `proposals.tsx`, `marketplace.tsx`, `support.tsx`. Assets esperados em `assets/images/mascot/mascot-running.png` e `mascot-standing.png`.
**Arquivo:** `components/EmptyState.tsx` (novo)

---

### 41. Chat bubbles com cor primária
**Status:** ✅ Implementado
**Detalhe:** Bubbles "me" em DMs agora usam `c.primary (#FFC90E)` com texto escuro. Suporte mantém `c.blue` para consistência.
**Arquivo:** `app/chat.tsx`

---

### 42. Payment: TopNav padronizado
**Status:** ✅ Implementado
**Detalhe:** Header manual substituído por `<TopNav title="Pagamento" onBack={() => router.back()} />`. Remove estilos custom `header`, `iconBtn`, `headerTitle`.
**Arquivo:** `app/payment.tsx`

---

### 43. ProfileOverlay: toggles simplificados
**Status:** ✅ Implementado
**Detalhe:** Toggles agora usam apenas ícone `checkmark-circle` / `ellipse-outline` (1 mudança visual). Badge de biometria muda de purple `#9333EA` para `c.success` (verde), padronizando toda a seção Security.
**Arquivo:** `components/ProfileOverlay.tsx`

---

### 44. Heatmap 2-tons e stats uniformes
**Status:** ✅ Implementado
**Detalhe:** Heatmap: binary (ativo=`c.primary`, inativo=`c.bgDeep`), remove 5 níveis de opacidade. Stats grid: todos com `bg: c.card` e `color: c.text` — remove gradientes coloridos por categoria.
**Arquivo:** `app/index.tsx`

---

### 45. Skeleton com shimmer LinearGradient
**Status:** ✅ Implementado
**Detalhe:** Substitui opacity pulse (0.4→1→0.4) por shimmer wave via `LinearGradient` translúcido animado com `translateX` (toValue 400, 1200ms loop).
**Arquivo:** `components/Skeleton.tsx`

---

### 46. Novo hook: useEntranceAnim
**Status:** ✅ Implementado
**Detalhe:** Fade + slide-up de 280ms com `Easing.out(Easing.cubic)`. Usado para entrada de telas. 25 linhas, sem dependências.
**Arquivo:** `hooks/useEntranceAnim.ts` (novo)

---

### 47. Novo componente: BottomTabBar (role-aware)
**Status:** ✅ Implementado
**Detalhe:** `#1F1F1F` bg, `#FFC90E` tab ativa, branco 40% inativo. Label visível apenas na tab ativa. Animação `scale 1→1.12→1` na seleção. **Oculta automaticamente** quando há serviço ativo. Cliente: Início/Buscar/Inbox/Ajuda; Prestador: Início/Serviços/Inbox/Portfólio.
**Arquivo:** `components/BottomTabBar.tsx` (novo)

---

## 🟣 Sessão 2026-05-11 — Remoção de Mocks + UX Launch-Ready

### 48. Remoção total de dados mockados
**Status:** ✅ Implementado
**Detalhe:** `MOCK_PEDIDOS` → `RequestsContext` (cliente), `MOCK_HISTORICO` → requests reais do prestador, `MOCK_THREADS/AUTO_REPLIES` → estado vazio honesto no chat, `MOCK_POSTINGS` → prestadores reais, `MOCK_FAQS` → `STATIC_FAQS`, analytics hub (ActivityHeatmap, BadgeRow, MonthlyGoals) → dados reais do `RequestsContext`. `RequestsContext` aprimorado com joins para `providerName` e `clientName`.
**Arquivos:** `app/index.tsx`, `app/chat.tsx`, `app/marketplace.tsx`, `contexts/RequestsContext.tsx`, `constants/mockData.ts`

---

### 49. ProposalAlert — overlay 99-style para novas propostas
**Status:** ✅ Implementado
**Detalhe:** Modal fullscreen com countdown de 60s, botões Accept/Decline com haptics. `NotificationContext` configura canal Android MAX-importance (`ajudae-proposals`) com heads-up display sobre qualquer app. Listener foreground exibe `ProposalAlert` em vez de banner nativo. `_layout.tsx` trata action buttons de background: `'accept'` → `/proposals`, `'decline'` → noop.
**Arquivos:** `components/ProposalAlert.tsx` (novo), `contexts/NotificationContext.tsx`, `app/_layout.tsx`

---

### 50. Portfolio persistence — debounced writes para Supabase
**Status:** ✅ Implementado
**Detalhe:** `PortfolioContext` agora faz writes debounced (1.2s) para coluna `portfolio_data JSONB` na tabela `providers`. Lê `portfolio_data` completo no mount com fallback para `bio` existente. Migration `029_portfolio_data.sql` adiciona `portfolio_data jsonb` aos `providers` e `messages_last_read_at timestamptz` aos `profiles`.
**Arquivos:** `contexts/PortfolioContext.tsx`, `supabase/migrations/029_portfolio_data.sql`

---

### 51. Provider validation — tela de confirmação com protocolo
**Status:** ✅ Implementado
**Detalhe:** Substitui redirecionamento silencioso (`router.replace('/')`) por tela de sucesso fullscreen mostrando código de protocolo `AJD-{userId[:6]}` e botão "Ir para o início".
**Arquivo:** `app/provider-validation.tsx`

---

### 52. Payment UX — botão "Copiar código Pix"
**Status:** ✅ Implementado
**Detalhe:** Botão "Copiar código Pix" usa native Share sheet. Estado "Copiado!" por 3s após share. Sem novos pacotes.
**Arquivo:** `app/payment.tsx`

---

### 53. Proposals — chips de horário rápido
**Status:** ✅ Implementado
**Detalhe:** 4 chips no modal de agendamento (Hoje 14h, Hoje 18h, Amanhã 9h, Amanhã 14h) que auto-preenchem o input de data. Input manual mantido como fallback.
**Arquivo:** `app/proposals.tsx`

---

### 54. Tab badge para propostas e inbox
**Status:** ✅ Implementado
**Detalhe:** `BottomTabBar` faz polling na tabela `proposals` a cada 30s para contagem de pendentes. Badge vermelho exibido em `/proposals` (prestador) e `/inbox` (cliente). Auto-limpa quando count volta a 0.
**Arquivo:** `components/BottomTabBar.tsx`

---

### 55. Edge Function: notify_new_proposal
**Status:** ✅ Implementado
**Detalhe:** Envia WhatsApp (Z-API) ou SMS (Twilio) ao prestador em nova proposta. Skip gracioso quando sem telefone ou sem secrets configurados. Lê `ZAPI_INSTANCE_ID` / `TWILIO_*` dos Supabase Secrets. Expo Push API como canal primário (alcança tela bloqueada + botões Accept/Decline).
**Arquivo:** `supabase/functions/notify_new_proposal/`

---

### 56. Primeiro serviço: badge 0% de taxa
**Status:** ✅ Implementado
**Detalhe:** `job.tsx` detecta prestador com zero serviços concluídos e exibe badge "1º serviço · sem taxa!" no KPI "VOCÊ RECEBE". Bloqueia "Concluir serviço" se `estimatedPrice === 0`.
**Arquivo:** `app/job.tsx`

---

### 57. Haversine 30km no fetchOnlineProviders
**Status:** ✅ Implementado
**Detalhe:** Filtro de 30km de raio com fórmula Haversine em `lib/providers.ts`. Popula `provider.km` com distância arredondada do usuário.
**Arquivo:** `lib/providers.ts`

---

### 58. Sistema de indicações (referral)
**Status:** ✅ Implementado
**Detalhe:** `ProfileOverlay.tsx` ganha item "Indicar amigos" com código de indicação determinístico (djb2 do userId) e Share sheet. Exibe R$10 por indicação como incentivo.
**Arquivo:** `components/ProfileOverlay.tsx`

---

## Contagem geral

| Status | Quantidade |
|--------|-----------|
| ✅ Implementado | 57 |
| 🔶 Parcial | 1 |
| ❌ Pendente | 0 |
| **Total** | **58** |

---

_Ajudaê — PROGRESS v3.0 — atualizado em 2026-05-14 — **57/58 ✅** (Brand Identity + Launch-Ready UX + Remoção de Mocks)_
