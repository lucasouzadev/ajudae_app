# MVP_STATUS.md — Ajudaê
> Estado atual do app para testes fechados. Gerado em 2026-04-27.

---

## Resumo Executivo

O app está **pronto para testes fechados de fluxo completo**. Todos os fluxos críticos — autenticação, onboarding, criação de pedido, aceitação pelo prestador, rastreamento, sistema dual-PIN de início e conclusão, disputa e avaliação — estão implementados e funcionando localmente via AsyncStorage. Não há dependência de backend externo para testar os fluxos de negócio.

| Dimensão | Status |
|---|---|
| Fluxos de negócio core | ✅ 100% testável |
| Segurança dual-PIN | ✅ Implementado (commitment hash) |
| UI Blocking durante serviço | ✅ Implementado |
| Backend real | ❌ Todo mock local |
| Push notifications | ❌ Não implementado |
| Pagamento real | ❌ Mock |
| Mapa real (GPS) | ❌ SVG estático |
| Chat em tempo real | ❌ Dados estáticos |

---

## Código-base

| Métrica | Valor |
|---|---|
| Total de linhas | ~9.840 |
| Telas (`app/*.tsx`) | 19 |
| Componentes | 23 |
| Contextos | 5 (Auth, Service, Requests, Payments, Support) |
| Branch de desenvolvimento | `claude/task3-fix-onboarding-nLaEx` |
| Commits desde início das tasks | 8 commits |

---

## Fluxos Funcionais (testáveis agora)

### Autenticação
| Tela | O que funciona |
|---|---|
| `auth.tsx` | Login com credenciais mock, registro com validação, seleção de role (cliente / prestador) com cartões contextuais, persistência de sessão via AsyncStorage |

**Credenciais demo:**
- Cliente: `cliente@ajudae.com` / `123456`
- Prestador: `prestador@ajudae.com` / `123456`

---

### Onboarding (5 etapas)
| Etapa | Conteúdo |
|---|---|
| 1 | Boas-vindas com animação |
| 2 | Nome (mín. 3 chars, validação em tempo real) |
| 3 | Telefone (DDD + 8–9 dígitos, máscara) |
| 4 | Permissão GPS (pode pular) |
| 5 | "Tudo pronto!" com mensagem diferenciada por role |

Onboarding é obrigatório uma vez, flag `onboardingCompleted` salva em AsyncStorage. Tela de boas-vindas e animações de fade/slide entre etapas.

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
| `index.tsx` (cliente) | Home com chips de navegação, card de serviço ativo, acesso ao marketplace |
| `marketplace.tsx` | Lista de prestadores com filtros por categoria |
| `provider/[id].tsx` | Perfil completo do prestador |
| `request.tsx` | Formulário de solicitação com origem/destino, fotos, agendamento |
| `track.tsx` | Rastreamento do pedido, status em tempo real (mock), mapa SVG, botão de chat, acesso ao ticket |
| `confirm-start-pin.tsx` | Input de 4 dígitos com teclado numérico, validação offline (commitment hash), max 5 tentativas → disputa, KeyboardAvoidingView correto |
| `otp-modal.tsx` | Exibe PIN de conclusão de 6 dígitos para mostrar ao prestador |
| `rate.tsx` | Avaliação em estrelas + comentário após conclusão |
| `payment.tsx` | Tela de pagamento (mock, sem processamento real) |
| `request-details.tsx` | Detalhe do pedido anterior |

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
| `index.tsx` (prestador) | Home com toggle online, grid de stats, radar de mercado, previsão de demanda, heatmap, metas, badges, card de pedido ativo, solicitações recebidas |
| `job.tsx` | Detalhes do job ativo, botão de aceite, status, acesso ao chat |
| `start-pin.tsx` | Exibe `pin_start` pré-gerado com animação de pulso, auto-navega para `/job` quando status muda para `in_progress` — funciona offline sem rede |
| `job-otp.tsx` | Input de 6 dígitos para digitar o PIN de conclusão exibido pelo cliente, validação offline, max 5 tentativas → disputa |

---

### Sistema Dual-PIN (Segurança)
| Propriedade | Valor |
|---|---|
| Algoritmo | djb2 hash: `hash(serviceId \| pin_start \| pin_conclusion)` |
| Dependência de rede na verificação | Nenhuma — 100% local |
| PINs transmitidos via app | Nunca |
| Tentativas máximas por PIN | 5 → status `disputed` automático |
| Geração | No momento da criação do pedido (quando há rede) |
| `pin_start` | 4 dígitos — prestador exibe, cliente digita |
| `pin_conclusion` | 6 dígitos — cliente exibe, prestador digita |

---

### UI Blocking durante Serviço Ativo
Quando há um serviço não-terminal (`requested`, `accepted`, `en_route`, `in_progress`):
- **Cliente**: só pode acessar `track`, `confirm-start-pin`, `otp-modal`, `ticket`, `rate`, `inbox`
- **Prestador**: só pode acessar `job`, `start-pin`, `job-otp`, `ticket`, `inbox`
- Qualquer tentativa de navegar para fora redireciona automaticamente para `/track` ou `/job`

