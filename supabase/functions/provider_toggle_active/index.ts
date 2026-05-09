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

// ─── Cliente Supabase com service_role (bypass RLS intencional) ────────────
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ─── Schema de validação do input ─────────────────────────────────────────
const ToggleActiveSchema = z.object({
  active: z.boolean(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
})

// ─── Helpers de resposta ──────────────────────────────────────────────────
function ok(req: Request, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

function error(req: Request, status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

// ─── Handler principal ────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return error(req, 405, 'Método não permitido')
  }

  // 1. Autenticar usuário via JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return error(req, 401, 'Não autenticado')
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (authError || !user) {
    return error(req, 401, 'Token inválido')
  }

  // 2. Verificar role = 'provider' via profiles (fonte de verdade, não JWT)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(req, 401, 'Perfil não encontrado')
  if (profile.role !== 'provider') {
    return error(req, 403, 'Apenas prestadores podem alterar disponibilidade')
  }

  // 3. Buscar perfil do prestador
  const { data: provider } = await supabase
    .from('providers')
    .select('id, verified, active')
    .eq('id', user.id)
    .single()

  if (!provider) return error(req, 403, 'Perfil de prestador não encontrado')

  // 4. Verificar verificação (não verificado não pode ficar online)
  if (!provider.verified) {
    return error(req, 403, 'Sua conta ainda não foi verificada pelo administrador')
  }

  // 5. Validar body com Zod
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(req, 400, 'Body inválido — esperado JSON')
  }

  const parsed = ToggleActiveSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message).join(', ')
    return error(req, 400, messages)
  }

  const { active, location_lat, location_lng } = parsed.data

  // 6. Se desativando: verificar que não há pedido em andamento
  //    Prestador não pode ficar offline com serviço ativo
  if (!active) {
    const { count: activeRequests } = await supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', user.id)
      .in('status', ['en_route', 'in_progress'])

    if ((activeRequests ?? 0) > 0) {
      return error(req, 409, 'Você tem um serviço em andamento — conclua antes de ficar offline')
    }
  }

  // 7. Montar payload do UPDATE
  const updatePayload: Record<string, unknown> = {
    active,
  }

  // Atualizar localização apenas ao ficar online e se fornecida
  if (active && location_lat !== undefined && location_lng !== undefined) {
    updatePayload.location_lat = location_lat
    updatePayload.location_lng = location_lng
    updatePayload.location_updated_at = new Date().toISOString()
  }

  // 8. Atualizar disponibilidade
  const { data: updated, error: updateError } = await supabase
    .from('providers')
    .update(updatePayload)
    .eq('id', user.id)
    .select('id, active, location_lat, location_lng, location_updated_at')
    .single()

  if (updateError || !updated) {
    return error(req, 500, 'Erro ao atualizar disponibilidade')
  }

  // 9. Retornar resultado
  return ok(req, {
    provider_id: updated.id,
    active: updated.active,
    updated_at: new Date().toISOString(),
  })
})
