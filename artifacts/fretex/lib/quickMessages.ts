import { supabase } from "./supabase";

export interface QuickMessageRow {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export async function fetchQuickMessages(requestId: string): Promise<QuickMessageRow[]> {
  const { data, error } = await supabase
    .from("quick_messages")
    .select("id, request_id, sender_id, message, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as QuickMessageRow[];
}

export async function sendQuickMessage(
  requestId: string,
  senderId: string,
  message: string,
): Promise<QuickMessageRow> {
  const { data, error } = await supabase
    .from("quick_messages")
    .insert({
      request_id: requestId,
      sender_id: senderId,
      message,
    })
    .select("id, request_id, sender_id, message, created_at")
    .single();

  if (error || !data) {
    throw error ?? new Error("Não foi possível enviar a mensagem");
  }

  return data as QuickMessageRow;
}
