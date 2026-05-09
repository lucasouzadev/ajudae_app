import { supabase } from "./supabase";

export type PaymentMethod = "card" | "pix";
export type PaymentProvider = "stripe" | "mercado_pago";

export interface CreatePaymentInput {
  request_id: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  success_url?: string;
  cancel_url?: string;
}

export interface CreatedPayment {
  request_id: string;
  provider: PaymentProvider;
  status: "pending" | "authorized" | "captured" | "refunded" | "failed";
  amount: number;
  currency: "BRL";
  checkout_url?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  provider_payment_id?: string | null;
  expires_at?: string | null;
}

async function readEdgeErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : "Erro ao iniciar pagamento";
  const context = (error as { context?: unknown })?.context;

  if (context && typeof (context as Response).clone === "function") {
    try {
      const response = (context as Response).clone();
      const data = await response.json();
      if (typeof data?.error === "string") return data.error;
      if (typeof data?.message === "string") return data.message;
    } catch {
    }
  }

  return fallback;
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
  const { data, error } = await supabase.functions.invoke("payment_create", {
    body: input,
  });

  if (error) {
    throw new Error(await readEdgeErrorMessage(error));
  }

  return data as CreatedPayment;
}
