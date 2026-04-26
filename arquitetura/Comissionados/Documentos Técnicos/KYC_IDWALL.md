# KYC — Verificação de Identidade de Prestadores (Idwall)

> **Documento:** Especificação técnica de integração com o Idwall para verificação de identidade (KYC) dos prestadores do Ajudaê.
> **Status:** Projetado — não implementado
> **Dono:** CTO
> **Última atualização:** 2026-04-10

---

## Por que KYC?

O Ajudaê coloca prestadores dentro da casa e do caminhão dos clientes. A verificação de identidade é a camada de confiança que diferencia o marketplace de um serviço informal. O objetivo é garantir que:

1. O prestador é quem diz ser (documento + biometria facial)
2. Não tem antecedentes criminais relevantes
3. O CPF está regular na Receita Federal
4. A CNH é válida e não está vencida (quando aplicável)

---

## Visão Geral da Arquitetura em Duas Fases

### Fase 1 — Verificação Manual (Implementar agora)

O prestador faz upload do documento e selfie. O admin verifica manualmente antes de aprovar.

```
Prestador preenche formulário
  → faz upload de CNH/RG (foto) → Supabase Storage: provider-docs/{userId}/document.jpg
  → faz upload de selfie         → Supabase Storage: provider-docs/{userId}/selfie.jpg
  → submitted_at é setado

Admin acessa /admin/providers
  → visualiza as imagens lado a lado
  → compara rosto da selfie com o documento
  → clica Aprovar ou Rejeitar com motivo
```

**Vantagem:** zero custo, zero integração nova.
**Limitação:** não escala quando volume de cadastros aumentar.

---

### Fase 2 — Idwall automatizado (Implementar quando volume justificar)

O Idwall vira a primeira barreira automática. O admin passa a ser segunda barreira, só revisando casos de dúvida.

```
Prestador acessa /provider/onboarding
  → backend cria sessão no Idwall (Edge Function provider_kyc_start)
  → SDK Idwall abre no browser (captura guiada: documento + selfie + liveness)
  → Idwall processa (~30s) e manda webhook para /api/idwall/webhook
  → backend atualiza providers.kyc_status

  Se kyc_status = 'approved' (score ≥ 70):
    Admin vê "✅ KYC aprovado pelo Idwall" — tende a aprovar rapidamente
  Se kyc_status = 'manual_review' (score < 70):
    Admin vê o relatório completo e decide
  Se kyc_status = 'rejected':
    Admin vê o motivo — pode rejeitar diretamente
```

---

## Diagrama de Sequência — Fase 2

```
[Prestador]      [Next.js Frontend]    [Edge Function]     [Idwall API]     [Webhook Handler]    [Admin]
     │                   │                    │                  │                   │               │
     │── abre onboarding ►│                    │                  │                   │               │
     │                   │── callFunction ────►│                  │                   │               │
     │                   │   provider_kyc_start│── POST /reports─►│                   │               │
     │                   │                    │◄─ { report_id,   │                   │               │
     │                   │                    │    sdk_token }    │                   │               │
     │                   │◄── { sdk_token } ──│                  │                   │               │
     │                   │                    │                  │                   │               │
     │◄── SDK Idwall abre no browser ─────────────────────────── │                   │               │
     │   (captura doc + selfie + liveness check)                  │                   │               │
     │── conclui captura ──────────────────────────────────────── │                   │               │
     │                   │                    │                  │                   │               │
     │                   │                    │    Idwall processa (~30s)             │               │
     │                   │                    │                  │── POST webhook ───►│               │
     │                   │                    │                  │   { report_id,     │               │
     │                   │                    │                  │     status, score, │               │
     │                   │                    │                  │     checks }       │               │
     │                   │                    │                  │                   │── UPDATE ─────►DB
     │                   │                    │                  │                   │   kyc_status   │
     │                   │                    │                  │                   │               │
     │                   │── polling kyc_status (Realtime) ──────────────────────────               │
     │◄── tela atualiza: "Verificação concluída" ────────────────                                   │
     │                   │                    │                  │                   │               │
     │                   │                    │                  │                   │  ◄── painel atualiza
     │                   │                    │                  │                   │     vê score + checks
     │                   │                    │                  │                   │     clica Aprovar
```

---

## Schema — Migration 020

Arquivo a criar: `supabase/migrations/020_providers_kyc.sql`

