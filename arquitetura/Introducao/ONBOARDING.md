# ONBOARDING.md — Ajudaê

> Este é o primeiro documento que qualquer membro da equipe deve ler.
> Ele te diz exatamente o que ler, o que fazer e o que NÃO fazer na sua primeira semana.

---

## Antes de qualquer coisa — entenda o projeto em 3 parágrafos

O **Ajudaê** é um marketplace que conecta pessoas que precisam de fretes, mudanças ou carretos a prestadores verificados próximos. Pensa num iFood, mas em vez de comida, é um carreteiro ou um ajudante de mudança.

A plataforma controla tudo: o cliente faz o pedido pelo app, o prestador aceita, executa e só recebe quando o cliente confirma com um PIN. A gente fica no meio, garantindo segurança para os dois lados e cobrando uma comissão por cada serviço realizado.

O MVP começa num bairro, com foco em validar se as pessoas usam e se os prestadores entregam. Se funcionar, expande. Simples assim.

---

## Onde ficam os documentos

Todos os documentos estão no workspace da equipe, organizados em pastas. A ordem de leitura está neste arquivo. Não saia lendo tudo de uma vez — cada cargo tem seu caminho.

---

## 🟦 Sócio 1 — Tech Lead / CTO

**Você é responsável por:** banco de dados, segurança, Edge Functions, deploy, infraestrutura.

### Semana 1 — leia nesta ordem:

```
1. README.md                  → visão geral do projeto (15 min)
2. Comissionados_Business_Doc → entenda o negócio e seu papel (30 min)
3. docs/ARCHITECTURE.md       → arquitetura completa, decisões e stack (45 min)
4. docs/DB_SCHEMA.md          → as 9 migrations que você vai aplicar (1h)
5. docs/RLS_POLICIES.md       → segurança por tabela — leia com atenção (45 min)
6. docs/EDGE_FUNCTIONS.md     → contratos das 7 funções que você vai implementar (1h)
7. TODO_Comissionados.md      → veja as tarefas da Fase 0 que são suas
```

### Ações da semana 1:

- [ ] Criar projeto no Supabase
- [ ] Criar repositório no GitHub com estrutura Turborepo
- [ ] Aplicar as 9 migrations do `DB_SCHEMA.md`
- [ ] Aplicar as RLS policies do `RLS_POLICIES.md`
- [ ] Configurar Auth + roles (client/provider/admin)
- [ ] Criar projeto do WebApp na Vercel
- [ ] Configurar Cloudflare (DNS, SSL, WAF e recursos auxiliares)
- [ ] Dar acesso ao repositório para os demais membros
- [ ] Criar contas no Sentry e PostHog e compartilhar com Dev 2
- [ ] Dar acesso de leitura ao Sócio 3 no Supabase Dashboard

### Sua regra mais importante:

> Você é o único que pode alterar migrations, RLS policies e Edge Functions. Ninguém mexe nessas áreas sem passar por você. Sem exceção.

---

## 🟩 Sócio 2 — Product Dev / CPO

**Você é responsável por:** frontend (WebApp/PWA), fluxos do cliente e prestador, painel admin, realtime.

### Semana 1 — leia nesta ordem:

```
1. README.md                  → visão geral do projeto (15 min)
2. Comissionados_Business_Doc → entenda o negócio e o produto (30 min)
3. docs/PRD.md                → as 15 telas que você vai construir (1h30)
4. docs/fluxograma_estados    → abra no browser, clique em cada estado (20 min)
5. docs/ARCHITECTURE.md       → entenda como as peças se conectam (45 min)
6. docs/EDGE_FUNCTIONS.md     → veja os contratos das funções que você vai chamar (45 min)
7. TODO_Comissionados.md      → veja as tarefas FC-**, FP-** e FA-** que são suas
```

### Ações da semana 1:

- [ ] Configurar ambiente local (`pnpm install`, `.env.local` com credenciais do Dev 1)
- [ ] Validar a base existente de `apps/web`, `packages/ui`, `packages/shared` e `packages/api`
- [ ] Validar login, middleware e layouts por role antes de abrir novas telas
- [ ] Fechar as pendências do onboarding do cliente antes de avançar para a Tela 2
- [ ] Confirmar as variáveis públicas do Supabase em ambiente local
- [ ] Alinhar com o CTO o estado real de Sentry e PostHog no WebApp
- [ ] Atualizar o tracker do CPO conforme o que já estiver implementado e validado

### Sua regra mais importante:

> Toda chamada crítica (criar pedido, aceitar, concluir) passa pela Edge Function — nunca manipule o banco diretamente do frontend. Se precisar de uma função nova, descreve ao Dev 1.

---

## 🟧 Sócio 3 — Operações / COO

**Você é responsável por:** verificação de prestadores, resolução de tickets, comunicação com usuários, operação diária.

### Semana 1 — leia nesta ordem:

```
1. README.md                    → visão geral (15 min)
2. Comissionados_Business_Doc   → seu cargo, métricas e responsabilidades (30 min)
3. docs/PRD.md seção "Admin"    → as 5 telas do painel que você vai operar (30 min)
4. docs/fluxograma_estados      → abra no browser — entenda cada estado do pedido (20 min)
5. runbooks/README_OPERACAO.md  → manual do seu dia a dia — leia com calma (45 min)
6. runbooks/FAQ_SUPABASE.md     → como consultar dados quando precisar (30 min)
7. runbooks/README_BUGFIX.md    → regras para quando precisar pedir correção (20 min)
8. runbooks/INCIDENTS.md        → como registrar e responder problemas (20 min)
```

