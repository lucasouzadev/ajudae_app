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

function buildSummaryHtml(input: z.infer<typeof ValidationSchema>, email: string) {
  const lines = [
    ['Nome completo', input.full_name],
    ['E-mail', email],
    ['CPF', input.cpf],
    ['Telefone', input.phone],
    ['Data de nascimento', input.birth_date],
    ['Tipo de serviço', input.service_type],
    ['Categoria', input.service_category],
    ['Veículo', `${input.vehicle_model} (${input.vehicle_year})`],
    ['Placa', input.vehicle_plate],
    ['Tipo de veículo', input.vehicle_type],
    ['Contato', `${input.contact_method} · ${input.contact_availability}`],
    ['RG', input.doc_rg_url],
    ['Comprovante', input.doc_residence_url],
    ['CNH', input.doc_cnh_url],
    ['CRLV', input.doc_crlv_url || 'Não enviado'],
    ['Selfie', input.doc_selfie_url],
    ['Observações', input.validation_notes || 'Sem observações'],
  ]

  const items = lines
    .map(([label, value]) => `<tr><td style="padding:8px 12px;border:1px solid #E8E3D8;"><strong>${label}</strong></td><td style="padding:8px 12px;border:1px solid #E8E3D8;">${value}</td></tr>`)
    .join('')

  return `
    <div style="font-family:Arial,sans-serif;color:#1A1714;">
      <h2>Ajudaê - Validação de conta do prestador</h2>
      <p>Recebemos envio de validação abaixo.</p>
      <table style="border-collapse:collapse;width:100%;max-width:760px;">
        <tbody>${items}</tbody>
      </table>
    </div>
  `
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
    console.error('[provider_validation_submit] providers:', providerError.message)
    return json(500, { error: 'Erro ao enviar validação' })
  }

  const summaryHtml = buildSummaryHtml(input, user.email ?? '')
  const providerEmail = user.email ?? ''

  const [providerMail, opsMail] = await Promise.all([
    providerEmail
      ? sendEmail(
          providerEmail,
          'Ajudaê - Recebemos sua validação de conta',
          summaryHtml,
        )
      : Promise.resolve({ sent: false, skipped: true }),
    sendEmail(
      'contato@ajudaeh.com.br',
      'Ajudaê - Nova validação de prestador',
      summaryHtml,
    ),
  ])

  return json(200, {
    submitted: true,
    emails: {
      provider: providerMail,
      operations: opsMail,
    },
  })
})
