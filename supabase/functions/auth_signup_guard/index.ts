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
  cpf: z.string().trim().optional().nullable(),
  role: z.enum(['client', 'provider']),
  exclude_user_id: z.string().uuid().optional().nullable(),
})

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function normalizeCpf(value?: string | null) {
  return (value ?? '').replace(/\D/g, '')
}

function roleLabel(role?: string | null) {
  if (role === 'admin') return 'acesso interno'
  if (role === 'provider') return 'prestador'
  return 'cliente'
}

function emailConflictMessage(existingRole?: string | null) {
  if (existingRole === 'admin') {
    return 'Este e-mail já está vinculado a um acesso interno e não pode ser usado no aplicativo.'
  }
  if (existingRole === 'provider') {
    return 'Este e-mail já está vinculado a uma conta de prestador.'
  }
  return 'Este e-mail já está vinculado a uma conta de cliente.'
}

function cpfConflictMessage(existingRole?: string | null) {
  if (existingRole === 'admin') {
    return 'Este CPF já está vinculado a um acesso interno.'
  }
  if (existingRole === 'provider') {
    return 'Este CPF já está vinculado a uma conta de prestador.'
  }
  return 'Este CPF já está vinculado a uma conta de cliente.'
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

  const { email, cpf, exclude_user_id } = parsed.data
  const normalizedCpf = normalizeCpf(cpf)

  let authUser:
    | {
        id: string
        email?: string
      }
    | undefined

  let page = 1
  while (!authUser) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })

    if (error) {
      console.error('[auth_signup_guard] listUsers:', error.message)
      return json(500, { error: 'Não foi possível validar o cadastro agora.' })
    }

    authUser = data.users.find((item) => item.email?.toLowerCase() === email)

    if (authUser || data.users.length < 1000) {
      break
    }

    page += 1
  }

  if (authUser && authUser.id !== exclude_user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()

    return json(200, {
      available: false,
      field: 'email',
      code: 'email_in_use',
      existing_role: profile?.role ?? null,
      existing_role_label: roleLabel(profile?.role),
      message: emailConflictMessage(profile?.role),
    })
  }

  if (normalizedCpf) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, role, cpf')
      .not('cpf', 'is', null)

    if (error) {
      console.error('[auth_signup_guard] profiles:', error.message)
      return json(500, { error: 'Não foi possível validar o CPF agora.' })
    }

    const conflict = profiles.find((profile) => (
      profile.id !== exclude_user_id &&
      normalizeCpf(profile.cpf) === normalizedCpf
    ))

    if (conflict) {
      return json(200, {
        available: false,
        field: 'cpf',
        code: 'cpf_in_use',
        existing_role: conflict.role ?? null,
        existing_role_label: roleLabel(conflict.role),
        message: cpfConflictMessage(conflict.role),
      })
    }

    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('id, cpf')
      .not('cpf', 'is', null)

    if (providersError) {
      console.error('[auth_signup_guard] providers:', providersError.message)
      return json(500, { error: 'Não foi possível validar o CPF agora.' })
    }

    const providerConflict = providers.find((provider) => (
      provider.id !== exclude_user_id &&
      normalizeCpf(provider.cpf) === normalizedCpf
    ))

    if (providerConflict) {
      const { data: providerProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', providerConflict.id)
        .maybeSingle()

      return json(200, {
        available: false,
        field: 'cpf',
        code: 'cpf_in_use',
        existing_role: providerProfile?.role ?? 'provider',
        existing_role_label: roleLabel(providerProfile?.role ?? 'provider'),
        message: cpfConflictMessage(providerProfile?.role ?? 'provider'),
      })
    }
  }

  return json(200, { available: true })
})
