# Ajudaê

> Marketplace de serviços locais sob demanda — conectando clientes a prestadores verificados para fretes, mudanças e carretos.

---

## O que é o Ajudaê?

O Ajudaê é uma plataforma que resolve um problema simples: **"Preciso de um frete agora e não conheço ninguém de confiança."**

Funcionamos como intermediador entre quem precisa de um serviço (Cliente) e quem executa (Prestador verificado), controlando todo o ciclo: solicitação → aceite → execução → confirmação com PIN → pagamento. Modelo iFood/Uber aplicado a fretes, mudanças e carretos.

**MVP:** lançamento bairro a bairro, ~1.000 usuários, WebApp/PWA primeiro.

---

## A Equipe

| Membro  | Cargo             | Responsabilidade principal             |
| ------- | ----------------- | -------------------------------------- |
| Sócio 1 | Tech Lead / CTO   | Backend, banco, segurança, deploy      |
| Sócio 2 | Product Dev / CPO | Frontend, UX, produto, admin           |
| Sócio 3 | Operações / COO   | Tickets, prestadores, dia a dia        |
| Sócio 4 | Growth            | Captação de prestadores, redes sociais |
| Sócio 5 | Suporte / QA      | Testes, tickets, campo                 |

---

## Stack Resumida

```
Frontend:  Next.js (WebApp/PWA) + Expo (Mobile, Fase 2) + Electron (Admin)
Backend:   Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
Hosting:   Vercel (deploy do WebApp)
Edge/Infra: Cloudflare (DNS, SSL, WAF, CDN, Workers)
Monorepo:  Turborepo + pnpm
Analytics: PostHog (eventos) + Sentry (erros)
```

---

## Estrutura do Repositório

```
ajudae/
├── apps/
│   ├── web/          → Next.js — WebApp + PWA (produto principal)
│   ├── mobile/       → Expo — App iOS/Android (Fase 2)
│   ├── desktop/      → Electron — Painel admin
│   └── admin/        → (opcional) Next.js admin separado
├── packages/
│   ├── ui/           → Design system compartilhado
│   ├── shared/       → Types, schemas Zod, utils
│   └── api/          → Supabase client + wrappers
├── supabase/
│   ├── migrations/   → SQL versionado
│   └── functions/    → Edge Functions (Deno)
├── runbooks/         → Documentação operacional
└── docs/             → Documentação técnica
```

---

## Documentação Completa

### 📋 Comece por aqui

| Documento                           | Para quem | O que é                                        |
| ----------------------------------- | --------- | ---------------------------------------------- |
| **ONBOARDING.md**                   | Todos     | Primeiro arquivo a ler. Guia por membro.       |
| **Comissionados_Business_Doc.docx** | Todos     | Visão de negócio, cargos, comissões, marketing |

### 🏗️ Técnica (Devs)

| Documento                        | Para quem | O que é                                          |
| -------------------------------- | --------- | ------------------------------------------------ |
| **docs/ARCHITECTURE.md**         | Devs      | Diagrama, stack, decisões arquiteturais          |
| **docs/DB_SCHEMA.md**            | Dev 1     | 9 migrations SQL completas                       |
| **docs/RLS_POLICIES.md**         | Dev 1     | Segurança por tabela                             |
| **docs/EDGE_FUNCTIONS.md**       | Dev 1     | 7 funções com contratos detalhados               |
| **docs/PRD.md**                  | Dev 2     | 15 telas documentadas com regras de produto      |
| **docs/fluxograma_estados.html** | Todos     | Máquina de estados interativa — abrir no browser |

### 🛠️ Operação (Não-devs)

| Documento                       | Para quem       | O que é                                        |
| ------------------------------- | --------------- | ---------------------------------------------- |
| **runbooks/README_OPERACAO.md** | Sócio 3 (COO)   | O que fazer em cada situação do dia a dia      |
| **runbooks/README_BUGFIX.md**   | Sócios 3, 4 e 5 | Como pedir correção à IA sem quebrar o projeto |
| **runbooks/FAQ_SUPABASE.md**    | Sócios 3, 4 e 5 | Como consultar o banco de dados                |
| **runbooks/DEPLOY_GUIDE.md**    | Dev 1           | Como publicar e aplicar migrations             |
| **runbooks/INCIDENTS.md**       | Todos           | Registro e resposta a incidentes               |

### 📁 Acompanhamento

| Documento                 | Para quem | O que é                                    |
| ------------------------- | --------- | ------------------------------------------ |
| **TODO_Comissionados.md** | Todos     | ~50 tarefas com status, responsável e fase |

### ⚖️ Jurídico (Rascunhos — revisar com advogado)

| Documento                              | Para quem | O que é                             |
| -------------------------------------- | --------- | ----------------------------------- |
| **legal/Termos_de_Servico.docx**       | Sócios    | Base para os Termos públicos        |
| **legal/Politica_de_Privacidade.docx** | Sócios    | Base para a Política de Privacidade |
| **legal/Acordo_de_Socios.docx**        | Sócios    | Base para o Acordo entre fundadores |

---

## Fluxo do Pedido (resumo)

```
Cliente cria pedido → Prestador aceita → A caminho → Em execução → PIN/OTP → Concluído
                                                                         ↓
                                                              Repasse ao prestador (D+1)
```

Estados possíveis: `requested → accepted → en_route → in_progress → completed`
Saídas: `cancelled`, `expired`, `disputed`

Ver diagrama interativo: `docs/fluxograma_estados.html`

---

## Fases do Projeto

| Fase       | Prazo       | Entregável               | Meta                     |
| ---------- | ----------- | ------------------------ | ------------------------ |
| **Fase 0** | 3–5 dias    | Auth + DB + deploy web   | Infraestrutura pronta    |
| **Fase 1** | 2–3 semanas | MVP operacional completo | Primeiros 50 serviços    |
| **Fase 2** | 1–2 meses   | Pagamento + chat         | Break-even no bairro     |
| **Fase 3** | 3–6 meses   | Mobile nativo + escala   | Expansão para 3+ bairros |

---

## Regras do Repositório

1. **Nunca commitar direto na `main`** — todo código vai por PR
2. **Migrations e RLS policies:** apenas Tech Lead (Sócio 1) altera
3. **Edge Functions:** apenas Tech Lead altera
4. **Rodar `pnpm lint` antes de qualquer PR**
5. **Todo PR precisa de issue vinculada**
6. **Não commitar arquivos `.env`**

Ver detalhes em `runbooks/README_BUGFIX.md`.

---

## Primeiros Passos (Fase 0)

```bash
# Clonar o repositório
git clone https://github.com/[ORG]/comissionados.git
cd comissionados

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp apps/web/.env.example apps/web/.env.local
# Preencher com as credenciais do Supabase

# Subir o ambiente local
pnpm dev
```

> Credenciais do Supabase, Vercel e Cloudflare: solicitar ao Tech Lead (Sócio 1).

---

## Contatos da Equipe

| Membro | Cargo             | Contato             |
| ------ | ----------------- | ------------------- |
| [Nome] | Tech Lead / CTO   | [WhatsApp / e-mail] |
| [Nome] | Product Dev / CPO | [WhatsApp / e-mail] |
| [Nome] | COO               | [WhatsApp / e-mail] |
| [Nome] | Growth            | [WhatsApp / e-mail] |
| [Nome] | Suporte / QA      | [WhatsApp / e-mail] |

---

_Ajudaê — README v1.1 | Atualizado com Vercel como hosting e Cloudflare como camada de borda_
