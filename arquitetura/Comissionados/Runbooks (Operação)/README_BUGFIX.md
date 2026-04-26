# README_BUGFIX.md — Ajudaê

> Guia para correções leves com IA (Claude/Codex) sem quebrar o projeto.
> **Para:** Sócio 3 (COO) e Sócio 4 (Growth) — não-devs que precisam resolver algo simples.
> **Regra de ouro:** Na dúvida, NÃO mexa. Chame o Tech Lead.

---

## Antes de qualquer coisa — o checklist de segurança

```
[ ] O bug está documentado em uma issue no GitHub?
[ ] Você avisou o Tech Lead antes de mexer?
[ ] Vai abrir PR — nunca commitar direto na main?
[ ] Vai rodar pnpm lint antes de submeter?
[ ] NÃO vai mexer em: migrations, RLS policies, Edge Functions, .env?
```

Se respondeu "não" para qualquer item: pare e chame o Tech Lead.

---

## O que você PODE corrigir (com IA)

✅ Textos errados na interface (label, mensagem de erro, tooltip)
✅ Cor ou estilo de um botão
✅ Ordem de itens numa lista
✅ Texto de e-mail ou notificação push
✅ Texto de mensagens rápidas pré-definidas

---

## O que você NUNCA deve mexer

🚫 Qualquer arquivo em `supabase/migrations/`
🚫 Qualquer arquivo em `supabase/functions/`
🚫 Arquivos de RLS policies
🚫 Variáveis de ambiente (`.env`, `.env.local`)
🚫 Arquivos de configuração de autenticação
🚫 Lógica de pagamento
🚫 Qualquer coisa que o lint reclamar sem você entender o porquê

---

## Passo a passo para uma correção leve

### Passo 1 — Documente o bug

Abra uma issue no GitHub com:

- **Título:** `[BUG] Descrição curta do problema`
- **O que está acontecendo:** print ou descrição
- **O que deveria acontecer:** comportamento esperado
- **Onde está:** nome da tela ou componente

### Passo 2 — Avise o Tech Lead

Mande mensagem avisando que vai tentar corrigir. Ele pode já saber da causa e te poupar tempo.

### Passo 3 — Use a IA com o prompt padrão abaixo

Copie e cole este prompt no Claude ou Codex, substituindo os campos indicados:

```
Contexto:
Estou trabalhando no projeto Ajudaê, um marketplace de serviços locais
construído em Next.js + TypeScript + Supabase. Sou não-desenvolvedor e preciso
de uma correção simples e segura.

Bug:
[DESCREVA O BUG AQUI - o que está errado e onde]

Comportamento esperado:
[O QUE DEVERIA ACONTECER]

Arquivo provavelmente afetado:
[NOME DO ARQUIVO SE SOUBER, ou "não sei"]

Regras OBRIGATÓRIAS para a correção:
1. Não refatorar código além do necessário
2. Não mexer em schema de banco, migrations ou RLS policies
3. Não mexer em Edge Functions (pasta supabase/functions)
4. Não alterar variáveis de ambiente
5. Correção mínima possível

Me dê:
1. Explicação do que está errado
2. Qual arquivo alterar
3. O diff exato da mudança (antes/depois)
4. Como testar que funcionou
5. Riscos da mudança
```

### Passo 4 — Revise o que a IA sugeriu

Antes de aplicar qualquer mudança, verifique:

- A mudança é só no arquivo que a IA disse?
- É só texto/estilo? (tranquilo)
- Envolve lógica, banco ou auth? → Pare, chame o Tech Lead

### Passo 5 — Crie uma branch e aplique

```bash
# No terminal, dentro da pasta do projeto:
git checkout -b fix/descricao-curta-do-bug
# Aplique a mudança manualmente no arquivo
git add .
git commit -m "fix: descrição curta do que foi corrigido"
```

### Passo 6 — Rode o lint

```bash
pnpm lint
```

Se aparecer erro vermelho: NÃO continue. Chame o Tech Lead.
Se aparecer só avisos amarelos: tudo bem, continue.

### Passo 7 — Abra o Pull Request

- Acesse o repositório no GitHub
- Clique em "Compare & pull request"
- **Título:** `fix: descrição curta`
- **Descrição:** link para a issue + o que foi alterado + como testou
- Marque o Tech Lead como revisor
- **Nunca clique em "Merge" sozinho**

---

## Exemplo real — corrigir texto errado num botão

**Bug:** Botão na tela de conclusão está escrito "Confirmar conclusão" mas deveria ser "Finalizar serviço"

**Prompt para a IA:**

```
...
Bug: O botão na tela de conclusão do prestador está com o texto "Confirmar conclusão"
mas o produto definiu que deve ser "Finalizar serviço".

Arquivo provavelmente afetado: apps/web/src/app/provider/request/[id]/complete/page.tsx
(ou similar)

[Resto do prompt padrão]
```

**O que a IA vai retornar:**

```diff
- <Button>Confirmar conclusão</Button>
+ <Button>Finalizar serviço</Button>
```

**Você aplica, roda o lint, abre o PR. Simples.**

---

## Quando chamar o Tech Lead imediatamente

- A IA sugeriu mexer em mais de 3 arquivos
- A IA sugeriu alterar qualquer arquivo em `supabase/`
- O lint retornou erro (linha vermelha)
- Você não entendeu o diff que a IA gerou
- O bug envolve login, pagamento ou status de pedido
- O app quebrou depois da sua mudança
