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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const VerifyProviderSchema = z.object({
  provider_id: z.string().uuid('provider_id deve ser um UUID válido'),
  verified: z.boolean(),
  notes: z.string().max(1000).optional(),
})

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

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')

  if (!apiKey || !from) {
    console.warn('[admin_verify_provider] RESEND not configured')
    return { sent: false, skipped: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[admin_verify_provider] resend:', errorText)
    return { sent: false, skipped: false }
  }

  return { sent: true, skipped: false }
}

async function sendExpoPush(
  userId: string,
  payload: {
    title: string
    body: string
    screen?: string
  },
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .maybeSingle()

  const token = profile?.expo_push_token?.trim()
  if (!token) {
    return { sent: false, skipped: true }
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      to: token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      data: payload.screen ? { screen: payload.screen } : {},
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[admin_verify_provider] expo push:', errorText)
    return { sent: false, skipped: false }
  }

  return { sent: true, skipped: false }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailFrame({
  eyebrow,
  title,
  intro,
  accent,
  sections,
  footer,
}: {
  eyebrow: string
  title: string
  intro: string
  accent: string
  sections: string
  footer: string
}) {
  return `
    <div style="margin:0;padding:24px;background:#F3F1EC;font-family:Arial,sans-serif;color:#1A1714;">
      <div style="max-width:720px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E3D8;border-radius:24px;overflow:hidden;">
        <div style="padding:24px;background:${accent};">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.22);font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1A1714;">
            ${escapeHtml(eyebrow)}
          </div>
          <h1 style="margin:14px 0 8px;font-size:28px;line-height:1.15;color:#1A1714;">${escapeHtml(title)}</h1>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#3B3129;">${escapeHtml(intro)}</p>
        </div>
        <div style="padding:24px;">
          ${sections}
          <div style="margin-top:20px;padding:16px 18px;border-radius:18px;background:#F8F5EC;border:1px solid #E8E3D8;font-size:12px;line-height:1.6;color:#6B6259;">
            ${escapeHtml(footer)}
          </div>
        </div>
      </div>
    </div>
  `
}

function buildSection(title: string, rows: Array<[string, string]>) {
  const items = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #EEE7DC;width:34%;font-size:12px;font-weight:700;color:#6B6259;vertical-align:top;">
            ${escapeHtml(label)}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #EEE7DC;font-size:13px;color:#1A1714;vertical-align:top;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `,
    )
    .join('')

  return `
    <div style="margin:0 0 18px;border:1px solid #E8E3D8;border-radius:18px;overflow:hidden;background:#FFFFFF;">
      <div style="padding:12px 16px;background:#F8F5EC;border-bottom:1px solid #E8E3D8;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#6B6259;">
        ${escapeHtml(title)}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${items}</tbody>
      </table>
    </div>
  `
}

function buildApprovedEmail(name: string, serviceType: string) {
  const sections = [
    buildSection('Status da conta', [
      ['Nome', name || 'Prestador'],
      ['Resultado', 'Aprovado'],
      ['Serviço principal', serviceType || 'Ajudaê'],
      ['Conta', 'Liberada para operar'],
    ]),
    buildSection('Próximos passos', [
      ['1', 'Abra o app e acesse sua home de prestador'],
      ['2', 'Ative seu status online quando estiver disponível'],
      ['3', 'Revise seu perfil e acompanhe os pedidos recebidos'],
      ['4', 'Mantenha documentos e dados sempre atualizados'],
    ]),
  ].join('')

  return buildEmailFrame({
    eyebrow: 'Ajudaê',
    title: 'Sua conta foi aprovada',
    intro: 'Seu cadastro foi analisado e liberado. A partir de agora você já pode acessar a área de prestador normalmente.',
    accent: '#D1FAE5',
    sections,
    footer: 'Bem-vindo ao Ajudaê. Em caso de inconsistência cadastral futura, a equipe pode solicitar nova atualização documental.',
  })
}

