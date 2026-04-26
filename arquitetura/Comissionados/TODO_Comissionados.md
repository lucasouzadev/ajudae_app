# TODO — Ajudaê

> Tracker central de tarefas do projeto. Atualizado conforme cada entregável é concluído.
> **Owner:** todos atualizam, Tech Lead valida.
> **Status:** ✅ Concluído | 🔄 Em andamento | ⏳ Pendente | 🔴 Bloqueante

---

## DOCUMENTAÇÃO (você é o responsável)

### Documentos Técnicos

| #    | Documento           | Status       | Responsável   | Observação                         |
| ---- | ------------------- | ------------ | ------------- | ---------------------------------- |
| T-01 | `DB_SCHEMA.md`      | ✅ Concluído | Você + Claude | SQL completo com 9 migrations      |
| T-02 | `RLS_POLICIES.md`   | ✅ Concluído | Você + Claude | Policies por tabela + helpers      |
| T-03 | `EDGE_FUNCTIONS.md` | ✅ Concluído | Você + Claude | Contratos de cada função crítica   |
| T-04 | `ARCHITECTURE.md`   | ✅ Concluído | Você + Claude | Diagrama e decisões de arquitetura |

### Runbooks (Operação)

| #    | Documento            | Status       | Responsável   | Observação                     |
| ---- | -------------------- | ------------ | ------------- | ------------------------------ |
| R-01 | `README_OPERACAO.md` | ✅ Concluído | Você + Claude | Guia do dia a dia para o COO   |
| R-02 | `README_BUGFIX.md`   | ✅ Concluído | Você + Claude | Regras de PR para não-devs     |
| R-03 | `FAQ_SUPABASE.md`    | ✅ Concluído | Você + Claude | Logs, policies, functions      |
| R-04 | `DEPLOY_GUIDE.md`    | ✅ Concluído | Você + Claude | Vercel + Cloudflare + Supabase |
| R-05 | `INCIDENTS.md`       | ✅ Concluído | Você + Claude | Templates de incidente         |

### Documentos de Produto

| #    | Documento                         | Status       | Responsável   | Observação                              |
| ---- | --------------------------------- | ------------ | ------------- | --------------------------------------- |
| P-01 | `Comissionados_Business_Doc.docx` | ✅ Concluído | Você + Claude | Cargos, comissões, marketing, SEO       |
| P-02 | `PRD.md` (Product Requirements)   | ✅ Concluído | Você + Claude | Fluxos por tela, regras de negócio      |
| P-03 | Fluxograma de estados do pedido   | ✅ Concluído | Você + Claude | Visual interativo da máquina de estados |

### Documentos Jurídicos/Legais

| #    | Documento                         | Status      | Responsável | Observação                     |
| ---- | --------------------------------- | ----------- | ----------- | ------------------------------ |
| J-01 | Termos de Serviço (público)       | ⏳ Pendente | Advogado    | Necessário antes do lançamento |
| J-02 | Política de Privacidade (público) | ⏳ Pendente | Advogado    | Exigida por Apple/Google       |
| J-03 | Acordo de Sócios                  | ⏳ Pendente | Advogado    | Antes de qualquer transação    |

---

## FASE 0 — SETUP (3–5 dias)

### Empresa e Jurídico

| #    | Tarefa                             | Status      | Responsável      | Prazo               |
| ---- | ---------------------------------- | ----------- | ---------------- | ------------------- |
| E-01 | Registrar empresa (MEI ou LTDA)    | ⏳ Pendente | Sócio 3 (COO)    | Antes do lançamento |
| E-02 | Abrir conta bancária PJ            | ⏳ Pendente | Sócio 3 (COO)    | Semana 1            |
| E-03 | Redigir e assinar Acordo de Sócios | ⏳ Pendente | Todos + Advogado | Semana 1            |

### Infraestrutura

