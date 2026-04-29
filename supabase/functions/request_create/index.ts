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

// ─── Configurações de negócio ─────────────────────────────────────────────
const OTP_EXPIRY_MINUTES = Number(Deno.env.get('OTP_EXPIRY_MINUTES') ?? 60)
const REQUEST_EXPIRY_MINUTES = Number(Deno.env.get('REQUEST_EXPIRY_MINUTES') ?? 30)
const MAX_CONCURRENT_REQUESTS = Number(Deno.env.get('MAX_CONCURRENT_REQUESTS') ?? 3)

// ─── Schema de validação do input ─────────────────────────────────────────
const VALID_CATEGORIES = ['Mudança', 'Frete', 'Entrega'] as const

const RequestCreateSchema = z.object({
  category_name: z.string().min(1, 'Categoria obrigatória').optional().default('Frete'),
  address_origin: z.string().min(10, 'Endereço de origem deve ter ao menos 10 caracteres'),
  address_dest: z.string().optional(),
  origin_lat: z.number().optional(),
  origin_lng: z.number().optional(),
  dest_lat: z.number().optional(),
  dest_lng: z.number().optional(),
  description: z.string().max(500).optional(),
  media_urls: z.array(z.string().url()).max(5).optional().default([]),
  needs_helper: z.boolean().optional().default(false),
  scheduled_for: z
    .string()
    .datetime()
    .optional()
    .refine(
      (val) => !val || new Date(val) > new Date(Date.now() + 10 * 60 * 1000),
      'scheduled_for deve ser ao menos 10 minutos no futuro',
    ),
  price_estimated: z.number().positive().optional(),
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

// ─── Gera OTP de 6 dígitos criptograficamente seguro ─────────────────────
function generateOtp(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(array[0] % 1_000_000).padStart(6, '0')
}

// ─── Hash do OTP via pgcrypto no banco (RPC) ──────────────────────────────
async function hashOtpViaPgcrypto(otpPlain: string): Promise<string | null> {
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/hash_otp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ otp_plain: otpPlain }),
    },
  )

  if (!response.ok) return null
  return response.json()
}

// ─── Registra evento de auditoria ─────────────────────────────────────────
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

  // 2. Verificar role = 'client' via profiles (fonte de verdade, não JWT claim)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(401, 'Perfil não encontrado')
  if (profile.role !== 'client') return error(403, 'Apenas clientes podem criar pedidos')

  // 3. Validar body com Zod
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(400, 'Body inválido — esperado JSON')
  }

  const parsed = RequestCreateSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message).join(', ')
    return error(400, messages)
  }

  const input = parsed.data

  // 4. Resolver category_id pelo nome (sem exigir UUID do cliente)
  let resolvedCategoryId: string | null = null
  if (input.category_name) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', input.category_name)
      .single()
    resolvedCategoryId = cat?.id ?? null
  }

  // 5. Verificar limite de pedidos simultâneos do cliente
  const { count } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .in('status', ['requested', 'accepted'])

  if ((count ?? 0) >= MAX_CONCURRENT_REQUESTS) {
    return error(429, `Limite de ${MAX_CONCURRENT_REQUESTS} pedidos simultâneos atingido`)
  }

  // 6. Gerar OTP e calcular expiração
  const otpPlain = generateOtp()
  const otpHash = await hashOtpViaPgcrypto(otpPlain)

  if (!otpHash) return error(500, 'Erro ao processar OTP')

  const now = new Date()
  const expiresAt = new Date(now.getTime() + REQUEST_EXPIRY_MINUTES * 60 * 1000)
  const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000)

  // 7. Inserir pedido no banco
  const { data: newRequest, error: insertError } = await supabase
    .from('requests')
    .insert({
      client_id: user.id,
      category_id: resolvedCategoryId,
      status: 'requested',
      address_origin: input.address_origin,
      address_dest: input.address_dest ?? null,
      origin_lat: input.origin_lat ?? null,
      origin_lng: input.origin_lng ?? null,
      dest_lat: input.dest_lat ?? null,
      dest_lng: input.dest_lng ?? null,
      description: input.description ?? null,
      media_urls: input.media_urls,
      needs_helper: input.needs_helper,
      scheduled_for: input.scheduled_for ?? null,
      price_estimated: input.price_estimated ?? null,
      otp_code_hash: otpHash,
      otp_expires_at: otpExpiresAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id, status, expires_at')
    .single()

  if (insertError || !newRequest) return error(500, 'Erro ao criar pedido')

  // 8. Registrar evento de auditoria
  await logEvent(newRequest.id, user.id, null, 'requested', {
    category_id: input.category_id,
    address_origin: input.address_origin,
    needs_helper: input.needs_helper,
  })

  // 9. Retornar — otp_code exposto UMA ÚNICA VEZ, nunca logado
  return ok(
    {
      id: newRequest.id,
      status: newRequest.status,
      expires_at: newRequest.expires_at,
      otp_code: otpPlain,
    },
    201,
  )
})
