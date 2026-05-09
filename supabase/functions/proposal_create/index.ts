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

const ProposalCreateSchema = z.object({
  provider_id: z.string().uuid('provider_id deve ser um UUID válido'),
  category_name: z.string().min(1, 'Categoria obrigatória'),
  address_origin: z.string().min(10, 'Endereço de origem deve ter ao menos 10 caracteres'),
  address_dest: z.string().optional(),
  origin_lat: z.number().optional(),
  origin_lng: z.number().optional(),
  dest_lat: z.number().optional(),
  dest_lng: z.number().optional(),
  description: z.string().max(800).optional(),
  media_urls: z.array(z.string().url()).max(5).optional().default([]),
  needs_helper: z.boolean().optional().default(false),
  price_proposed: z.number().positive().optional(),
  scheduled_for: z.string().datetime().optional(),
})

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
  if (profile.role !== 'client') return error(req, 403, 'Apenas clientes podem enviar propostas')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(req, 400, 'Body inválido')
  }

  const parsed = ProposalCreateSchema.safeParse(body)
  if (!parsed.success) return error(req, 400, parsed.error.errors.map((entry) => entry.message).join(', '))

  const input = parsed.data
  const scheduledFor = input.scheduled_for ? new Date(input.scheduled_for) : null
  if (scheduledFor && scheduledFor <= new Date(Date.now() + 10 * 60 * 1000)) {
    return error(req, 400, 'Agendamento deve ser ao menos 10 minutos no futuro')
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('id, active, verified')
    .eq('id', input.provider_id)
    .maybeSingle()

  if (!provider) return error(req, 404, 'Prestador não encontrado')
  if (!provider.verified) return error(req, 403, 'Prestador ainda não está verificado')

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', input.category_name)
    .maybeSingle()

  if (!category?.id) return error(req, 400, 'Categoria não encontrada')

  const { count: providerActiveCount } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', input.provider_id)
    .in('status', ['accepted', 'en_route', 'in_progress'])
    .is('scheduled_for', null)

  const { count: clientOpenCount } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .in('status', ['requested', 'accepted', 'en_route', 'in_progress'])
    .is('scheduled_for', null)

  const { count: clientPendingProposalCount } = await supabase
    .from('service_proposals')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .eq('status', 'pending')
    .is('scheduled_for', null)

  const requiresSchedule =
    !provider.active ||
    (providerActiveCount ?? 0) > 0 ||
    (clientOpenCount ?? 0) > 0 ||
    (clientPendingProposalCount ?? 0) > 0

  if (requiresSchedule && !scheduledFor) {
    return error(req, 409, 'Escolha uma data e horário para enviar esta proposta')
  }

  const { data: proposal, error: insertError } = await supabase
    .from('service_proposals')
    .insert({
      client_id: user.id,
      provider_id: input.provider_id,
      category_id: category.id,
      address_origin: input.address_origin,
      address_dest: input.address_dest ?? null,
      origin_lat: input.origin_lat ?? null,
      origin_lng: input.origin_lng ?? null,
      dest_lat: input.dest_lat ?? null,
      dest_lng: input.dest_lng ?? null,
      description: input.description ?? null,
      media_urls: input.media_urls,
      needs_helper: input.needs_helper,
      price_proposed: input.price_proposed ?? null,
      scheduled_for: scheduledFor?.toISOString() ?? null,
    })
    .select('id, status, scheduled_for, expires_at')
    .single()

  if (insertError || !proposal) return error(req, 500, 'Erro ao criar proposta')

  const push = await sendExpoPush(
    input.provider_id,
    'Nova proposta recebida',
    scheduledFor ? 'Você recebeu uma proposta agendada.' : 'Você recebeu uma proposta para agora.',
    { screen: 'proposals', proposal_id: proposal.id },
  )

  return ok(req, {
    id: proposal.id,
    status: proposal.status,
    scheduled_for: proposal.scheduled_for,
    expires_at: proposal.expires_at,
    push,
  }, 201)
})
