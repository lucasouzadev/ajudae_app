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

const COMMISSION_RATE = Number(Deno.env.get('COMMISSION_RATE') ?? 0.15)
const MAX_OTP_ATTEMPTS = Number(Deno.env.get('MAX_OTP_ATTEMPTS') ?? 5)

// ─── Schema de validação do input ─────────────────────────────────────────
const CompleteWithOtpSchema = z.object({
  request_id: z.string().uuid('request_id deve ser um UUID válido'),
  otp_code: z
    .string()
    .length(6, 'OTP deve ter exatamente 6 dígitos')
    .regex(/^\d{6}$/, 'OTP deve conter apenas números'),
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
//
//    NOTA DE SEGURANÇA: otp_code nunca entra em nenhum campo de meta.
//    Somente informações não-sensíveis (tentativas, resultado) são logadas.
//
async function logEvent(
  requestId: string,
  actorId: string | null,
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

// ─── Verificar OTP via pgcrypto (crypt no banco) ──────────────────────────
//
//    A verificação usa a mesma função hash_otp() da migration 013.
//    crypt(input, stored_hash) reproduz o hash com o mesmo salt — se
//    o resultado for igual ao hash armazenado, o OTP é válido.
//
async function verifyOtp(otpInput: string, storedHash: string): Promise<boolean> {
  const { data, error: rpcError } = await supabase.rpc('verify_otp', {
    otp_plain: otpInput,
    otp_hash: storedHash,
  })
  if (rpcError || data === null) return false
  return data as boolean
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

  // 2. Verificar role = 'provider' via profiles (fonte de verdade, não JWT)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(401, 'Perfil não encontrado')
  if (profile.role !== 'provider') {
    return error(403, 'Apenas prestadores podem confirmar conclusão de pedido')
  }

  // 3. Validar body com Zod
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(400, 'Body inválido — esperado JSON')
  }

  const parsed = CompleteWithOtpSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message).join(', ')
    return error(400, messages)
  }

  const { request_id, otp_code } = parsed.data

  // 4. Buscar pedido com dados do OTP
  const { data: request } = await supabase
    .from('requests')
    .select('id, status, provider_id, client_id, otp_code_hash, otp_expires_at, price_final, price_estimated')
    .eq('id', request_id)
    .maybeSingle()

  if (!request) return error(404, 'Pedido não encontrado')

  // 5. Verificar que este prestador é o dono do pedido
  if (request.provider_id !== user.id) {
    return error(403, 'Você não é o prestador deste pedido')
  }

  // 6. Verificar status = 'in_progress'
  if (request.status !== 'in_progress') {
    return error(409, 'Pedido não está em execução')
  }

  // 7. Verificar expiração do OTP
  if (new Date(request.otp_expires_at) <= new Date()) {
    return error(400, 'OTP expirado')
  }

  // 8. Contar tentativas anteriores usando request_events
  //
  //    Estratégia: cada tentativa inválida gera um evento com to_status='otp_failed'.
  //    Contamos esses eventos para aplicar o limite de MAX_OTP_ATTEMPTS.
  //    Isso não requer coluna otp_attempts no schema atual.
  //
  const { count: failedAttempts } = await supabase
    .from('request_events')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', request_id)
    .eq('to_status', 'otp_failed')

  if ((failedAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    // Pedido já deve estar em disputed (foi movido na última tentativa)
    return error(429, 'Muitas tentativas — pedido em disputa')
  }

  // 9. Verificar OTP via pgcrypto
  const isValid = await verifyOtp(otp_code, request.otp_code_hash)

  if (!isValid) {
    const attempts = (failedAttempts ?? 0) + 1

    // Registrar tentativa inválida (sem logar o OTP)
    await logEvent(request_id, user.id, 'in_progress', 'otp_failed', {
      attempt: attempts,
    })

    // Se atingiu o limite: mover para disputed automaticamente
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await supabase
        .from('requests')
        .update({ status: 'disputed' })
        .eq('id', request_id)

      await logEvent(request_id, null, 'in_progress', 'disputed', {
        reason: 'max_otp_attempts_exceeded',
        total_attempts: attempts,
      })

      return error(429, 'Muitas tentativas — pedido em disputa')
    }

    const remaining = MAX_OTP_ATTEMPTS - attempts
    return error(400, `OTP inválido — ${remaining} tentativa(s) restante(s)`)
  }

  // 10. OTP válido — calcular financeiro
  //
  //     Usa price_final se já definido (negociado durante o serviço),
  //     caso contrário cai no price_estimated do pedido original.
  //     platform_fee = valor * COMMISSION_RATE (15% no MVP).
  //
  const priceFinal = request.price_final ?? request.price_estimated ?? 0
  const platformFee = Math.round(priceFinal * COMMISSION_RATE * 100) / 100
  const providerAmount = Math.round((priceFinal - platformFee) * 100) / 100
  const completedAt = new Date().toISOString()

  // 11. Atualizar pedido para completed
  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: 'completed',
      price_final: priceFinal,
      platform_fee: platformFee,
    })
    .eq('id', request_id)
    .eq('status', 'in_progress') // guarda: evita concorrência

  if (updateError) {
    return error(500, 'Erro ao concluir pedido')
  }

  // 12. Registrar evento de conclusão com dados financeiros
  await logEvent(request_id, user.id, 'in_progress', 'completed', {
    price_final: priceFinal,
    platform_fee: platformFee,
    provider_amount: providerAmount,
  })

  const push = await sendExpoPush(
    request.client_id,
    'Serviço concluído',
    'Seu serviço foi concluído. Avalie o prestador.',
    { screen: 'rate', request_id },
  )

  return ok({
    request_id,
    status: 'completed',
    price_final: priceFinal,
    platform_fee: platformFee,
    provider_amount: providerAmount,
    completed_at: completedAt,
    push,
  })
})
