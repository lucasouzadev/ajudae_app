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
**Status:** 🔶 Parcialmente implementado
**Detalhe:** Existe um floating chip bar no `index.tsx` (linhas 737–754 cliente / 1014–1030 prestador), mas não é um TabNavigator real com persistência de estado. Não segue o spec do PRD (Início | Pedidos | Perfil / Home | Histórico | Perfil).
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
**Status:** ✅ Implementado
**Detalhe:** Toggle desabilitado quando `user.verified === false`. Badge amarelo "Aguardando aprovação" substituí o subtexto normal. O Pressable ignora toque quando não verificado.
**Arquivo:** `app/index.tsx`

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
**Status:** 🔶 Parcialmente implementado
**Detalhe:** Componente `Skeleton` criado com animação de pulso. Aplicado em `marketplace.tsx` (900ms de loading simulado antes de exibir lista de prestadores). Demais telas pendentes.
**Arquivo:** `components/Skeleton.tsx` (novo), `app/marketplace.tsx`

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

## Contagem geral

| Status | Quantidade |
|--------|-----------|
| ✅ Implementado | 15 |
| 🔶 Parcial | 1 |
| ❌ Pendente | 1 |
| **Total** | **17** |

---

## Próximos itens recomendados (por criticidade)

1. **#1** — Bottom tab real (TabNavigator)
2. **#5** — Toggle bloqueado para prestador não-verificado
3. **#7** — Flag de ambiente para demo hints
4. **#8** — Skeletons nos ScrollViews
5. **#13** — Pull-to-refresh

---

_Ajudaê — PROGRESS v1.2 — atualizado em 2026-04-27_