```sql
-- Adiciona campos de KYC na tabela providers
ALTER TABLE providers
  ADD COLUMN kyc_status       TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN kyc_report_id    TEXT,
  ADD COLUMN kyc_completed_at TIMESTAMPTZ,
  ADD COLUMN kyc_score        INTEGER,
  ADD COLUMN kyc_result       JSONB;

-- Constraint nos valores permitidos
ALTER TABLE providers
  ADD CONSTRAINT providers_kyc_status_check
  CHECK (kyc_status IN (
    'not_started',   -- nunca iniciou
    'in_progress',   -- SDK aberto, aguardando captura/webhook
    'approved',      -- Idwall aprovou automaticamente (score ≥ 70)
    'manual_review', -- Idwall aprovou mas score < 70 → admin decide
    'rejected'       -- Idwall rejeitou (documento inválido, liveness falhou, etc.)
  ));

-- Índice para o admin filtrar por kyc_status
CREATE INDEX idx_providers_kyc_status ON providers(kyc_status);

-- Índice para correlacionar webhook com provider (report_id)
CREATE INDEX idx_providers_kyc_report_id ON providers(kyc_report_id);

COMMENT ON COLUMN providers.kyc_status       IS 'Status da verificação de identidade via Idwall';
COMMENT ON COLUMN providers.kyc_report_id    IS 'ID do relatório no Idwall — usado para correlacionar webhook';
COMMENT ON COLUMN providers.kyc_score        IS 'Score de 0–100 retornado pelo Idwall. ≥70 = aprovação automática';
COMMENT ON COLUMN providers.kyc_completed_at IS 'Timestamp de quando o webhook do Idwall foi recebido';
COMMENT ON COLUMN providers.kyc_result       IS 'Payload completo do webhook (JSONB) — auditoria imutável';
```

> ⚠️ **Regra:** nunca alterar migrations existentes. Criar `020_providers_kyc.sql` como arquivo novo.

---

## Edge Function: `provider_kyc_start`

Arquivo: `supabase/functions/provider_kyc_start/index.ts`

