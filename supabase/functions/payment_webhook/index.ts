import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? 'https://ajudaeh.com.br',
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

type StripeEvent = {
  type: string
  data: { object: Record<string, unknown> }
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

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

function parseSignature(header: string): Record<string, string[]> {
  return header.split(',').reduce<Record<string, string[]>>((acc, part) => {
    const [rawKey, ...rawValue] = part.split('=')
    const key = rawKey?.trim()
    const value = rawValue.join('=').trim()
    if (!key || !value) return acc
    acc[key] = [...(acc[key] ?? []), value]
    return acc
  }, {})
}

async function verifyStripeSignature(payload: string, signatureHeader: string): Promise<boolean> {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) return false

  const parts = parseSignature(signatureHeader)
  const timestamp = parts.t?.[0]
  const signatures = parts.v1 ?? []
  if (!timestamp || signatures.length === 0) return false

  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false

  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`)
  return signatures.some((signature) => secureEqual(signature, expected))
}

async function verifyMercadoPagoSignature(req: Request, url: URL, body: Record<string, unknown>): Promise<boolean> {
  const secret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')
  if (!secret) return false

  const signatureHeader = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')
  if (!signatureHeader || !requestId) return false

  const parts = parseSignature(signatureHeader)
  const timestamp = parts.ts?.[0]
  const signature = parts.v1?.[0]
  if (!timestamp || !signature) return false

  const queryId = url.searchParams.get('data.id') ?? url.searchParams.get('id')
  const bodyData = body.data as { id?: unknown } | undefined
  const dataId = String(queryId ?? bodyData?.id ?? '').toLowerCase()
  if (!dataId) return false

  const age = Math.abs(Date.now() - Number(timestamp))
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false

  const expected = await hmacSha256Hex(secret, `id:${dataId};request-id:${requestId};ts:${timestamp};`)
  return secureEqual(signature, expected)
}

function stripeRequestId(object: Record<string, unknown>): string | null {
  const metadata = object.metadata as { request_id?: unknown } | undefined
  if (typeof metadata?.request_id === 'string') return metadata.request_id
  if (typeof object.client_reference_id === 'string') return object.client_reference_id
  return null
}

function stripeStatus(eventType: string, object: Record<string, unknown>): 'captured' | 'failed' | 'pending' | null {
  if (eventType === 'checkout.session.completed') {
    return object.payment_status === 'paid' ? 'captured' : 'pending'
  }
  if (eventType === 'payment_intent.succeeded') return 'captured'
  if (
    eventType === 'checkout.session.async_payment_failed' ||
    eventType === 'checkout.session.expired' ||
    eventType === 'payment_intent.payment_failed'
  ) {
    return 'failed'
  }
  return null
}

async function handleStripe(req: Request): Promise<Response> {
  const payload = await req.text()
  const signatureHeader = req.headers.get('stripe-signature')
  if (!signatureHeader) return error(401, 'Assinatura Stripe ausente')

  const valid = await verifyStripeSignature(payload, signatureHeader)
  if (!valid) return error(401, 'Assinatura Stripe inválida')

  let event: StripeEvent
  try {
    event = JSON.parse(payload)
  } catch {
    return error(400, 'Evento Stripe inválido')
  }

  const object = event.data.object
  const requestId = stripeRequestId(object)
  const paymentStatus = stripeStatus(event.type, object)
  if (!requestId || !paymentStatus) return ok({ received: true })

  const paymentIntent = typeof object.payment_intent === 'string'
    ? object.payment_intent
    : typeof object.id === 'string' && event.type.startsWith('payment_intent.')
      ? object.id
      : null

  await supabase
    .from('requests')
    .update({
      payment_status: paymentStatus,
      payment_provider: 'stripe',
      payment_intent_id: paymentIntent,
      payment_captured_at: paymentStatus === 'captured' ? new Date().toISOString() : null,
      payment_error: paymentStatus === 'failed' ? String(object.last_payment_error ?? event.type) : null,
      payment_metadata: {
        stripe_event_type: event.type,
        stripe_object_id: object.id,
      },
    })
    .eq('id', requestId)

  return ok({ received: true })
}

function mercadoPagoStatus(status: string): 'captured' | 'failed' | 'refunded' | 'pending' {
  if (status === 'approved') return 'captured'
  if (status === 'refunded' || status === 'charged_back') return 'refunded'
  if (['rejected', 'cancelled'].includes(status)) return 'failed'
  return 'pending'
}

async function handleMercadoPago(req: Request, url: URL): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const valid = await verifyMercadoPagoSignature(req, url, body)
  if (!valid) return error(401, 'Assinatura Mercado Pago inválida')

  const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
  if (!accessToken) return error(500, 'MERCADO_PAGO_ACCESS_TOKEN não configurado')

  const bodyData = body.data as { id?: unknown } | undefined
  const paymentId = String(url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? bodyData?.id ?? '')
  if (!paymentId) return error(400, 'Pagamento Mercado Pago não informado')

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const payment = await response.json()
  if (!response.ok) return error(502, 'Erro ao consultar pagamento Mercado Pago')

  const requestId = typeof payment.external_reference === 'string'
    ? payment.external_reference
    : typeof payment.metadata?.request_id === 'string'
      ? payment.metadata.request_id
      : null

  if (!requestId) return ok({ received: true })

  const paymentStatus = mercadoPagoStatus(String(payment.status ?? 'pending'))

  await supabase
    .from('requests')
    .update({
      payment_status: paymentStatus,
      payment_provider: 'mercado_pago',
      payment_provider_id: String(payment.id),
      payment_captured_at: paymentStatus === 'captured' ? payment.date_approved ?? new Date().toISOString() : null,
      payment_error: paymentStatus === 'failed' ? String(payment.status_detail ?? payment.status) : null,
      payment_metadata: {
        mercado_pago_status: payment.status,
        mercado_pago_status_detail: payment.status_detail,
      },
    })
    .eq('id', requestId)

  return ok({ received: true })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return error(405, 'Método não permitido')
  }

  const url = new URL(req.url)
  const provider = url.searchParams.get('provider')

  if (provider === 'stripe') return handleStripe(req)
  if (provider === 'mercado_pago') return handleMercadoPago(req, url)

  return error(400, 'Provedor não informado')
})