| #     | Tarefa                                                   | Status        | Responsável | Prazo                    |
| ----- | -------------------------------------------------------- | ------------- | ----------- | ------------------------ |
| I-01  | Criar projeto no Supabase                                | ⏳ Pendente   | Dev 1 (CTO) | Fase 0                   |
| I-02  | Criar projeto do WebApp na Vercel                        | ⏳ Pendente   | Dev 1 (CTO) | Fase 0                   |
| I-02B | Configurar Cloudflare (DNS, SSL, WAF e recursos de edge) | ⏳ Pendente   | Dev 1 (CTO) | Fase 0                   |
| I-03  | Criar monorepo no GitHub (Turborepo)                     | ⏳ Pendente   | Dev 1 (CTO) | Fase 0                   |
| I-04  | Configurar lint + format + CI básico                     | ⏳ Pendente   | Dev 1 (CTO) | Fase 0                   |
| I-05  | Rodar as 9 migrations do DB_SCHEMA.md                    | 🔴 Bloqueante | Dev 1 (CTO) | Após T-01 estar revisado |
| I-06  | Aplicar RLS_POLICIES.md no Supabase                      | 🔴 Bloqueante | Dev 1 (CTO) | Após I-05                |
| I-07  | Configurar Auth + roles no Supabase                      | ⏳ Pendente   | Dev 1 (CTO) | Fase 0                   |
| I-08  | Criar buckets no Storage (media, avatars)                | ⏳ Pendente   | Dev 1 (CTO) | Fase 0                   |
| I-09  | Configurar Sentry (frontend)                             | ⏳ Pendente   | Dev 2 (CPO) | Fase 0                   |
| I-10  | Configurar PostHog (eventos)                             | ⏳ Pendente   | Dev 2 (CPO) | Fase 0                   |

### DoD Fase 0 ✓

- [ ] Login funciona (client + provider + admin)
- [ ] Perfis criam com role correto
- [ ] Deploy web automático funcionando
- [ ] Banco com todas as migrations aplicadas
- [ ] RLS validado nos cenários do checklist

---

## FASE 1 — MVP OPERACIONAL (2–3 semanas)

### Backend (Edge Functions)

| #    | Tarefa                      | Status      | Responsável | Observação                  |
| ---- | --------------------------- | ----------- | ----------- | --------------------------- |
| B-01 | `request_create`            | ⏳ Pendente | Dev 1 (CTO) | Aguarda EDGE_FUNCTIONS.md   |
| B-02 | `request_accept`            | ⏳ Pendente | Dev 1 (CTO) | Aguarda EDGE_FUNCTIONS.md   |
| B-03 | `request_update_status`     | ⏳ Pendente | Dev 1 (CTO) | Máquina de estados completa |
| B-04 | `request_complete_with_otp` | ⏳ Pendente | Dev 1 (CTO) | Hash OTP com pgcrypto       |
| B-05 | `ticket_open`               | ⏳ Pendente | Dev 1 (CTO) | Muda status para disputed   |

### Frontend — Fluxo Cliente

| #     | Tela                           | Status      | Responsável |
| ----- | ------------------------------ | ----------- | ----------- |
| FC-01 | Onboarding (nome + permissões) | ⏳ Pendente | Dev 2 (CPO) |
| FC-02 | Home com categorias            | ⏳ Pendente | Dev 2 (CPO) |
| FC-03 | Lista de prestadores           | ⏳ Pendente | Dev 2 (CPO) |
| FC-04 | Criar solicitação              | ⏳ Pendente | Dev 2 (CPO) |
| FC-05 | Acompanhar status (realtime)   | ⏳ Pendente | Dev 2 (CPO) |
| FC-06 | Tela de conclusão com OTP/PIN  | ⏳ Pendente | Dev 2 (CPO) |
| FC-07 | Avaliação pós-serviço          | ⏳ Pendente | Dev 2 (CPO) |
| FC-08 | Abrir ticket                   | ⏳ Pendente | Dev 2 (CPO) |

### Frontend — Fluxo Prestador

| #     | Tela                               | Status      | Responsável |
| ----- | ---------------------------------- | ----------- | ----------- |
| FP-01 | Perfil + categorias + raio         | ⏳ Pendente | Dev 2 (CPO) |
| FP-02 | Toggle online/offline              | ⏳ Pendente | Dev 2 (CPO) |
| FP-03 | Lista de solicitações recebidas    | ⏳ Pendente | Dev 2 (CPO) |
| FP-04 | Solicitação ativa (status + ações) | ⏳ Pendente | Dev 2 (CPO) |
| FP-05 | Finalizar com OTP/PIN              | ⏳ Pendente | Dev 2 (CPO) |
| FP-06 | Histórico de serviços              | ⏳ Pendente | Dev 2 (CPO) |