**Responsabilidade:** autenticar o prestador, criar sessão no Idwall, atualizar `kyc_report_id` e `kyc_status = 'in_progress'`, retornar o `sdk_token` para o frontend.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // 1. Verificar JWT
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers: CORS })
  }

  // 2. Buscar role em profiles (fonte de verdade)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'provider') {
    return new Response(JSON.stringify({ error: 'Acesso negado.' }), { status: 403, headers: CORS })
  }

  // 3. Buscar CPF do provider
  const { data: provider } = await supabase
    .from('providers')
    .select('cpf, kyc_status')
    .eq('id', user.id)
    .single()

  // Não reinicia se já está em andamento ou concluído
  if (provider?.kyc_status === 'approved') {
    return new Response(JSON.stringify({ error: 'KYC já aprovado.' }), { status: 400, headers: CORS })
  }

  // 4. Criar sessão no Idwall
  const idwallRes = await fetch('https://api.idwall.co/v1/reports', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('IDWALL_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id:   Deno.env.get('IDWALL_WORKFLOW_ID'),
      person: {
        name:  profile.name,
        cpf:   provider?.cpf,
        email: user.email,
      },
    }),
  })

  if (!idwallRes.ok) {
    const err = await idwallRes.text()
    console.error('[provider_kyc_start] Idwall error:', err)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de verificação.' }), { status: 502, headers: CORS })
  }

  const { report_id, sdk_token } = await idwallRes.json()

  // 5. Salvar report_id e marcar como in_progress
  await supabase
    .from('providers')
    .update({ kyc_report_id: report_id, kyc_status: 'in_progress' })
    .eq('id', user.id)

  return new Response(JSON.stringify({ sdk_token }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
```

**Deploy:**
```bash
supabase functions deploy provider_kyc_start
```

---

## API Route: `/api/idwall/webhook`

Arquivo: `apps/web/app/api/idwall/webhook/route.ts`

**Responsabilidade:** receber o resultado do Idwall (sem JWT — é chamado pelo servidor deles), verificar a assinatura HMAC, atualizar `providers` com o resultado.

> ⚠️ Esta rota usa `SUPABASE_SERVICE_ROLE_KEY` para bypassar RLS. Nunca expor essa chave no frontend.

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

// Tipo esperado do webhook do Idwall
interface IdwallWebhookPayload {
  report_id:  string
  status:     'APPROVED' | 'REJECTED' | 'PROCESSING'
  score:      number      // 0–100
  checks: {
    document:       { status: string; type?: string; expires_at?: string }
    facial_match:   { status: string; similarity?: number }
    liveness:       { status: string }
    background:     { status: string; records?: unknown[] }
    cpf_receita:    { status: string; situation?: string }
  }
}

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.IDWALL_WEBHOOK_SECRET
  if (!secret) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  // timingSafeEqual previne timing attacks
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

function mapKycStatus(status: string, score: number): string {
  if (status === 'APPROVED' && score >= 70) return 'approved'
  if (status === 'APPROVED' && score < 70)  return 'manual_review'
  return 'rejected'
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-idwall-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let payload: IdwallWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  // Ignora webhooks intermediários de "PROCESSING"
  if (payload.status === 'PROCESSING') {
    return NextResponse.json({ received: true })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,   // service_role — bypass RLS intencional
  )

  const kycStatus = mapKycStatus(payload.status, payload.score)

  const { error } = await supabase
    .from('providers')
    .update({
      kyc_status:        kycStatus,
      kyc_score:         payload.score,
      kyc_completed_at:  new Date().toISOString(),
      kyc_result:        payload,    // guarda o payload completo para auditoria
    })
    .eq('kyc_report_id', payload.report_id)

  if (error) {
    console.error('[idwall-webhook] Supabase update error:', error)
    // Retorna 200 mesmo assim — Idwall não retenta se receber 2xx
    // Log vai para Sentry via middleware
  }

  return NextResponse.json({ received: true })
}
```

---

## Frontend — Integração do SDK Idwall

### Instalação

```bash
# O Idwall disponibiliza o SDK via npm (verificar pacote atual com eles)
pnpm add @idwall/sdk --filter @ajudaeh/web
```

### Componente `KycStep.tsx`

Criar em: `apps/web/app/provider/onboarding/KycStep.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@ajudaeh/ui'
import { callFunction } from '../../../lib/callFunction'
import { logger } from '../../../lib/logger'

type KycStatus = 'not_started' | 'in_progress' | 'approved' | 'manual_review' | 'rejected'

interface KycStepProps {
  userId:    string
  kycStatus: KycStatus
  onDone:    () => void   // callback quando o SDK fecha (aguardará webhook)
}

export function KycStep({ userId, kycStatus, onDone }: KycStepProps) {
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    setLoading(true)
    try {
      const data = await callFunction('provider_kyc_start', {})
      const { sdk_token } = await data.json()

      // Importação dinâmica do SDK (evita SSR issues)
      const { IdwallSDK } = await import('@idwall/sdk')

      const sdk = new IdwallSDK(sdk_token, {
        onComplete: () => {
          // Idwall mandará o webhook em ~30s
          // Mostramos tela de "aguarde"
          onDone()
        },
        onError: (err: unknown) => {
          logger.error('Idwall SDK error', err instanceof Error ? err : new Error(String(err)))
        },
        // Personalização visual (cores da marca)
        theme: {
          primary_color: '#F5C200',
          background:    '#F5F0E8',
        },
      })
      sdk.open()
    } catch (err) {
      logger.error('Erro ao iniciar KYC', err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }

  // Status já processado — não precisa fazer nada
  if (kycStatus === 'approved' || kycStatus === 'manual_review') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
        <p className="text-sm font-medium text-green-800">
          ✅ Verificação de identidade concluída. Nossa equipe irá revisar e aprovar seu cadastro.
        </p>
      </div>
    )
  }

  if (kycStatus === 'rejected') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-medium text-red-800">
          Não foi possível verificar sua identidade. Entre em contato pelo contato@ajudaeh.com.br.
        </p>
      </div>
    )
  }

  if (kycStatus === 'in_progress') {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Verificação em andamento. Aguarde alguns instantes...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium">Verificação de identidade</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Você precisará de um documento com foto (CNH ou RG) e acesso à câmera.
          O processo leva cerca de 2 minutos.
        </p>
      </div>
      <Button onClick={handleStart} isLoading={loading} className="w-full">
        Iniciar verificação de identidade
      </Button>
    </div>
  )
}
```

### Uso no `ProviderOnboardingForm.tsx`

Adicionar `KycStep` como etapa antes do formulário principal:

```tsx
// Etapa 0: KYC (nova, antes de qualquer outro campo)
// Etapa 1: Dados pessoais (nome, telefone)
// Etapa 2: Veículo, CEP, categorias, bio, foto

// No fluxo de etapas:
if (step === 0) {
  return (
    <KycStep
      userId={userId}
      kycStatus={kycStatus}        // buscado do provider row
      onDone={() => setStep(1)}    // avança após SDK fechar
    />
  )
}
```

---

## Painel Admin — Exibir Resultado do Idwall

No componente `PendingProviderActions.tsx` (ou em um componente pai na listagem), exibir:

```tsx
// Tipo do resultado do Idwall (kyc_result JSONB)
interface IdwallResult {
  status: 'APPROVED' | 'REJECTED'
  score:  number
  checks: {
    document:     { status: string; type?: string }
    facial_match: { status: string; similarity?: number }
    liveness:     { status: string }
    background:   { status: string; records?: unknown[] }
    cpf_receita:  { status: string; situation?: string }
  }
}

function KycBadge({ status, score }: { status: string; score: number }) {
  const color =
    status === 'approved'       ? 'green'
    : status === 'manual_review'? 'yellow'
    : status === 'rejected'     ? 'red'
    :                             'gray'

  return (
    <div className={`rounded border border-${color}-200 bg-${color}-50 p-3`}>
      <p className="text-xs font-bold uppercase tracking-wide">KYC Idwall</p>
      <p className="mt-1 text-sm">
        Status: <strong>{status}</strong>
        {score > 0 && <span> — Score: {score}/100</span>}
      </p>
    </div>
  )
}

// Na listagem do admin, ao lado do botão Aprovar/Rejeitar:
<KycBadge status={provider.kyc_status} score={provider.kyc_score} />
{provider.kyc_result && (
  <div className="mt-2 text-xs text-muted-foreground space-y-1">
    <p>{result.checks.document.status === 'APPROVED' ? '✅' : '❌'} Documento ({result.checks.document.type})</p>
    <p>{result.checks.facial_match.status === 'APPROVED' ? '✅' : '❌'} Selfie — {result.checks.facial_match.similarity}% de similaridade</p>
    <p>{result.checks.liveness.status === 'APPROVED' ? '✅' : '❌'} Liveness</p>
    <p>{result.checks.background.status === 'APPROVED' ? '✅' : '❌'} Antecedentes</p>
    <p>{result.checks.cpf_receita.status === 'APPROVED' ? '✅' : '❌'} CPF na Receita</p>
  </div>
)}
```

---

## Variáveis de Ambiente

### Vercel (Next.js — webhook handler)

| Variável | Descrição | Obter em |
|---|---|---|
| `IDWALL_WEBHOOK_SECRET` | Segredo HMAC para verificar autenticidade dos webhooks | Dashboard Idwall → Webhooks |

### Supabase Edge Functions

| Variável | Descrição | Obter em |
|---|---|---|
| `IDWALL_API_KEY` | Chave da API REST do Idwall | Dashboard Idwall → API Keys |
| `IDWALL_WORKFLOW_ID` | ID do fluxo configurado (doc + selfie + background) | Dashboard Idwall → Workflows |

### Configurar no Supabase

```bash
supabase secrets set IDWALL_API_KEY=sua_chave_aqui
supabase secrets set IDWALL_WORKFLOW_ID=seu_workflow_id_aqui
```

### Configurar no Vercel

Via dashboard (Settings → Environment Variables) ou CLI:
```bash
vercel env add IDWALL_WEBHOOK_SECRET
```

### URL do webhook a registrar no Idwall

```
https://ajudaeh.com.br/api/idwall/webhook
```

---

## Configuração do Workflow no Dashboard Idwall

Ao criar o workflow na plataforma Idwall, incluir os seguintes checks (nesta ordem):

| Check | Por quê |
|---|---|
| **Captura de documento** (CNH ou RG) | OCR automático extrai nome, CPF, data de nascimento, validade |
| **Selfie com liveness** | Confirma que é uma pessoa real, não foto impressa |
| **Facial match** | Compara selfie com foto do documento |
| **Background check** | Antecedentes criminais federais e estaduais |
| **Consulta CPF na Receita Federal** | Confirma situação: Regular / Suspensa / Cancelada |

**Threshold de aprovação automática recomendado:** score ≥ 70

---

## LGPD — Requisitos Legais

Antes de ativar o KYC, garantir que:

1. **Consentimento explícito** no formulário de cadastro:
   > *"Ao se cadastrar como prestador, você autoriza o Ajudaê a realizar verificação de identidade e consulta de antecedentes conforme nossa Política de Privacidade."*

2. **Finalidade limitada:** os dados coletados pelo Idwall são usados exclusivamente para verificação de identidade dos prestadores.

3. **Retenção:** o `kyc_result` (JSONB com payload completo) é mantido por auditoria. Definir política de retenção (sugestão: 5 anos após encerramento do contrato com o prestador).

4. **Direito de exclusão:** se o prestador solicitar exclusão de dados, o `kyc_result` deve ser anonimizado (substituir por `null` ou `{ "removed": true }`).

---

## Checklist de Implementação

### Fase 1 — Manual

- [ ] Adicionar campo de upload de documento (CNH/RG) no `ProviderOnboardingForm.tsx`
- [ ] Adicionar campo de upload de selfie no `ProviderOnboardingForm.tsx`
- [ ] Exibir as imagens no painel `/admin/providers` para verificação manual
- [ ] Testar upload para o bucket `provider-docs` com RLS

### Fase 2 — Idwall

**Pré-requisitos:**
- [ ] Criar conta no Idwall e contratar o plano adequado
- [ ] Configurar workflow no dashboard Idwall (doc + selfie + background + CPF)
- [ ] Registrar URL do webhook: `https://ajudaeh.com.br/api/idwall/webhook`
- [ ] Obter `IDWALL_API_KEY`, `IDWALL_WORKFLOW_ID`, `IDWALL_WEBHOOK_SECRET`

**Backend:**
- [ ] Criar `supabase/migrations/020_providers_kyc.sql` e aplicar no banco
- [ ] Criar `supabase/functions/provider_kyc_start/index.ts`
- [ ] Deploy: `supabase functions deploy provider_kyc_start`
- [ ] Configurar secrets: `supabase secrets set IDWALL_API_KEY=... IDWALL_WORKFLOW_ID=...`
- [ ] Criar `apps/web/app/api/idwall/webhook/route.ts`
- [ ] Adicionar `IDWALL_WEBHOOK_SECRET` nas variáveis da Vercel

**Frontend:**
- [ ] Instalar SDK: `pnpm add @idwall/sdk --filter @ajudaeh/web`
- [ ] Criar `apps/web/app/provider/onboarding/KycStep.tsx`
- [ ] Integrar `KycStep` como primeira etapa do `ProviderOnboardingForm`
- [ ] Atualizar a query do `provider/onboarding/page.tsx` para incluir `kyc_status`
- [ ] Adicionar Realtime subscription em `kyc_status` para atualizar a UI sem reload

**Admin:**
- [ ] Atualizar query em `/admin/providers` para incluir `kyc_status`, `kyc_score`, `kyc_result`
- [ ] Exibir badge de KYC com checks detalhados ao lado dos botões Aprovar/Rejeitar

**Testes:**
- [ ] Testar fluxo completo em ambiente de staging com CPF de teste do Idwall
- [ ] Simular webhook com assinatura HMAC inválida (deve retornar 401)
- [ ] Simular webhook com score < 70 (deve setar `manual_review`)
- [ ] Testar que admin ainda consegue aprovar/rejeitar após KYC automático

---

## Referências

| Recurso | Descrição |
|---|---|
| `arquitetura/Comissionados/Documentos Técnicos/DB_SCHEMA.md` | Schema completo do banco |
| `arquitetura/Comissionados/Documentos Técnicos/EDGE_FUNCTIONS.md` | Padrão de Edge Functions |
| `arquitetura/Comissionados/Documentos Técnicos/EMAIL_TEMPLATES.md` | Templates de e-mail (T4/T5/T6) |
| `apps/web/app/admin/providers/PendingProviderActions.tsx` | Botões de aprovação do admin |
| `apps/web/app/provider/onboarding/ProviderOnboardingForm.tsx` | Formulário de onboarding |
| `supabase/functions/admin_verify_provider/` | Edge Function de aprovação do admin |

---

*Ajudaê — KYC_IDWALL.md v1.0*
*Atualizar quando: plano Idwall for contratado, workflow for configurado, ou qualquer etapa do checklist for concluída.*
