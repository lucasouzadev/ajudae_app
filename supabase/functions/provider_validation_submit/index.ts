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

const ValidationSchema = z.object({
  full_name: z.string().trim().min(5, 'Nome completo obrigatório'),
  cpf: z.string().trim().min(11, 'CPF obrigatório'),
  birth_date: z.string().trim().min(10, 'Data de nascimento obrigatória'),
  phone: z.string().trim().min(10, 'Telefone obrigatório'),
  service_type: z.enum(['frete', 'mudanca', 'entrega']),
  service_category: z.string().trim().min(2, 'Categoria obrigatória'),
  vehicle_type: z.enum(['car', 'utility', 'van', 'truck_small', 'truck_large']),
  vehicle_model: z.string().trim().min(2, 'Modelo obrigatório'),
  vehicle_year: z.number().int().min(1990).max(2100),
  vehicle_plate: z.string().trim().min(7, 'Placa obrigatória'),
  contact_method: z.enum(['ligacao', 'whatsapp']),
  contact_availability: z.string().trim().min(2, 'Disponibilidade obrigatória'),
  doc_rg_url: z.string().trim().min(1, 'Documento RG obrigatório'),
  doc_residence_url: z.string().trim().min(1, 'Comprovante obrigatório'),
  doc_cnh_url: z.string().trim().min(1, 'Documento CNH obrigatório'),
  doc_crlv_url: z.string().trim().optional().or(z.literal('')),
  doc_selfie_url: z.string().trim().min(1, 'Selfie obrigatória'),
  validation_notes: z.string().trim().max(1200).optional().or(z.literal('')),
})

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')

  if (!apiKey || !from) {
    console.warn('[provider_validation_submit] RESEND not configured')
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
    console.error('[provider_validation_submit] resend:', errorText)
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
    console.error('[provider_validation_submit] expo push:', errorText)
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

function fileNameFromPath(path: string) {
  return path.split('/').pop() || path
}

function labelServiceType(value: string) {
  const map: Record<string, string> = {
    frete: 'Frete',
    mudanca: 'Mudança',
    entrega: 'Entrega',
  }
  return map[value] ?? value
}

function labelVehicleType(value: string) {
  const map: Record<string, string> = {
    car: 'Carro utilitário / pickup pequena',
    utility: 'Pickup média',
    van: 'Furgão / Van de carga',
    truck_small: 'Van grande / Caminhão pequeno',
    truck_large: 'Caminhão',
  }
  return map[value] ?? value
}

function labelContactMethod(value: string) {
  const map: Record<string, string> = {
    ligacao: 'Ligação',
    whatsapp: 'WhatsApp',
  }
  return map[value] ?? value
}

function labelAvailability(value: string) {
  const map: Record<string, string> = {
    manha: 'Manhã (8h–12h)',
    tarde: 'Tarde (13h–18h)',
    noite: 'Noite (18h–21h)',
    qualquer: 'Qualquer horário',
  }
  return map[value] ?? value
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

function buildEmailFrame(title: string, eyebrow: string, intro: string, sections: string, footer: string) {
  return `
    <div style="margin:0;padding:24px;background:#F3F1EC;font-family:Arial,sans-serif;color:#1A1714;">
      <div style="max-width:760px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E3D8;border-radius:24px;overflow:hidden;">
        <div style="padding:24px 24px 20px;background:linear-gradient(135deg,#FFCC00 0%,#F4B400 100%);">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,0.28);font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1A1714;">
            ${escapeHtml(eyebrow)}
          </div>
          <h1 style="margin:14px 0 8px;font-size:28px;line-height:1.15;color:#1A1714;">${escapeHtml(title)}</h1>
          <p style="margin:0;font-size:14px;line-height:1.55;color:#3B3129;">${escapeHtml(intro)}</p>
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

function buildOpsEmailHtml(input: z.infer<typeof ValidationSchema>, email: string) {
  const sections = [
    buildSection('Dados pessoais', [
      ['Nome completo', input.full_name],
      ['E-mail', email || 'Não informado'],
      ['CPF', input.cpf],
      ['Telefone', input.phone],
      ['Data de nascimento', input.birth_date],
    ]),
    buildSection('Serviço e veículo', [
      ['Tipo de serviço', labelServiceType(input.service_type)],
      ['Categoria', input.service_category],
      ['Tipo de veículo', labelVehicleType(input.vehicle_type)],
      ['Modelo', input.vehicle_model],
      ['Ano', String(input.vehicle_year)],
      ['Placa', input.vehicle_plate],
    ]),
    buildSection('Contato e disponibilidade', [
      ['Método preferido', labelContactMethod(input.contact_method)],
      ['Faixa de contato', labelAvailability(input.contact_availability)],
      ['Observações', input.validation_notes || 'Sem observações'],
    ]),
    buildSection('Documentos enviados', [
      ['RG / Identidade', fileNameFromPath(input.doc_rg_url)],
      ['Comprovante de residência', fileNameFromPath(input.doc_residence_url)],
      ['CNH', fileNameFromPath(input.doc_cnh_url)],
      ['CRLV', input.doc_crlv_url ? fileNameFromPath(input.doc_crlv_url) : 'Não enviado'],
      ['Selfie', fileNameFromPath(input.doc_selfie_url)],
    ]),
  ].join('')

  return buildEmailFrame(
    'Nova validação de prestador',
    'Ajudaê CRM',
    'Recebemos um novo envio de validação e os dados abaixo já estão disponíveis para conferência operacional.',
    sections,
    'Os documentos visuais devem ser analisados pelo painel interno. Use o CRM para revisar, aprovar ou reprovar com segurança.',
  )
}

function buildProviderEmailHtml(input: z.infer<typeof ValidationSchema>, email: string) {
  const sections = [
    buildSection('Resumo do cadastro', [
      ['Nome completo', input.full_name],
      ['E-mail', email || 'Não informado'],
      ['CPF', input.cpf],
      ['Telefone', input.phone],
      ['Tipo de serviço', labelServiceType(input.service_type)],
      ['Categoria', input.service_category],
      ['Veículo', `${input.vehicle_model} · ${input.vehicle_year}`],
      ['Placa', input.vehicle_plate],
    ]),
    buildSection('Documentação recebida', [
      ['RG / Identidade', 'Recebido'],
      ['Comprovante de residência', 'Recebido'],
      ['CNH', 'Recebido'],
      ['CRLV', input.doc_crlv_url ? 'Recebido' : 'Não enviado'],
      ['Selfie', 'Recebida'],
      ['Observações enviadas', input.validation_notes ? 'Incluídas no envio' : 'Sem observações'],
    ]),
    buildSection('Próximas etapas', [
      ['Status atual', 'Em análise'],
      ['Prazo estimado', 'Até 24 horas'],
      ['Retorno', 'Avisaremos por e-mail assim que a análise terminar'],
    ]),
  ].join('')

  return buildEmailFrame(
    'Recebemos sua validação',
    'Ajudaê',
    'Seu envio foi registrado com sucesso. Agora nossa equipe vai revisar os dados e os documentos do cadastro.',
    sections,
    'Guarde este e-mail como comprovante do envio. Se precisar atualizar algum dado antes da aprovação, faça um novo envio pelo aplicativo.',
  )
}

function hasLockedSubmission(provider: {
  onboarding_status?: string | null
  submitted_at?: string | null
}) {
  if (provider.onboarding_status === 'approved' || provider.onboarding_status === 'submitted') {
    return true
  }

  return Boolean(provider.submitted_at && provider.onboarding_status !== 'rejected')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Método não permitido' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'Não autenticado' })
  }

  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return json(401, { error: 'Token inválido' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'provider') {
    return json(403, { error: 'Apenas prestadores podem validar conta' })
  }

  const { data: existingProvider, error: providerLookupError } = await supabase
    .from('providers')
    .select('id, onboarding_status, submitted_at')
    .eq('id', user.id)
    .maybeSingle()

  if (providerLookupError || !existingProvider) {
    console.error('[provider_validation_submit] provider lookup:', providerLookupError?.message ?? 'not found')
    return json(404, { error: 'Perfil de prestador não encontrado' })
  }

  if (hasLockedSubmission(existingProvider)) {
    return json(409, {
      error:
        existingProvider.onboarding_status === 'approved'
          ? 'Sua conta já foi aprovada. Não é possível reenviar esta validação.'
          : 'Sua validação já foi enviada e está em análise.',
    })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Body inválido' })
  }

  const parsed = ValidationSchema.safeParse(payload)
  if (!parsed.success) {
    return json(400, { error: parsed.error.errors[0]?.message ?? 'Payload inválido' })
  }

  const input = parsed.data

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      name: input.full_name,
      phone: input.phone,
      cpf: input.cpf,
    })
    .eq('id', user.id)

  if (profileError) {
    if ((profileError as { code?: string }).code === '23505') {
      return json(409, { error: 'CPF já utilizado por outra conta' })
    }
    console.error('[provider_validation_submit] profiles:', profileError.message)
    return json(500, { error: 'Erro ao atualizar perfil' })
  }

  const { error: providerError } = await supabase
    .from('providers')
    .update({
      cpf: input.cpf,
      birth_date: input.birth_date,
      service_type: input.service_type,
      service_category: input.service_category,
      vehicle_type: input.vehicle_type,
      vehicle_model: input.vehicle_model,
      vehicle_year: input.vehicle_year,
      vehicle_plate: input.vehicle_plate.replace(/[^A-Z0-9]/gi, '').toUpperCase(),
      contact_method: input.contact_method,
      contact_availability: input.contact_availability,
      doc_rg_url: input.doc_rg_url,
      doc_residence_url: input.doc_residence_url,
      doc_cnh_url: input.doc_cnh_url,
      doc_crlv_url: input.doc_crlv_url || null,
      doc_selfie_url: input.doc_selfie_url,
      onboarding_status: 'submitted',
      validation_notes: input.validation_notes || null,
      submitted_at: new Date().toISOString(),
      verified: false,
      active: false,
      rejection_reason: null,
      rejection_until: null,
    })
    .eq('id', user.id)

  if (providerError) {
    if ((providerError as { code?: string }).code === '23505') {
      return json(409, { error: 'CPF já utilizado por outra conta' })
    }
    console.error('[provider_validation_submit] providers:', providerError.message)
    return json(500, { error: 'Erro ao enviar validação' })
  }

  const providerEmail = user.email ?? ''
  const providerEmailHtml = buildProviderEmailHtml(input, providerEmail)
  const opsEmailHtml = buildOpsEmailHtml(input, providerEmail)

  const [providerMail, opsMail, providerPush] = await Promise.all([
    providerEmail
      ? sendEmail(
          providerEmail,
          'Ajudaê - Recebemos sua validação de conta',
          providerEmailHtml,
        )
      : Promise.resolve({ sent: false, skipped: true }),
    sendEmail(
      'contato@ajudaeh.com.br',
      'Ajudaê - Nova validação de prestador',
      opsEmailHtml,
    ),
    sendExpoPush(user.id, {
      title: 'Documentos recebidos',
      body: 'Nossa equipe recebeu seus documentos e iniciou a análise da sua validação.',
      screen: 'index',
    }),
  ])

  return json(200, {
    submitted: true,
    emails: {
      provider: providerMail,
      operations: opsMail,
    },
    push: {
      provider: providerPush,
    },
  })
})
