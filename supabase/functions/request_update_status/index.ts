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

// ─── Tabela de transições permitidas por role ─────────────────────────────
//
//    Esta é a fonte de verdade da máquina de estados.
//    Toda transição que não estiver aqui é rejeitada com 409.
//
//    Regra especial: → completed nunca passa por aqui.
//    Use request_complete_with_otp (exige OTP do cliente).
//
type RequestStatus =
  | 'requested'
  | 'accepted'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'disputed'

type AllowedTransition = {
  from: RequestStatus
  to: RequestStatus
}

const PROVIDER_TRANSITIONS: AllowedTransition[] = [
  { from: 'accepted', to: 'en_route' },
  { from: 'en_route', to: 'in_progress' },
  { from: 'requested', to: 'cancelled' },
  { from: 'accepted', to: 'cancelled' },
]

const CLIENT_TRANSITIONS: AllowedTransition[] = [
  { from: 'requested', to: 'cancelled' },
]

// Admin pode qualquer transição, exceto → completed (sem OTP)
const BLOCKED_FOR_ADMIN: RequestStatus[] = ['completed']

function isTransitionAllowed(
  role: string,
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  if (role === 'admin') {
    return !BLOCKED_FOR_ADMIN.includes(to)
  }
  const transitions = role === 'provider' ? PROVIDER_TRANSITIONS : CLIENT_TRANSITIONS
  return transitions.some((t) => t.from === from && t.to === to)
}

// ─── Schema de validação do input ─────────────────────────────────────────
const UpdateStatusSchema = z.object({
  request_id: z.string().uuid('request_id deve ser um UUID válido'),
  new_status: z.enum(['en_route', 'in_progress', 'cancelled', 'disputed'], {
    errorMap: () => ({
      message: 'new_status deve ser: en_route, in_progress, cancelled ou disputed',
    }),
  }),
  cancel_reason: z
    .enum([
      'client_gave_up',
      'provider_unavailable',
      'wrong_address',
      'price_disagreement',
      'no_show',
      'other',
    ])
    .optional(),
  cancel_note: z.string().max(500).optional(),
})

// ─── Helpers de resposta ──────────────────────────────────────────────────
function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
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

  // 2. Buscar role do usuário em profiles (fonte de verdade, não JWT claim)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(401, 'Perfil não encontrado')

  const role = profile.role as string

  // 3. Validar body com Zod
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(400, 'Body inválido — esperado JSON')
  }

  const parsed = UpdateStatusSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message).join(', ')
    return error(400, messages)
  }

  const { request_id, new_status, cancel_reason, cancel_note } = parsed.data

  // 4. Validar cancel_reason obrigatório quando cancelando
  if (new_status === 'cancelled' && !cancel_reason) {
    return error(400, 'Motivo de cancelamento obrigatório')
  }

  // 5. Buscar o pedido atual
  const { data: request } = await supabase
    .from('requests')
    .select('id, status, provider_id, client_id')
    .eq('id', request_id)
    .maybeSingle()

  if (!request) return error(404, 'Pedido não encontrado')

  const currentStatus = request.status as RequestStatus

  // 6. Verificar permissão de acesso ao pedido por role
  if (role === 'provider' && request.provider_id !== user.id) {
    return error(403, 'Você não é o prestador deste pedido')
  }
  if (role === 'client' && request.client_id !== user.id) {
    return error(403, 'Você não é o cliente deste pedido')
  }

  // 7. Validar se a transição é permitida para este role
  if (!isTransitionAllowed(role, currentStatus, new_status as RequestStatus)) {
    return error(409, `Transição não permitida: ${currentStatus} → ${new_status}`)
  }

  // 8. Montar payload do UPDATE
  const updatePayload: Record<string, unknown> = {
    status: new_status,
  }

  if (new_status === 'cancelled') {
    updatePayload.cancel_reason = cancel_reason
    updatePayload.cancelled_by = user.id
  }

  // 9. Atualizar o pedido
  const { error: updateError } = await supabase
    .from('requests')
    .update(updatePayload)
    .eq('id', request_id)
    .eq('status', currentStatus) // guarda otimista: evita sobrescrever mudança concorrente

  if (updateError) {
    return error(500, 'Erro ao atualizar pedido')
  }

  // 10. Registrar evento de auditoria
  await logEvent(request_id, user.id, currentStatus, new_status, {
    ...(cancel_reason ? { cancel_reason } : {}),
    ...(cancel_note ? { cancel_note } : {}),
  })

  // 11. Retornar resultado
  return ok({
    request_id,
    previous_status: currentStatus,
    new_status,
    updated_at: new Date().toISOString(),
  })
})
