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
const RequestAcceptSchema = z.object({
  request_id: z.string().uuid('request_id deve ser um UUID válido'),
})

// ─── Helpers de resposta ──────────────────────────────────────────────────
function ok(data: unknown, status = 200): Response {
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

  // 2. Verificar role = 'provider' via profiles (fonte de verdade, não JWT claim)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(401, 'Perfil não encontrado')
  if (profile.role !== 'provider') return error(403, 'Apenas prestadores podem aceitar pedidos')

  // 3. Verificar se prestador está verificado e ativo
  const { data: provider } = await supabase
    .from('providers')
    .select('id, verified, active')
    .eq('id', user.id)
    .single()

  if (!provider) return error(403, 'Perfil de prestador não encontrado')
  if (!provider.verified || !provider.active) {
    return error(403, 'Apenas prestadores verificados e ativos podem aceitar pedidos')
  }

  // 4. Validar body com Zod
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(400, 'Body inválido — esperado JSON')
  }

  const parsed = RequestAcceptSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message).join(', ')
    return error(400, messages)
  }

  const { request_id } = parsed.data

  // 5. Verificar se prestador já tem pedido ativo (máximo 1 por vez no MVP)
  const { count: activeCount } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', user.id)
    .in('status', ['accepted', 'en_route', 'in_progress'])

  if ((activeCount ?? 0) > 0) {
    return error(409, 'Você já tem um serviço ativo')
  }

  // 6. Aceitar atomicamente — proteção contra race condition
  //
  //    O UPDATE só afeta a linha se:
  //      - status ainda for 'requested' (ninguém aceitou antes)
  //      - expires_at ainda estiver no futuro (não expirou)
  //
  //    Se retornar null (0 linhas afetadas), buscamos o pedido para
  //    devolver a mensagem de erro correta ao prestador.
  const now = new Date().toISOString()

  const { data: updated } = await supabase
    .from('requests')
    .update({ provider_id: user.id, status: 'accepted' })
    .eq('id', request_id)
    .eq('status', 'requested')
    .gt('expires_at', now)
    .select('id, status, client_id, address_origin, address_dest')
    .maybeSingle()

  if (!updated) {
    // Re-fetch para diagnóstico preciso do motivo
    const { data: existing } = await supabase
      .from('requests')
      .select('id, status, expires_at')
      .eq('id', request_id)
      .maybeSingle()

    if (!existing) return error(404, 'Pedido não encontrado')
    if (new Date(existing.expires_at) <= new Date()) return error(410, 'Pedido expirado')
    if (existing.status !== 'requested') return error(409, 'Pedido já foi aceito')
    return error(500, 'Erro ao aceitar pedido')
  }

  // 7. Buscar nome do cliente para exibir ao prestador
  const { data: client } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', updated.client_id)
    .single()

  // 8. Registrar evento de auditoria
  await logEvent(request_id, user.id, 'requested', 'accepted', {
    provider_id: user.id,
  })

  // 9. Retornar dados do pedido ao prestador
  return ok({
    request_id: updated.id,
    status: updated.status,
    client_name: client?.name ?? 'Cliente',
    address_origin: updated.address_origin,
    address_dest: updated.address_dest ?? null,
  })
})
