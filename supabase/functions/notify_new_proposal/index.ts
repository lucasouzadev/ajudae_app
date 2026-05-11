import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'

// ─── CORS headers ──────────────────────────────────────────────────────────
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

// ─── Schema ───────────────────────────────────────────────────────────────
const Schema = z.object({
  request_id: z.string().uuid(),
  provider_id: z.string().uuid(),
})

// ─── Notification providers ───────────────────────────────────────────────
// Priority: Expo Push (in-app + lock screen) → Z-API (WhatsApp) → Twilio (SMS)
// Configure via Supabase secrets (supabase secrets set KEY=value)

async function sendExpoPush(
  token: string,
  payload: {
    title: string
    body: string
    data?: Record<string, string>
    categoryId?: string
    channelId?: string
  },
): Promise<boolean> {
  try {
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default',
        priority: 'high',
        ttl: 300,
        ...(payload.channelId && { channelId: payload.channelId }),
        ...(payload.categoryId && { categoryIdentifier: payload.categoryId }),
      }),
    })
    return resp.ok
  } catch {
    return false
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const zApiInstanceId = Deno.env.get('ZAPI_INSTANCE_ID')
  const zApiToken = Deno.env.get('ZAPI_TOKEN')
  if (!zApiInstanceId || !zApiToken) return false

  const e164 = phone.replace(/\D/g, '')
  const resp = await fetch(
    `https://api.z-api.io/instances/${zApiInstanceId}/token/${zApiToken}/send-text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: e164, message }),
    },
  )
  return resp.ok
}

async function sendSMS(phone: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
  if (!accountSid || !authToken || !fromNumber) return false

  const e164 = `+${phone.replace(/\D/g, '')}`
  const body = new URLSearchParams({ To: e164, From: fromNumber, Body: message })
  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    },
  )
  return resp.ok
}

// ─── Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const raw = await req.json()
    const input = Schema.parse(raw)

    // Load request details
    const { data: request, error: reqErr } = await supabase
      .from('requests')
      .select('id, address_origin, price_estimated, categories(name)')
      .eq('id', input.request_id)
      .single()

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load provider profile (phone + expo push token)
    const { data: provider } = await supabase
      .from('providers')
      .select('profiles(name, phone, expo_push_token)')
      .eq('id', input.provider_id)
      .single()

    const phone: string | undefined = (provider as any)?.profiles?.phone
    const providerName: string = (provider as any)?.profiles?.name ?? 'Prestador'
    const expoPushToken: string | undefined = (provider as any)?.profiles?.expo_push_token

    const category: string = (request as any)?.categories?.name ?? 'Serviço'
    const origin: string = (request as any).address_origin ?? ''
    const price: number = Number((request as any).price_estimated ?? 0)
    const priceStr = price > 0 ? `R$ ${price.toFixed(0)}` : 'a consultar'

    const channels: string[] = []

    // 1. Expo Push — reaches locked screen, notification center, triggers heads-up on Android
    if (expoPushToken && expoPushToken !== 'local-only') {
      const originSnippet = origin.length > 50 ? `${origin.slice(0, 47)}…` : origin
      const sentPush = await sendExpoPush(expoPushToken, {
        title: `🚛 Nova proposta — ${category}`,
        body: `${originSnippet} · ${priceStr}. Toque para aceitar!`,
        data: {
          screen: 'proposals',
          type: 'new_job_request',
          request_id: input.request_id,
        },
        channelId: 'ajudae-proposals',
        categoryId: 'new-proposal',
      })
      if (sentPush) channels.push('expo_push')
    }

    // 2. WhatsApp (Z-API) — fallback for providers without the app installed/active
    if (phone) {
      const message =
        `🚛 *Nova proposta no Ajudaê!*\n\n` +
        `Olá, ${providerName}! Há uma nova solicitação de *${category}* na sua região.\n\n` +
        `📍 Origem: ${origin}\n` +
        `💰 Valor estimado: ${priceStr}\n\n` +
        `Abra o app agora para ver os detalhes e aceitar antes de outro prestador! 🏃`

      const sentWa = await sendWhatsApp(phone, message)
      if (sentWa) channels.push('whatsapp')

      // 3. SMS — last resort
      if (!sentWa) {
        const sentSms = await sendSMS(phone, message)
        if (sentSms) channels.push('sms')
      }
    }

    if (channels.length === 0 && !phone && !expoPushToken) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'no_contact' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: true, channels }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof z.ZodError
      ? err.issues.map((i) => i.message).join(', ')
      : err instanceof Error
        ? err.message
        : 'Unexpected error'

    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