### Painel Admin

| #     | Tela                                | Status      | Responsável |
| ----- | ----------------------------------- | ----------- | ----------- |
| FA-01 | Prestadores pendentes (verificar)   | ⏳ Pendente | Dev 2 (CPO) |
| FA-02 | Lista de pedidos com filtros        | ⏳ Pendente | Dev 2 (CPO) |
| FA-03 | Detalhe do pedido (eventos + ações) | ⏳ Pendente | Dev 2 (CPO) |
| FA-04 | Fila de tickets                     | ⏳ Pendente | Dev 2 (CPO) |
| FA-05 | Bloqueio de prestador               | ⏳ Pendente | Dev 2 (CPO) |

### DoD Fase 1 ✓

- [ ] Cliente cria pedido e acompanha até concluir
- [ ] Prestador aceita, muda status e conclui com OTP
- [ ] Admin consegue ver e resolver ticket
- [ ] Todos os eventos gravados em `request_events`
- [ ] Sentry capturando erros de frontend

---

## FASE 2 — PÓS-VALIDAÇÃO

| #    | Tarefa                                | Status      | Responsável   |
| ---- | ------------------------------------- | ----------- | ------------- |
| V-01 | Integração de pagamento (Pix/Stripe)  | ⏳ Pendente | Dev 1 (CTO)   |
| V-02 | Chat real (substituir quick messages) | ⏳ Pendente | Dev 1 + Dev 2 |
| V-03 | Push notifications (Expo mobile)      | ⏳ Pendente | Dev 2 (CPO)   |
| V-04 | Antifraude melhorado                  | ⏳ Pendente | Dev 1 (CTO)   |
| V-05 | App mobile (Expo)                     | ⏳ Pendente | Dev 2 (CPO)   |
| V-06 | Matching inteligente (ranking)        | ⏳ Pendente | Dev 1 (CTO)   |

---

## OPERAÇÃO / GROWTH

| #    | Tarefa                                     | Status      | Responsável       | Prazo          |
| ---- | ------------------------------------------ | ----------- | ----------------- | -------------- |
| G-01 | Criar perfis nas redes sociais             | ⏳ Pendente | Sócio 4 (Growth)  | Semana 1       |
| G-02 | Configurar Google Meu Negócio              | ⏳ Pendente | Sócio 4 (Growth)  | Lançamento     |
| G-03 | Recrutar primeiros 15 prestadores          | ⏳ Pendente | Sócio 3 + Sócio 4 | Pré-lançamento |
| G-04 | Criar landing page de lista de espera      | ⏳ Pendente | Dev 2 (CPO)       | Pré-lançamento |
| G-05 | WhatsApp Business configurado              | ⏳ Pendente | Sócio 3 (COO)     | Pré-lançamento |
| G-06 | Panfletagem local (condomínios, comércios) | ⏳ Pendente | Sócio 3 + Sócio 4 | Lançamento     |

---

## PRÓXIMOS DOCUMENTOS A CRIAR (ordem sugerida)

| Prioridade | Documento                        | Por quê                           |
| ---------- | -------------------------------- | --------------------------------- |
| 🔴 Alta    | `EDGE_FUNCTIONS.md`              | Desbloqueia backend (B-01 a B-05) |
| 🔴 Alta    | `PRD.md`                         | Alinha Dev 2 sem reunião infinita |
| 🟡 Média   | `README_OPERACAO.md`             | Libera Sócio 3 operar sozinho     |
| 🟡 Média   | `ARCHITECTURE.md`                | Referência para todo o time       |
| 🟢 Normal  | Fluxograma de estados            | Visual para onboarding da equipe  |
| 🟢 Normal  | Runbooks restantes (R-02 a R-05) | Autonomia dos não-devs            |

---

_Última atualização: criação inicial do tracker_
_Próxima revisão: ao fim da Fase 0_