function buildRejectedEmail(name: string, notes: string) {
  const sections = [
    buildSection('Status da conta', [
      ['Nome', name || 'Prestador'],
      ['Resultado', 'Reprovado no momento'],
    ]),
    buildSection('Motivo informado pela equipe', [
      ['Observação', notes],
    ]),
    buildSection('Como seguir', [
      ['1', 'Abra o aplicativo e revise seus dados'],
      ['2', 'Corrija os documentos ou campos solicitados'],
      ['3', 'Envie uma nova validação quando tudo estiver correto'],
    ]),
  ].join('')

  return buildEmailFrame({
    eyebrow: 'Ajudaê',
    title: 'Sua validação precisa de ajustes',
    intro: 'Sua documentação foi analisada, mas precisamos que você corrija alguns pontos antes da liberação da conta.',
    accent: '#FEE2E2',
    sections,
    footer: 'Assim que o novo envio for concluído, a análise volta para a fila operacional.',
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return error(req, 405, 'Método não permitido')
  }

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(req, 401, 'Perfil não encontrado')
  if (profile.role !== 'admin') {
    return error(req, 403, 'Apenas administradores podem verificar prestadores')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(req, 400, 'Body inválido — esperado JSON')
  }

  const parsed = VerifyProviderSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.errors.map((entry) => entry.message).join(', ')
    return error(req, 400, messages)
  }

  const { provider_id, verified, notes } = parsed.data
  const decisionNotes = notes?.trim() ?? ''

  if (!verified && decisionNotes.length < 10) {
    return error(req, 400, 'Motivo obrigatório ao reprovar um prestador (mínimo 10 caracteres)')
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('id, service_type, onboarding_status')
    .eq('id', provider_id)
    .maybeSingle()

  if (!provider) return error(req, 404, 'Prestador não encontrado')

  const { data: providerProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', provider_id)
    .maybeSingle()

  const { data: authUserData } = await supabase.auth.admin.getUserById(provider_id)
  const providerEmail = authUserData.user?.email ?? ''

  const updatePayload: Record<string, unknown> = verified
    ? {
        verified: true,
        active: true,
        onboarding_status: 'approved',
        kyc_status: 'approved',
        rejection_reason: null,
        rejection_until: null,
      }
    : {
        verified: false,
        active: false,
        onboarding_status: 'rejected',
        kyc_status: 'rejected',
        rejection_reason: decisionNotes,
      }

  const { data: updated, error: updateError } = await supabase
    .from('providers')
    .update(updatePayload)
    .eq('id', provider_id)
    .select('id, verified, active, onboarding_status, rejection_reason')
    .single()

  if (updateError || !updated) {
    return error(req, 500, 'Erro ao atualizar verificação do prestador')
  }

  let emailResult = { sent: false, skipped: true }
  if (providerEmail) {
    const subject = verified
      ? 'Ajudaê - Sua conta de prestador foi aprovada'
      : 'Ajudaê - Sua validação precisa de ajustes'
    const html = verified
      ? buildApprovedEmail(providerProfile?.name ?? '', provider.service_type ?? '')
      : buildRejectedEmail(providerProfile?.name ?? '', decisionNotes)
    emailResult = await sendEmail(providerEmail, subject, html)
  }

  const pushResult = await sendExpoPush(provider_id, verified
    ? {
        title: 'Perfil verificado!',
        body: 'Parabéns! Você pode começar a aceitar pedidos no Ajudaê.',
        screen: 'index',
      }
    : {
        title: 'Validação com ajustes',
        body: 'Sua documentação precisa de correções antes da aprovação final.',
        screen: 'index',
      })

  return ok(req, {
    provider_id: updated.id,
    verified: updated.verified,
    active: updated.active,
    onboarding_status: updated.onboarding_status,
    rejection_reason: updated.rejection_reason,
    email: emailResult,
    push: pushResult,
    updated_at: new Date().toISOString(),
  })
})
