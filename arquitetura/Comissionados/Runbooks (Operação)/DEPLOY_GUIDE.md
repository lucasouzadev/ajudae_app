# DEPLOY_GUIDE.md — Ajudaê

> Passo a passo para publicar o app e aplicar mudanças em produção.
> **Owner:** Tech Lead (Sócio 1) — executa todos os deploys de produção.
> **Outros membros:** podem acompanhar, mas não executam sem o Tech Lead presente.

---

## Ambientes

| Ambiente | URL                     | Branch      | Quando usar              |
| -------- | ----------------------- | ----------- | ------------------------ |
| Produção | (preencher após deploy) | `main`      | Código estável, validado |
| Preview  | Gerado automaticamente  | Qualquer PR | Testar antes de mergear  |
| Local    | `localhost:3000`        | Qualquer    | Desenvolvimento          |

**Regra:** Nunca deploye direto na `main`. Todo código passa por PR e review.

---

## Deploy do WebApp (Vercel)

### Como funciona (automático)

O deploy é automático via integração GitHub → Vercel:

1. PR aprovado e mergeado na `main`
2. A Vercel dispara o build
3. A Vercel publica a versão de produção
4. O Cloudflare continua na frente com DNS, SSL, WAF e demais recursos configurados

**Você não precisa fazer nada além de mergear o PR na branch certa.**

### Como acompanhar o deploy

1. Acesse o dashboard da Vercel
2. Abra o projeto do Ajudaê
3. Veja o status do deploy mais recente em **Deployments**
4. Se aparecer erro: abrir log e chamar Tech Lead

### Deploy manual (emergência)

```bash
# Apenas Tech Lead executa isso
npx vercel --prod
```

---

## Cloudflare (DNS, SSL, WAF e edge)

O Cloudflare não hospeda o WebApp principal. Ele complementa a Vercel com:

- DNS do domínio
- SSL/TLS e regras de borda
- WAF e rate limiting
- CDN e Workers, quando necessário

### O que verificar no Cloudflare após mudanças de infra

1. DNS apontando corretamente para a Vercel
2. SSL ativo e sem erro de certificado
3. WAF e rate limits sem bloquear tráfego legítimo
4. Workers e regras de cache compatíveis com a release atual

---

## Aplicar Migrations no Banco (Supabase)

**⚠️ APENAS Tech Lead executa migrations. Erro aqui pode derrubar o app.**

### Fluxo padrão

```bash
# 1. Testar a migration localmente primeiro
supabase db diff --use-migra

# 2. Aplicar em produção
supabase db push

# 3. Verificar se aplicou corretamente
supabase db diff  # deve retornar vazio se sincronizado
```

### Verificar migrations aplicadas

No Supabase Dashboard:

1. Vá em **Database** → **Migrations**
2. Veja a lista de migrations com data de aplicação

### Rollback de migration

Não há rollback automático. Se uma migration quebrar algo:

1. Identificar o problema nos logs
2. Escrever migration de correção (reverter manualmente)
3. Aplicar a migration de correção
4. Registrar em `INCIDENTS.md`

---

## Deploy de Edge Functions

**⚠️ APENAS Tech Lead executa.**

```bash
# Subir uma função específica
supabase functions deploy request_create

# Subir todas as funções
supabase functions deploy

# Verificar logs após deploy
supabase functions logs request_create --tail
```

### Verificar se a função está funcionando

```bash
# Teste básico (substitua TOKEN e URL)
curl -X POST \
  https://SEU_PROJETO.supabase.co/functions/v1/request_create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category_id": "...", "address_origin": "Rua Teste, 123"}'
```

---

## Variáveis de Ambiente

### Onde ficam

- **Vercel:** Project Settings → Environment Variables
- **Supabase Functions:** Dashboard → Edge Functions → Secrets
- **Cloudflare:** usar para segredos apenas quando houver Worker ou serviço específico
- **Local:** arquivo `.env.local` (nunca commitar no git)

### Variáveis obrigatórias — WebApp

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

### Variáveis obrigatórias — Edge Functions

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
COMMISSION_RATE=0.15
OTP_EXPIRY_MINUTES=60
MAX_OTP_ATTEMPTS=5
REQUEST_EXPIRY_MINUTES=30
```

**Nunca compartilhe a `SERVICE_ROLE_KEY` com ninguém além do Tech Lead.**

---

## Checklist pré-deploy (produção)

```
[ ] PR revisado e aprovado pelo Tech Lead
[ ] pnpm lint passou sem erros
[ ] pnpm test passou (quando testes existirem)
[ ] Mudanças testadas no ambiente de preview
[ ] Se tiver migration: testada localmente antes
[ ] Sentry configurado para capturar erros do novo código
[ ] Tech Lead avisou o time do deploy
```

---

## Checklist pós-deploy

```
[ ] Acessar a URL de produção e testar o fluxo principal
[ ] Verificar Sentry: nenhum erro novo nos primeiros 10 minutos
[ ] Verificar Vercel: deploy concluído sem erro
[ ] Verificar Cloudflare: DNS, SSL e WAF sem incidente
[ ] Se for migration: verificar no Dashboard que foi aplicada
[ ] Registrar o deploy no canal da equipe (WhatsApp/Slack)
```

---

## O que fazer se o deploy quebrar

1. **Identificar:** Qual foi a última mudança? Qual o erro?
2. **Rollback imediato:** Na Vercel, vá em Deployments e promova o último deploy estável
3. **Isolar:** Criar hotfix branch a partir do último commit estável
4. **Corrigir e retestar** antes de qualquer novo deploy
5. **Registrar** em `INCIDENTS.md`

---

## Contato durante deploy

Durante qualquer deploy em produção, o Tech Lead deve estar disponível no WhatsApp por pelo menos 30 minutos após a publicação.
