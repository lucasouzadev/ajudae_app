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
**Detalhe:** PIN de início em `start-pin.tsx` (4 dígitos, expira em 10 min, máx 3 regenerações). Confirmação pelo cliente em `confirm-start-pin.tsx`. PIN de conclusão gerado no `ServiceContext` e validado em `job-otp.tsx` com limite de 5 tentativas antes de abrir disputa.
**Arquivos:** `app/start-pin.tsx`, `app/confirm-start-pin.tsx`, `app/job-otp.tsx`, `contexts/ServiceContext.tsx`

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
**Status:** ❌ Não implementado
**Detalhe:** O toggle existe mas não verifica o campo `verified` do `AuthContext`. Nenhum badge "Aguardando aprovação" é exibido. O `AuthContext` já possui o campo `verified` — basta consumir.
**Arquivo:** `app/index.tsx` (linhas 868–890)

---

### 6. Role cards no signup com linha de contexto
**Status:** ✅ Implementado
**Detalhe:** Cards de "Cliente" e "Prestador" na tela de cadastro com subtítulo contextual ("Solicitar serviços" / "Oferecer serviços"), ícone e estado ativo com cor.
**Arquivo:** `app/auth.tsx` (linhas 224–252)

---

### 7. Hints de demo controlados por flag de ambiente
**Status:** ❌ Não implementado
**Detalhe:** Dados de demo hardcoded em `mockData.ts` e credenciais fixas em `auth.tsx`. Nenhuma flag de ambiente controla a exibição de conteúdo demo.
**Arquivos:** `app/auth.tsx` (linha 40), `mockData.ts`

---

## 🟡 Médio impacto

### 8. Skeleton/loading nos ScrollViews
**Status:** ❌ Não implementado
**Detalhe:** Todos os ScrollViews exibem conteúdo direto sem placeholder de skeleton enquanto carregam.

---

### 9. Quick messages com botão de cancelamento explícito
**Status:** 🔶 Parcialmente implementado
**Detalhe:** Modal de mensagens rápidas existe em `job.tsx` (linhas 222–244), mas o fechamento é só por tap no backdrop. Falta botão "Cancelar" explícito e separado dentro do modal.
**Arquivo:** `app/job.tsx`

---

### 10. ProviderModal com animação slide
**Status:** ❌ Não implementado
**Detalhe:** `ProviderModal.tsx` usa `animationType="fade"` (linha 38). Trocar para `"slide"`.
**Arquivo:** `components/ProviderModal.tsx` (linha 38)

---

### 11. Contraste do CTA amarelo em telas claras
**Status:** 🔶 Parcialmente implementado
**Detalhe:** A maioria dos CTAs usa texto `#1A1714` sobre `#FFCC00` (bom contraste). Exceção: `ProviderPin` exibe texto amarelo sobre branco. Não aplicado universalmente.
**Arquivo:** `constants/colors.ts`, componentes variados

---

### 12. ProfileOverlay com mocks nos sub-menus
**Status:** 🔶 Parcialmente implementado
**Detalhe:** Itens existem com subtexto mockado estático (ex: "Pix · Cartão •••• 9768", "12 pedidos realizados"). Não há navegação funcional para as sub-telas — apenas exibição de texto.
**Arquivo:** `components/ProfileOverlay.tsx` (linhas 16–23)

---

### 13. Pull-to-refresh
**Status:** ❌ Não implementado
**Detalhe:** Nenhum `RefreshControl` encontrado em qualquer ScrollView do app.

---

## 🔵 Refinamentos de polimento

### 14. Tipografia mínima 11px nos labels
**Status:** 🔶 Parcialmente implementado
**Detalhe:** Maioria dos labels respeita o mínimo. Violações encontradas: label de seção em 10px (linha 214) e labels de barras em gráficos em 8px (linha 465).
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
**Status:** 🔶 Parcialmente implementado
**Detalhe:** Heatmap exibe legenda de intensidade ("Menos → Mais"), mas sem labels de dia da semana nas linhas nem indicadores de mês nas colunas.
**Arquivo:** `app/index.tsx` (linhas 48–140)

---

## Contagem geral

| Status | Quantidade |
|--------|-----------|
| ✅ Implementado | 6 |
| 🔶 Parcial | 6 |
| ❌ Pendente | 5 |
| **Total** | **17** |

---

## Próximos itens recomendados (por criticidade)

1. **#1** — Bottom tab real (TabNavigator)
2. **#5** — Toggle bloqueado para prestador não-verificado
3. **#7** — Flag de ambiente para demo hints
4. **#8** — Skeletons nos ScrollViews
5. **#13** — Pull-to-refresh

---

_Ajudaê — PROGRESS v1.0 — atualizado em 2026-04-26_
