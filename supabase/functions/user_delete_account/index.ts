import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? 'https://ajudaeh.com.br',
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Service-role client — bypasses RLS to anonymize data and delete auth user
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function err(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return err(405, 'Método não permitido')
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return err(401, 'Não autenticado')

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (authError || !user) return err(401, 'Token inválido')

  // 1. Cancel any active or pending requests as client
  await supabase
    .from('requests')
    .update({ status: 'cancelled', cancel_reason: 'client_gave_up', cancelled_by: user.id })
    .eq('client_id', user.id)
    .in('status', ['requested', 'accepted', 'en_route'])

  // 2. Set provider offline and clear location if applicable
  await supabase
    .from('providers')
    .update({ active: false, location_lat: null, location_lng: null })
    .eq('id', user.id)

  // 3. Anonymize profile — LGPD Art. 18: right to erasure
  await supabase
    .from('profiles')
    .update({
      name: 'Conta Removida',
      phone: null,
      avatar_url: null,
      expo_push_token: null,
      push_token_updated_at: null,
      lgpd_accepted: false,
      geolocation_requested: false,
      camera_requested: false,
      notifications_requested: false,
    })
    .eq('id', user.id)

  // 4. Delete the auth user — this is irreversible
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return err(500, 'Erro ao remover conta: ' + deleteError.message)
  }

  return ok({ deleted: true, user_id: user.id })
})
