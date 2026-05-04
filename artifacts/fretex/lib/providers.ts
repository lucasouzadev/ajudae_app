import { supabase } from './supabase';
import { CATEGORY_COLORS, type Category, type Provider } from '../constants/mockData';

// ─── Shape retornado pelo Supabase (tipado localmente) ─────────────────────────
interface ProviderRow {
  id: string;
  active: boolean;
  verified: boolean;
  bio?: string;
  location_lat?: number;
  location_lng?: number;
  vehicle_type?: string;
  vehicle_plate?: string;  // presente somente em fetchProviderById
  vehicle_model?: string;
  rating_avg?: number;
  rating_count?: number;
  service_type?: string;
  profiles?: { name?: string } | null;  // LEFT JOIN — pode ser null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapVehicle(vehicleType?: string): string {
  const map: Record<string, string> = {
    car: 'Carro',
    utility: 'Utilitário',
    van: 'Van',
    truck_small: 'Caminhão Pequeno',
    truck_large: 'Caminhão Grande',
  };
  return map[vehicleType ?? ''] ?? 'Veículo';
}

function mapCategory(serviceType?: string): Category {
  const map: Record<string, Category> = {
    frete: 'Frete',
    mudanca: 'Mudança',
    entrega: 'Entrega',
  };
  return map[serviceType ?? ''] ?? 'Frete';
}

// Mapeamento único — evita duplicação entre as duas funções
function mapRowToProvider(row: ProviderRow): Provider {
  const name = row.profiles?.name ?? 'Prestador';
  const cat = mapCategory(row.service_type);
  const color = CATEGORY_COLORS[cat] ?? '#FF5500';
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return {
    id: row.id,
    name,
    ini: initials,
    vehicle: mapVehicle(row.vehicle_type),
    cat,
    rating: Number(row.rating_avg ?? 0),
    jobs: Number(row.rating_count ?? 0),
    price: 'Consultar',
    priceFrom: 0,
    lat: Number(row.location_lat ?? 0),
    lng: Number(row.location_lng ?? 0),
    color,
    area: '',
    km: 0,
    helpers: 0,
    equipment: [],
    // vehicle_plate exposta apenas quando vinda de fetchProviderById
    model: row.vehicle_model ?? '',
    plate: row.vehicle_plate ?? '',
    workShift: '',
    responseTime: '',
    completionRate: '',
    acceptanceRate: '',
    bio: row.bio ?? '',
    workAreas: [],
    isOnline: Boolean(row.active),
    reviews: [],
    recentServices: [],
  };
}

// ─── Listagem pública (mapa / marketplace) ─────────────────────────────────────
// Omite vehicle_plate e vehicle_model — dados sensíveis desnecessários para listagem
// Usa LEFT JOIN (profiles) para não descartar providers com perfil inconsistente
export async function fetchOnlineProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select(`
      id, active, verified, bio, location_lat, location_lng,
      vehicle_type, rating_avg, rating_count, service_type,
      profiles(name)
    `)
    .eq('active', true)
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null);

  if (error) {
    console.warn('[providers] fetchOnlineProviders error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRowToProvider(row as ProviderRow));
}

// ─── Detalhe do provider (perfil completo) ─────────────────────────────────────
// Inclui vehicle_plate — exibida apenas após o cliente iniciar contratação
export async function fetchProviderById(id: string): Promise<Provider | null> {
  const { data, error } = await supabase
    .from('providers')
    .select(`
      id, active, verified, bio, location_lat, location_lng,
      vehicle_type, vehicle_plate, vehicle_model, rating_avg, rating_count,
      service_type,
      profiles(name)
    `)
    .eq('id', id)
    .maybeSingle();  // maybeSingle retorna null (sem error) quando não encontrado

  if (error) {
    console.warn('[providers] fetchProviderById error:', error.message);
    return null;
  }
  if (!data) return null;

  return mapRowToProvider(data as ProviderRow);
}
