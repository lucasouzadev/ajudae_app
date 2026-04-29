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
const VerifyProviderSchema = z.object({
  provider_id: z.string().uuid('provider_id deve ser um UUID válido'),
  verified: z.boolean(),
  notes: z.string().max(1000).optional(),
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

  // 2. Verificar role = 'admin' via profiles (fonte de verdade, não JWT)
  //    Esta é a verificação mais crítica desta função — apenas admin pode aprovar prestadores
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(401, 'Perfil não encontrado')
  if (profile.role !== 'admin') {
    return error(403, 'Apenas administradores podem verificar prestadores')
  }

  // 3. Validar body com Zod
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(400, 'Body inválido — esperado JSON')
  }

  const parsed = VerifyProviderSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message).join(', ')
    return error(400, messages)
  }

  const { provider_id, verified, notes } = parsed.data

  // 4. notes obrigatório ao reprovar/suspender (verified = false)
  if (!verified && (!notes || notes.trim().length < 10)) {
    return error(400, 'Motivo obrigatório ao reprovar um prestador (mínimo 10 caracteres)')
  }

  // 5. Verificar que o provider existe
  const { data: provider } = await supabase
    .from('providers')
    .select('id, verified')
    .eq('id', provider_id)
    .maybeSingle()

  if (!provider) return error(404, 'Prestador não encontrado')

  // 6. Se reprovando: forçar active=false para tirar do ar imediatamente
  const updatePayload: Record<string, unknown> = { verified }
  if (!verified) {
    updatePayload.active = false
  }

  // 7. Atualizar verificação do prestador
  const { data: updated, error: updateError } = await supabase
    .from('providers')
    .update(updatePayload)
    .eq('id', provider_id)
    .select('id, verified, active')
    .single()

  if (updateError || !updated) {
    return error(500, 'Erro ao atualizar verificação do prestador')
  }

  // 8. Registrar decisão no log de auditoria usando request_events não se aplica aqui
  //    Usamos profiles como registro indireto via updated_at (sem tabela de admin_actions no MVP)
  //    [Fase 2] Criar tabela admin_actions para auditoria de ações administrativas

  // 9. Retornar resultado
  //    [Fase 1+] Aqui entrará notificação por e-mail ao prestador (aprovado/reprovado)
  return ok({
    provider_id: updated.id,
    verified: updated.verified,
    updated_at: new Date().toISOString(),
    ...(notes ? { notes } : {}),
  })
})
