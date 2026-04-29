import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'

// ─── CORS headers ──────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? 'https://ajudaeh.com.br',
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Cliente Supabase com service_role (bypass RLS intencional) ────────────
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ─── Schema de validação do input ─────────────────────────────────────────
const TicketOpenSchema = z.object({
  request_id: z.string().uuid('request_id deve ser um UUID válido'),
  reason: z.string().min(10, 'Descreva o problema com pelo menos 10 caracteres').max(1000),
  media_urls: z.array(z.string().url()).max(5).optional(),
})

// ─── Status que impedem abertura de ticket ────────────────────────────────
const BLOCKED_STATUSES = ['completed', 'disputed', 'cancelled', 'expired']

// ─── Helpers de resposta ──────────────────────────────────────────────────
function ok(data: unknown, status = 201): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function error(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// ─── Registra evento de auditoria ─────────────────────────────────────────
async function logEvent(
  requestId: string,
  actorId: string,
  fromStatus: string,
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

// ─── Handler principal ────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return error(405, 'Método não permitido')
  }

  // 1. Autenticar usuário via JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return error(401, 'Não autenticado')
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (authError || !user) {
    return error(401, 'Token inválido')
  }

  // 2. Buscar role via profiles (fonte de verdade, não JWT)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(401, 'Perfil não encontrado')

  // Admin não abre ticket — ele resolve
  if (profile.role === 'admin') {
    return error(403, 'Administradores não podem abrir tickets')
  }

  // 3. Validar body com Zod
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(400, 'Body inválido — esperado JSON')
  }

  const parsed = TicketOpenSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message).join(', ')
    return error(400, messages)
  }

  const { request_id, reason, media_urls } = parsed.data

  // 4. Buscar pedido e verificar pertencimento
  const { data: request } = await supabase
    .from('requests')
    .select('id, status, client_id, provider_id')
    .eq('id', request_id)
    .maybeSingle()

  if (!request) return error(404, 'Pedido não encontrado')

  // Verificar que o usuário é parte do pedido (cliente ou prestador)
  const isClient = request.client_id === user.id
  const isProvider = request.provider_id === user.id

  if (!isClient && !isProvider) {
    return error(403, 'Você não está neste pedido')
  }

  // 5. Verificar se o status permite abertura de ticket
  if (BLOCKED_STATUSES.includes(request.status)) {
    if (request.status === 'completed') return error(400, 'Pedido já concluído')
    if (request.status === 'disputed') return error(409, 'Já existe um ticket aberto para este pedido')
    return error(400, `Pedido com status '${request.status}' não pode gerar ticket`)
  }

  // 6. Verificar se já existe ticket aberto (duplicata)
  const { count: existingTickets } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', request_id)
    .in('status', ['open', 'in_review'])

  if ((existingTickets ?? 0) > 0) {
    return error(409, 'Já existe um ticket aberto para este pedido')
  }

  const previousStatus = request.status

  // 7. Criar ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      request_id,
      opened_by: user.id,
      reason,
      media_urls: media_urls ?? [],
      status: 'open',
    })
    .select('id, request_id, status, created_at')
    .single()

  if (ticketError || !ticket) {
    return error(500, 'Erro ao criar ticket')
  }

  // 8. Atualizar pedido para 'disputed'
  const { error: updateError } = await supabase
    .from('requests')
    .update({ status: 'disputed' })
    .eq('id', request_id)

  if (updateError) {
    return error(500, 'Erro ao atualizar status do pedido')
  }

  // 9. Registrar evento de auditoria
  await logEvent(request_id, user.id, previousStatus, 'disputed', {
    ticket_id: ticket.id,
    ticket_reason: reason,
    opened_by_role: profile.role,
  })

  // 10. Retornar ticket criado
  //     [Fase 1+] Aqui entrará notificação push para o admin
  return ok({
    ticket_id: ticket.id,
    request_id: ticket.request_id,
    status: ticket.status,
    created_at: ticket.created_at,
  })
})
