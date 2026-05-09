import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? 'https://ajudaeh.com.br',
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const PaymentCreateSchema = z.object({
  request_id: z.string().uuid('request_id deve ser um UUID válido'),
  method: z.enum(['card', 'pix']),
  provider: z.enum(['stripe', 'mercado_pago']),
  success_url: z.string().min(1).optional(),
  cancel_url: z.string().min(1).optional(),
})

type RequestRow = {
  id: string
  client_id: string
  category_id: string | null
  status: string
  description: string | null
  price_estimated: number | null
  price_final: number | null
}

function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function error(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function amountFromRequest(request: RequestRow): number | null {
  const amount = Number(request.price_final ?? request.price_estimated)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100) / 100
}

function defaultSuccessUrl(): string {
  return Deno.env.get('PAYMENT_SUCCESS_URL') ?? 'ajuda://payment?status=success'
}

function defaultCancelUrl(): string {
  return Deno.env.get('PAYMENT_CANCEL_URL') ?? 'ajuda://payment?status=cancel'
}

async function getCategoryName(categoryId: string | null): Promise<string> {
  if (!categoryId) return 'Serviço'
  const { data } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .maybeSingle()
  return data?.name ?? 'Serviço'
}

async function createStripeCheckout(
  request: RequestRow,
  amount: number,
  categoryName: string,
  successUrl: string,
  cancelUrl: string,
) {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY não configurado')

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('payment_method_types[0]', 'card')
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('client_reference_id', request.id)
  params.set('line_items[0][quantity]', '1')
  params.set('line_items[0][price_data][currency]', 'brl')
  params.set('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)))
  params.set('line_items[0][price_data][product_data][name]', `Ajudae - ${categoryName}`)
  params.set('metadata[request_id]', request.id)
  params.set('payment_intent_data[metadata][request_id]', request.id)

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2026-02-25.clover',
      'Idempotency-Key': `request-${request.id}-stripe-checkout`,
    },
    body: params,
  })

  const data = await response.json()
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : 'Erro ao criar checkout Stripe'
    throw new Error(message)
  }

  return data
}

async function createMercadoPagoPix(request: RequestRow, amount: number, categoryName: string, payerEmail: string) {
  const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
  if (!accessToken) throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado')

  const notificationUrl = Deno.env.get('PAYMENT_NOTIFICATION_URL')
  const body: Record<string, unknown> = {
    transaction_amount: amount,
    description: `Ajudae - ${categoryName}`,
    payment_method_id: 'pix',
    payer: { email: payerEmail },
    external_reference: request.id,
    metadata: { request_id: request.id },
  }

  if (notificationUrl) body.notification_url = notificationUrl

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `request-${request.id}-mercado-pago-pix`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'Erro ao criar Pix Mercado Pago'
    throw new Error(message)
  }

  return data
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return error(405, 'Método não permitido')
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return error(401, 'Não autenticado')

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (authError || !user) return error(401, 'Token inválido')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return error(401, 'Perfil não encontrado')
  if (profile.role !== 'client') return error(403, 'Apenas clientes podem iniciar pagamentos')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error(400, 'Body inválido')
  }

  const parsed = PaymentCreateSchema.safeParse(body)
  if (!parsed.success) {
    return error(400, parsed.error.errors.map((e) => e.message).join(', '))
  }

  const input = parsed.data
  if (input.method === 'card' && input.provider !== 'stripe') {
    return error(400, 'Cartão deve usar Stripe')
  }
  if (input.method === 'pix' && input.provider !== 'mercado_pago') {
    return error(400, 'Pix deve usar Mercado Pago')
  }

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('id, client_id, category_id, status, description, price_estimated, price_final')
    .eq('id', input.request_id)
    .maybeSingle()

  if (requestError) return error(500, 'Erro ao buscar pedido')
  if (!request) return error(404, 'Pedido não encontrado')
  if (request.client_id !== user.id) return error(403, 'Pedido não pertence ao cliente autenticado')
  if (['cancelled', 'expired', 'disputed'].includes(request.status)) {
    return error(409, 'Pedido não permite pagamento neste estado')
  }

  const amount = amountFromRequest(request as RequestRow)
  if (!amount) return error(422, 'Pedido sem valor válido para pagamento')

  const categoryName = await getCategoryName((request as RequestRow).category_id)

  try {
    if (input.provider === 'stripe') {
      const session = await createStripeCheckout(
        request as RequestRow,
        amount,
        categoryName,
        input.success_url ?? defaultSuccessUrl(),
        input.cancel_url ?? defaultCancelUrl(),
      )

      const expiresAt = typeof session.expires_at === 'number'
        ? new Date(session.expires_at * 1000).toISOString()
        : null

      await supabase
        .from('requests')
        .update({
          payment_status: 'pending',
          payment_provider: 'stripe',
          payment_provider_id: session.id,
          payment_intent_id: session.payment_intent ?? null,
          payment_checkout_url: session.url,
          payment_qr_code: null,
          payment_qr_code_base64: null,
          payment_expires_at: expiresAt,
          payment_amount: amount,
          payment_error: null,
          payment_metadata: { checkout_session_id: session.id },
        })
        .eq('id', request.id)

      return ok({
        request_id: request.id,
        provider: 'stripe',
        status: 'pending',
        amount,
        currency: 'BRL',
        checkout_url: session.url,
        provider_payment_id: session.id,
        expires_at: expiresAt,
      })
    }

    if (!user.email) return error(422, 'Cliente sem e-mail para pagamento Pix')

    const payment = await createMercadoPagoPix(request as RequestRow, amount, categoryName, user.email)
    const transactionData = payment?.point_of_interaction?.transaction_data ?? {}
    const expiresAt = typeof payment?.date_of_expiration === 'string' ? payment.date_of_expiration : null

    await supabase
      .from('requests')
      .update({
        payment_status: 'pending',
        payment_provider: 'mercado_pago',
        payment_provider_id: String(payment.id),
        payment_intent_id: null,
        payment_checkout_url: transactionData.ticket_url ?? null,
        payment_qr_code: transactionData.qr_code ?? null,
        payment_qr_code_base64: transactionData.qr_code_base64 ?? null,
        payment_expires_at: expiresAt,
        payment_amount: amount,
        payment_error: null,
        payment_metadata: { mercado_pago_payment_id: payment.id, status: payment.status },
      })
      .eq('id', request.id)

    return ok({
      request_id: request.id,
      provider: 'mercado_pago',
      status: 'pending',
      amount,
      currency: 'BRL',
      checkout_url: transactionData.ticket_url ?? null,
      qr_code: transactionData.qr_code ?? null,
      qr_code_base64: transactionData.qr_code_base64 ?? null,
      provider_payment_id: String(payment.id),
      expires_at: expiresAt,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Erro ao iniciar pagamento'
    await supabase
      .from('requests')
      .update({
        payment_status: 'failed',
        payment_provider: input.provider,
        payment_error: message,
        payment_amount: amount,
      })
      .eq('id', request.id)
    return error(502, message)
  }
})