### Ações da semana 1:

- [ ] Solicitar acesso de leitura ao Supabase Dashboard (Dev 1 configura)
- [ ] Acessar o painel admin e entender a navegação
- [ ] Criar o WhatsApp Business da plataforma
- [ ] Montar lista dos primeiros 15 prestadores para recrutar (junto com Sócio 4)
- [ ] Revisar e complementar `runbooks/README_OPERACAO.md` com situações reais do bairro
- [ ] Definir rotina diária de verificação (veja checklist no README_OPERACAO.md)
- [ ] Registrar empresa (MEI ou LTDA) junto com o advogado

### Sua regra mais importante:

> Você NÃO mexe em código. Para qualquer problema técnico: descreve a situação, abre uma issue no GitHub, e chama o Dev 1 ou Dev 2. Use o `README_BUGFIX.md` se for algo leve.

### Métricas que você acompanha semanalmente:

- Prestadores verificados e ativos
- Tickets abertos há mais de 4h (meta: zero)
- Taxa de conclusão de pedidos (meta: > 85%)

---

## 🟨 Sócio 4 — Growth / Comunidade

**Você é responsável por:** captação de prestadores, redes sociais, SEO local, crescimento da base de usuários.

### Semana 1 — leia nesta ordem:

```
1. README.md                   → visão geral (15 min)
2. Comissionados_Business_Doc  → seções de Marketing, SEO e Divulgação (45 min)
3. docs/PRD.md seções Cliente  → entenda a jornada de quem vai usar o app (30 min)
4. runbooks/README_OPERACAO.md → entenda o dia a dia para falar com prestadores (20 min)
```

### Ações da semana 1:

- [ ] Criar perfis no Instagram, TikTok e WhatsApp Business da plataforma
- [ ] Criar a conta no Google Meu Negócio
- [ ] Montar planilha de prestadores-alvo no bairro (nome, telefone, categoria)
- [ ] Começar contato presencial com os primeiros 10 prestadores
- [ ] Criar os primeiros 3 posts de apresentação da marca para Instagram
- [ ] Mapear grupos de WhatsApp/Telegram do bairro para divulgação no lançamento
- [ ] Criar calendário editorial das primeiras 4 semanas

### Sua regra mais importante:

> O gargalo do MVP não é o app — é ter prestadores verificados e ativos. Cada prestador que você trouxer antes do lançamento vale mais do que qualquer post nas redes.

### Sua métrica principal:

> **Prestadores verificados e online no dia do lançamento** — meta mínima: 15.

---

## 🟥 Sócio 5 — Suporte / QA

**Você é responsável por:** testar todos os fluxos antes de cada deploy, reportar bugs, apoiar o COO com tickets.

### Semana 1 — leia nesta ordem:

```
1. README.md                   → visão geral (15 min)
2. docs/PRD.md completo        → leia TUDO — você vai testar cada tela (1h30)
3. docs/fluxograma_estados     → abra no browser, entenda cada transição (20 min)
4. runbooks/README_OPERACAO.md → entenda as situações que você vai apoiar (30 min)
5. runbooks/INCIDENTS.md       → como registrar um bug ou incidente (15 min)
```

### Ações da semana 1:

- [ ] Criar conta de teste como **Cliente** no ambiente de desenvolvimento
- [ ] Criar conta de teste como **Prestador** no ambiente de desenvolvimento
- [ ] Percorrer o fluxo completo: criar pedido → aceitar → concluir com PIN
- [ ] Anotar qualquer tela que não segue o que está descrito no PRD
- [ ] Criar template de relatório de bug (título, passos, comportamento esperado, comportamento real, print)
- [ ] Combinar com Dev 2 a cadência de testes antes de cada deploy

### Sua regra mais importante:

> Você é os olhos do usuário real. Se algo te confundiu, vai confundir o cliente. Registre tudo, sem filtro.

### Sua métrica principal:

> **Zero bugs críticos chegando em produção** — qualquer falha no fluxo de conclusão com PIN precisa ser reportada antes do deploy.

---

## Regras que valem para TODOS

| Regra                          | Detalhe                                |
| ------------------------------ | -------------------------------------- |
| Canal de comunicação principal | [WhatsApp / Slack / Discord — definir] |
| Reunião semanal                | [Dia e horário — definir]              |
| Decisões estratégicas          | Unanimidade dos sócios                 |
| Gastos acima de R$ 5.000       | Aprovação de 2 de 3 sócios fundadores  |
| Alteração de banco/segurança   | Apenas Tech Lead (Sócio 1)             |
| Deploy em produção             | Apenas Tech Lead, equipe avisada       |
| Dúvida sobre o produto         | Perguntar ao CPO (Sócio 2)             |
| Problema com usuário/prestador | Redirecionar ao COO (Sócio 3)          |

---

## O que NÃO fazer (lista rápida)

🚫 Não commitar direto na `main`
🚫 Não mexer em migrations ou RLS sem o Tech Lead
🚫 Não combinar pagamento ou serviço fora da plataforma com prestadores
🚫 Não tomar decisão de produto sem alinhar com o CPO
🚫 Não responder reclamação de usuário sem consultar o COO se for algo sério
🚫 Não divulgar o produto antes da landing page estar no ar

---

## Quando o 6º membro entrar

Compartilhe este documento com ele no primeiro dia. Defina o cargo, adicione a linha na tabela da equipe no README.md e siga o mesmo fluxo de onboarding adaptado para a função.

---

_Ajudaê — ONBOARDING v1.1_
_Atualizar sempre que um novo membro entrar ou uma responsabilidade mudar._