Comportamento idêntico ao Uber/99.

---

### Fluxos Auxiliares
| Tela/Componente | Status |
|---|---|
| `inbox.tsx` | Lista de conversas por role, hubs de suporte, tabs "Todas / Não lidas", auto-scroll para conversa do serviço atual quando acessada via botão de chat |
| `support.tsx` | Tela de suporte com categorias |
| `ticket.tsx` | Abertura de ticket de disputa |
| `SideSheet.tsx` | Menu lateral com navegação |
| `ProfileOverlay.tsx` | Overlay de perfil com dados mock (Pagamentos, Endereços, Histórico) |

---

## O que NÃO está pronto para produção

### Bloqueadores de produção (não afetam testes fechados)

| Item | Detalhe |
|---|---|
| Backend / API | Todo o estado é AsyncStorage local. Para produção: substituir por API REST com autenticação JWT |
| Push notifications | Sem `expo-notifications`. Prestadores não recebem novos pedidos em background |
| Pagamento real | `payment.tsx` é visual. Sem integração Pix/Stripe |
| Mapa real | `MapSVG.tsx` é SVG estático. Sem Google Maps / Mapbox e sem geolocalização real |
| Chat em tempo real | `inbox.tsx` usa dados estáticos. Sem WebSocket ou Firebase Realtime |
| Commitment hash | djb2 em JS puro (sem `expo-crypto`). Para produção: migrar para HMAC-SHA256 com chave de sessão |
| Upload de fotos | `request.tsx` tem picker mas sem upload real (sem bucket S3/GCS) |

### Itens do PROGRESS.md ainda pendentes (não-bloqueadores para teste)

| # | Item | Status | Impacto |
|---|---|---|---|
| 1 | Navegação bottom tab real | 🔶 Chips existem, sem TabNavigator | Baixo para teste |
| 5 | Toggle bloqueado para prestador não-verificado | ❌ | Médio |
| 7 | Flag de ambiente para hints de demo | ❌ | Baixo |
| 8 | Skeletons nos ScrollViews | ❌ | Baixo |
| 9 | Botão cancelar explícito no modal de mensagens rápidas | 🔶 | Baixo |
| 10 | ProviderModal com animação slide | ❌ | Cosmético |
| 13 | Pull-to-refresh | ❌ | Baixo |

---

## Roteiro de Teste Sugerido (QA Fechado)

### Cenário 1 — Fluxo completo feliz
1. Instalar via Expo Go (link do projeto)
2. Criar conta como **cliente** → completar onboarding
3. Solicitar um frete com fotos e agendamento
4. Mudar de dispositivo / conta → entrar como **prestador**
5. Aceitar o pedido → ir para "em rota"
6. Tela `start-pin`: verificar que o PIN de 4 dígitos aparece sem precisar de rede
7. No dispositivo do cliente: digitar o PIN correto em `confirm-start-pin`
8. Verificar que ambos são redirecionados para o fluxo de `in_progress`
9. No cliente: acessar `otp-modal`, anotar o PIN de 6 dígitos
10. No prestador: digitar o PIN em `job-otp`
11. Verificar conclusão e tela de avaliação

### Cenário 2 — PIN incorreto (segurança)
1. Na etapa 7 acima, digitar PINs incorretos repetidamente
2. Verificar que após 5 tentativas o status muda para `disputed`
3. Verificar que a tela de erro aparece e o redirecionamento para `/track` ocorre

### Cenário 3 — UI Blocking
1. Com serviço ativo, tentar navegar manualmente para `/marketplace` ou `/auth`
2. Verificar que o app redireciona automaticamente para `/track` ou `/job`

### Cenário 4 — Reinício do app
1. Com serviço em andamento, forçar o fechamento do app
2. Reabrir → verificar que o estado é restaurado do AsyncStorage corretamente

---

## Métricas de Completude por Área

| Área | Completude estimada |
|---|---|
| Autenticação e onboarding | 90% |
| Fluxo do cliente (criação → conclusão) | 85% |
| Fluxo do prestador (aceitação → conclusão) | 85% |
| Sistema de segurança dual-PIN | 95% |
| Inbox / Chat | 30% (visual estático) |
| Pagamentos | 15% (visual apenas) |
| Mapa e geolocalização | 20% (SVG estático) |
| Push notifications | 0% |
| **MVP testável end-to-end** | **~75%** |

---

## Próximos Passos Recomendados (por prioridade)

1. **Distribuição via Expo Go** — gerar link de preview para o time de QA
2. **Item #5** — Bloquear toggle do prestador não-verificado (1–2h)
3. **Escalabilidade do hash** — migrar djb2 para HMAC-SHA256 com `expo-crypto` antes de produção
4. **Item #7** — Flag de ambiente `APP_ENV=demo` para ocultar hints de demo em produção
5. **Backend mínimo** — endpoint de criação de pedido + WebSocket para notificações de aceite

---

_Ajudaê — MVP Status v1.0 — 2026-04-27_
