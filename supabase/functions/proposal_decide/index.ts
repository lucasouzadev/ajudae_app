import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'

const allowedOrigins = new Set(
  [
    Deno.env.get('APP_URL'),
    Deno.env.get('CRM_APP_URL'),
    'https://ajudaeh.com.br',
    'https://ajudae-app.pages.dev',
    'http://localhost:5173',
    'http://localhost:8081',
  ].filter(Boolean),
)

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://ajudaeh.com.br',
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const ProposalDecideSchema = z.object({
  proposal_id: z.string().uuid('proposal_id deve ser um UUID válido'),
  decision: z.enum(['accept', 'reject']),
  scheduled_for: z.string().datetime().optional(),
  decision_note: z.string().max(500).optional(),
})

type ProposalRow = {
  id: string
  client_id: string
  provider_id: string
  category_id: string
  status: string
  address_origin: string
  address_dest: string | null
  origin_lat: number | null
  origin_lng: number | null
  dest_lat: number | null
  dest_lng: number | null
  description: string | null
  media_urls: string[]
  needs_helper: boolean
  price_proposed: number | null
  scheduled_for: string | null
  expires_at: string
}

function ok(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

function error(req: Request, status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

function generateOtp(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(array[0] % 1_000_000).padStart(6, '0')
}

async function hashOtpViaPgcrypto(otpPlain: string): Promise<string | null> {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/hash_otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ otp_plain: otpPlain }),
  })

  if (!response.ok) return null
  return response.json()
}

async function logEvent(
  requestId: string,
  actorId: string,
  fromStatus: string | null,
  toStatus: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await supabase.from('request_events').insert({
    request_id: requestId,
    actor_id: actorId,
    from_status: fromStatus,
    to_status: toStatus,
    meta,
  })
}

async function sendExpoPush(userId: string, title: string, body: string, data: Record<string, unknown> = {}) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .maybeSingle()

  const token = profile?.expo_push_token?.trim()
  if (!token || token === 'local-only') return { sent: false, skipped: true }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
  })

  return { sent: response.ok, skipped: false }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return error(req, 405, 'Método não permitido')

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return error(req, 401, 'Não autenticado')

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (authError || !user) return error(req, 401, 'Token inválido')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(req, 401, 'Perfil não encontrado')
  if (profile.role !== 'provider') return error(req, 403, 'Apenas prestadores podem decidir propostas')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(req, 400, 'Body inválido')
  }

  const parsed = ProposalDecideSchema.safeParse(body)
  if (!parsed.success) return error(req, 400, parsed.error.errors.map((entry) => entry.message).join(', '))

  const input = parsed.data

  const { data: proposal } = await supabase
    .from('service_proposals')
    .select('*')
    .eq('id', input.proposal_id)
    .maybeSingle()

  if (!proposal) return error(req, 404, 'Proposta não encontrada')
  if (proposal.provider_id !== user.id) return error(req, 403, 'Esta proposta não pertence ao prestador autenticado')
  if (proposal.status !== 'pending') return error(req, 409, 'Proposta já foi decidida')
  if (new Date(proposal.expires_at) <= new Date()) return error(req, 410, 'Proposta expirada')

  if (input.decision === 'reject') {
    await supabase
      .from('service_proposals')
      .update({
        status: 'rejected',
        decision_note: input.decision_note ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq('id', input.proposal_id)
      .eq('status', 'pending')

    const push = await sendExpoPush(
      proposal.client_id,
      'Proposta recusada',
      'O prestador recusou sua proposta.',
      { screen: 'proposals', proposal_id: input.proposal_id },
    )

    return ok(req, { proposal_id: input.proposal_id, status: 'rejected', push })
  }

  const finalSchedule = input.scheduled_for ?? proposal.scheduled_for
  const scheduledAt = finalSchedule ? new Date(finalSchedule) : null
  if (scheduledAt && scheduledAt <= new Date(Date.now() + 10 * 60 * 1000)) {
    return error(req, 400, 'Agendamento deve ser ao menos 10 minutos no futuro')
  }

  if (!scheduledAt) {
    const { count: activeCount } = await supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', user.id)
      .in('status', ['accepted', 'en_route', 'in_progress'])
      .is('scheduled_for', null)

    if ((activeCount ?? 0) > 0) {
      return error(req, 409, 'Você já tem um serviço imediato ativo. Agende esta proposta para outro horário.')
    }
  }

  const otpPlain = generateOtp()
  const otpHash = await hashOtpViaPgcrypto(otpPlain)
  if (!otpHash) return error(req, 500, 'Erro ao processar OTP')

  const requestExpiresAt = scheduledAt
    ? new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 30 * 60 * 1000)
  const otpExpiresAt = scheduledAt
    ? new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 60 * 60 * 1000)

  const p = proposal as ProposalRow
  const { data: request, error: insertError } = await supabase
    .from('requests')
    .insert({
      client_id: p.client_id,
      provider_id: p.provider_id,
      category_id: p.category_id,
      status: 'accepted',
      address_origin: p.address_origin,
      address_dest: p.address_dest,
      origin_lat: p.origin_lat,
      origin_lng: p.origin_lng,
      dest_lat: p.dest_lat,
      dest_lng: p.dest_lng,
      description: p.description,
      media_urls: p.media_urls,
      needs_helper: p.needs_helper,
      scheduled_for: scheduledAt?.toISOString() ?? null,
      price_estimated: p.price_proposed,
      price_final: p.price_proposed,
      otp_code_hash: otpHash,
      otp_expires_at: otpExpiresAt.toISOString(),
      expires_at: requestExpiresAt.toISOString(),
    })
    .select('id, status, scheduled_for')
    .single()

  if (insertError || !request) return error(req, 500, 'Erro ao criar serviço')

  await supabase
    .from('service_proposals')
    .update({
      status: 'accepted',
      scheduled_for: scheduledAt?.toISOString() ?? null,
      decision_note: input.decision_note ?? null,
      decided_at: new Date().toISOString(),
      accepted_request_id: request.id,
    })
    .eq('id', input.proposal_id)
    .eq('status', 'pending')

  await logEvent(request.id, user.id, null, 'accepted', {
    proposal_id: input.proposal_id,
    scheduled_for: scheduledAt?.toISOString() ?? null,
  })

  const push = await sendExpoPush(
    p.client_id,
    scheduledAt ? 'Serviço agendado' : 'Proposta aceita',
    scheduledAt ? 'O prestador aceitou e agendou seu serviço.' : 'O prestador aceitou sua proposta.',
    { screen: 'chat', request_id: request.id, proposal_id: input.proposal_id },
  )

  return ok(req, {
    proposal_id: input.proposal_id,
    request_id: request.id,
    status: 'accepted',
    request_status: request.status,
    scheduled_for: request.scheduled_for,
    otp_code: otpPlain,
    push,
  })
})
