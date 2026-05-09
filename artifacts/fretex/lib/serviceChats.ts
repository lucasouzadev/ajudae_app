import { supabase } from "./supabase";

export interface ServiceChatThread {
  request_id: string;
  status: string;
  category: string;
  address_origin: string;
  address_dest?: string | null;
  description?: string | null;
  needs_helper: boolean;
  price: number | null;
  scheduled_for?: string | null;
  created_at: string;
  participant_id: string;
  participant_name: string;
  last_message?: string | null;
  last_message_at?: string | null;
  unread: number;
}

export interface ServiceChatDetails extends ServiceChatThread {
  client_id: string;
  provider_id: string;
  client_name: string;
  provider_name: string;
  media_urls: string[];
}

type RequestRow = {
  id: string;
  status: string;
  client_id: string;
  provider_id: string | null;
  address_origin: string;
  address_dest: string | null;
  description: string | null;
  media_urls: string[] | null;
  needs_helper: boolean;
  price_final: number | null;
  price_estimated: number | null;
  scheduled_for: string | null;
  created_at: string;
  categories?: { name?: string | null } | null;
};

function formatParticipantInitials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

async function fetchProfiles(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, string>();

  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", uniqueIds);

  return new Map((data ?? []).map((row) => [row.id as string, String(row.name ?? "Usuário")]));
}

async function fetchLastMessages(requestIds: string[]) {
  if (requestIds.length === 0) return new Map<string, { message: string; created_at: string }>();

  const { data } = await supabase
    .from("quick_messages")
    .select("request_id, message, created_at")
    .in("request_id", requestIds)
    .order("created_at", { ascending: false });

  const map = new Map<string, { message: string; created_at: string }>();
  for (const row of data ?? []) {
    const requestId = String(row.request_id);
    if (!map.has(requestId)) {
      map.set(requestId, { message: String(row.message), created_at: String(row.created_at) });
    }
  }
  return map;
}

export async function fetchServiceChatThreads(userId: string, role: "cliente" | "prestador") {
  const column = role === "cliente" ? "client_id" : "provider_id";
  const { data, error } = await supabase
    .from("requests")
    .select(`
      id, status, client_id, provider_id, address_origin, address_dest, description,
      media_urls, needs_helper, price_final, price_estimated, scheduled_for, created_at,
      categories(name)
    `)
    .eq(column, userId)
    .not("provider_id", "is", null)
    .in("status", ["accepted", "en_route", "in_progress", "completed", "cancelled", "disputed"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as RequestRow[];
  const names = await fetchProfiles(rows.flatMap((row) => [row.client_id, row.provider_id ?? ""]));
  const lastMessages = await fetchLastMessages(rows.map((row) => row.id));

  return rows.map<ServiceChatThread>((row) => {
    const participantId = role === "cliente" ? row.provider_id ?? "" : row.client_id;
    const last = lastMessages.get(row.id);
    return {
      request_id: row.id,
      status: row.status,
      category: row.categories?.name ?? "Serviço",
      address_origin: row.address_origin,
      address_dest: row.address_dest,
      description: row.description,
      needs_helper: row.needs_helper,
      price: Number(row.price_final ?? row.price_estimated ?? 0) || null,
      scheduled_for: row.scheduled_for,
      created_at: row.created_at,
      participant_id: participantId,
      participant_name: names.get(participantId) ?? "Usuário",
      last_message: last?.message ?? null,
      last_message_at: last?.created_at ?? null,
      unread: 0,
    };
  });
}

export async function fetchServiceChatDetails(requestId: string, userId: string): Promise<ServiceChatDetails | null> {
  const { data, error } = await supabase
    .from("requests")
    .select(`
      id, status, client_id, provider_id, address_origin, address_dest, description,
      media_urls, needs_helper, price_final, price_estimated, scheduled_for, created_at,
      categories(name)
    `)
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as RequestRow;
  if (row.client_id !== userId && row.provider_id !== userId) return null;
  if (!row.provider_id) return null;

  const names = await fetchProfiles([row.client_id, row.provider_id]);
  const participantId = row.client_id === userId ? row.provider_id : row.client_id;

  return {
    request_id: row.id,
    status: row.status,
    category: row.categories?.name ?? "Serviço",
    address_origin: row.address_origin,
    address_dest: row.address_dest,
    description: row.description,
    media_urls: row.media_urls ?? [],
    needs_helper: row.needs_helper,
    price: Number(row.price_final ?? row.price_estimated ?? 0) || null,
    scheduled_for: row.scheduled_for,
    created_at: row.created_at,
    client_id: row.client_id,
    provider_id: row.provider_id,
    client_name: names.get(row.client_id) ?? "Cliente",
    provider_name: names.get(row.provider_id) ?? "Prestador",
    participant_id: participantId,
    participant_name: names.get(participantId) ?? "Usuário",
    last_message: null,
    last_message_at: null,
    unread: 0,
  };
}

export function chatInitials(name: string) {
  return formatParticipantInitials(name);
}
