# INCIDENTS.md — Comissionados

> Registro de incidentes e templates para resposta estruturada.
> Todo incidente deve ser registrado aqui após resolução — sem exceção.
> **Por quê:** Cada incidente é aprendizado. O registro evita repetição.

---

## Severidade

| Nível           | Critério                                                    | Tempo de resposta          |
| --------------- | ----------------------------------------------------------- | -------------------------- |
| 🔴 P1 — Crítico | App fora do ar, banco inacessível, dados expostos           | Imediato — todos acionados |
| 🟠 P2 — Alto    | Fluxo principal quebrado (não dá pra criar/concluir pedido) | < 1 hora                   |
| 🟡 P3 — Médio   | Feature específica com bug, painel admin com erro           | < 4 horas                  |
| 🟢 P4 — Baixo   | Texto errado, visual quebrado, lentidão leve                | Próximo ciclo de deploy    |

---

## Template de Incidente

Copie e preencha abaixo a cada novo incidente:

```
## INCIDENTE #XXX — [Título curto]

**Data/Hora de início:** dd/mm/yyyy HH:MM
**Data/Hora de resolução:** dd/mm/yyyy HH:MM
**Duração:** X horas Y minutos
**Severidade:** P1 / P2 / P3 / P4
**Quem identificou:** Nome
**Quem resolveu:** Nome(s)

### O que aconteceu
[Descrição clara do problema. O que o usuário viu/sentiu.]

### Impacto
- Usuários afetados: X clientes, Y prestadores
- Pedidos afetados: Z pedidos
- Receita impactada: R$ XX (estimativa)

### Causa raiz
[O que causou o problema de fato. Seja técnico e honesto.]

### Como foi resolvido
[Passo a passo do que foi feito para resolver.]

### Linha do tempo
- HH:MM — Incidente identificado
- HH:MM — Time acionado
- HH:MM — Causa identificada
- HH:MM — Correção aplicada
- HH:MM — Incidente encerrado

### O que aprendemos
[Reflexão honesta: o que poderíamos ter feito para evitar?]

### Ações de prevenção
- [ ] Ação 1 — Responsável — Prazo
- [ ] Ação 2 — Responsável — Prazo
```

---

## Checklist de Resposta a Incidentes

### P1 — Crítico (app fora do ar)

```
[ ] Identificar e documentar o horário exato do início
[ ] Acionar Tech Lead imediatamente (ligação, não mensagem)
[ ] Acionar todos os sócios
[ ] Verificar status do Supabase: https://status.supabase.com
[ ] Verificar status do Cloudflare: https://www.cloudflarestatus.com
[ ] Verificar logs no Sentry (erros recentes)
[ ] Verificar se foi algum deploy recente que causou (rollback se necessário)
[ ] Comunicar usuários se durar mais de 30 minutos (WhatsApp Business)
[ ] Resolver
[ ] Preencher o template acima
[ ] Revisar ações de prevenção com o time
```

### P2 — Alto (fluxo principal quebrado)

```
[ ] Identificar o fluxo afetado (criar pedido? aceitar? concluir?)
[ ] Verificar logs da Edge Function relacionada
[ ] Verificar se é bug de frontend ou backend
[ ] Acionar Tech Lead
[ ] Aplicar hotfix ou rollback
[ ] Testar o fluxo após correção
[ ] Preencher o template acima
```

### P3/P4 — Médio/Baixo

```
[ ] Registrar como issue no GitHub
[ ] Classificar prioridade
[ ] Incluir no próximo ciclo de sprint/deploy
[ ] Preencher o template acima (resumido)
```

---

## Mensagem Padrão para Usuários (P1/P2)

Use no WhatsApp Business quando o problema afetar usuários:

> "Olá! Identificamos uma instabilidade na plataforma e nossa equipe já está trabalhando para resolver.
> Pedimos desculpas pelo inconveniente. Avisaremos assim que tudo estiver normalizado. 🙏"

Quando resolver:

> "Plataforma normalizada! ✅ Se tiver qualquer dificuldade, é só chamar aqui. Obrigado pela paciência!"

---

## Registro de Incidentes

> Adicione novos incidentes abaixo, em ordem cronológica (mais recente por último).

---

### INCIDENTE #001 — [Exemplo / Template]

**Data/Hora de início:** --/--/---- --:--
**Data/Hora de resolução:** --/--/---- --:--
**Duração:** --
**Severidade:** --
**Quem identificou:** --
**Quem resolveu:** --

_Primeiro incidente real a ser documentado aqui após o lançamento._

---

## Contatos de Emergência

| Situação                     | Contato                        | Canal           |
| ---------------------------- | ------------------------------ | --------------- |
| Bug crítico — banco/infra    | Tech Lead (Sócio 1)            | Ligação         |
| Bug de produto/frontend      | Dev 2 (Sócio 2)                | WhatsApp        |
| Operação/usuário afetado     | COO (Sócio 3)                  | WhatsApp        |
| Problema jurídico/financeiro | Advogado parceiro              | E-mail/telefone |
| Suporte Supabase             | https://supabase.com/support   | Ticket          |
| Suporte Cloudflare           | https://support.cloudflare.com | Ticket          |
