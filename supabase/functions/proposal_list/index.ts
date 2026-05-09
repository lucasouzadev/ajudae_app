import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  const column = profile.role === 'provider' ? 'provider_id' : 'client_id'
  const { data, error: listError } = await supabase
    .from('service_proposals')
    .select(`
      id, client_id, provider_id, category_id, status, address_origin, address_dest,
      description, media_urls, needs_helper, price_proposed, scheduled_for,
      decision_note, decided_at, accepted_request_id, expires_at, created_at,
      categories(name),
      client:profiles!service_proposals_client_id_fkey(name),
      provider:providers!service_proposals_provider_id_fkey(id, active, verified, profiles(name))
    `)
    .eq(column, user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (listError) return error(req, 500, 'Erro ao carregar propostas')

  return ok(req, { proposals: data ?? [] })
})
