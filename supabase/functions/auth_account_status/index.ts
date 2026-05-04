import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? 'https://ajudaeh.com.br',
  Vary: 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const RequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
})

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Método não permitido' })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Body inválido' })
  }

  const parsed = RequestSchema.safeParse(payload)
  if (!parsed.success) {
    return json(400, { error: parsed.error.errors[0]?.message ?? 'Payload inválido' })
  }

  const targetEmail = parsed.data.email

  const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (usersError) {
    console.error('[auth_account_status] listUsers:', usersError.message)
    return json(500, { error: 'Erro ao consultar conta' })
  }

  const authUser = usersPage.users.find((item) => item.email?.toLowerCase() === targetEmail)

  if (!authUser) {
    return json(200, {
      exists: false,
      status: 'not_found',
      email: targetEmail,
    })
  }

  const emailConfirmed = Boolean(authUser.email_confirmed_at)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, name, phone, cpf')
    .eq('id', authUser.id)
    .maybeSingle()

  const role = profile?.role ?? authUser.user_metadata?.role ?? 'client'

  let provider:
    | {
        verified: boolean
        active: boolean
        onboarding_status: string
        kyc_status: string
      }
    | null = null

  if (role === 'provider') {
    const { data: providerRow } = await supabase
      .from('providers')
      .select('verified, active, onboarding_status, kyc_status')
      .eq('id', authUser.id)
      .maybeSingle()

    provider = providerRow
  }

  let status = 'client_active'

  if (!emailConfirmed) {
    status = 'pending_email_confirmation'
  } else if (role === 'provider') {
    if (provider?.verified) {
      status = 'provider_verified'
    } else if (provider?.onboarding_status === 'submitted') {
      status = 'provider_pending_review'
    } else {
      status = 'provider_needs_validation'
    }
  }

  return json(200, {
    exists: true,
    email: targetEmail,
    role,
    status,
    email_confirmed: emailConfirmed,
    name: profile?.name ?? authUser.user_metadata?.name ?? null,
    phone: profile?.phone ?? authUser.user_metadata?.phone ?? null,
    cpf: profile?.cpf ?? authUser.user_metadata?.cpf ?? null,
    provider: provider
      ? {
          verified: provider.verified,
          active: provider.active,
          onboarding_status: provider.onboarding_status,
          kyc_status: provider.kyc_status,
        }
      : null,
  })
})
