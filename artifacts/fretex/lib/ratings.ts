import { supabase } from "./supabase";

export async function submitServiceRating(requestId: string, stars: 1 | 2 | 3 | 4 | 5, comment?: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Usuário não autenticado");

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("id, client_id, provider_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) throw requestError;
  if (!request) throw new Error("Serviço não encontrado");
  if (request.client_id !== user.id) throw new Error("Apenas o cliente pode avaliar este serviço");
  if (!request.provider_id) throw new Error("Serviço sem prestador vinculado");
  if (request.status !== "completed") throw new Error("Avaliação disponível apenas após a conclusão");

  const { data, error } = await supabase
    .from("ratings")
    .insert({
      request_id: requestId,
      client_id: user.id,
      provider_id: request.provider_id,
      stars,
      comment: comment?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Este serviço já foi avaliado");
    throw error;
  }

  return data;
}
