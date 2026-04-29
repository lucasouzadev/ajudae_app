import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? 'https://ajudaeh.com.br',
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // 1. Verificar JWT
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // 2. Buscar role em profiles (fonte de verdade — nunca confiar no JWT claim)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'provider') {
    return new Response(JSON.stringify({ error: 'Acesso negado.' }), {
      status: 403,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // 3. Buscar CPF e kyc_status do provider
  const { data: provider } = await supabase
    .from('providers')
    .select('cpf, kyc_status')
    .eq('id', user.id)
    .single()

  if (provider?.kyc_status === 'approved') {
    return new Response(JSON.stringify({ error: 'KYC já aprovado.' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // 4. Criar sessão no Idwall
  const idwallRes = await fetch('https://api.idwall.co/v1/reports', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('IDWALL_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: Deno.env.get('IDWALL_WORKFLOW_ID'),
      person: {
        name: profile.name,
        cpf: provider?.cpf,
        email: user.email,
      },
    }),
  })

  if (!idwallRes.ok) {
    const errText = await idwallRes.text()
    console.error('[provider_kyc_start] Idwall error:', errText)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de verificação.' }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { report_id, sdk_token } = await idwallRes.json() as { report_id: string; sdk_token: string }

  // 5. Salvar report_id e marcar como in_progress
  await supabase
    .from('providers')
    .update({ kyc_report_id: report_id, kyc_status: 'in_progress' })
    .eq('id', user.id)

  return new Response(JSON.stringify({ sdk_token }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
