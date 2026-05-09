import { supabase } from "./supabase";

export async function toggleProviderActive(active: boolean, location?: { lat: number; lng: number }) {
  const { data, error } = await supabase.functions.invoke("provider_toggle_active", {
    body: {
      active,
      ...(active && location ? { location_lat: location.lat, location_lng: location.lng } : {}),
    },
  });

  if (error) throw new Error(error.message || "Não foi possível atualizar disponibilidade");
  if (data?.error) throw new Error(String(data.error));

  return data as {
    provider_id: string;
    active: boolean;
    updated_at: string;
  };
}
