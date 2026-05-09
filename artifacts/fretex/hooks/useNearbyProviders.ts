import { useEffect, useState } from 'react';
import { supabase, type ProviderRow } from '@/lib/supabase';

/**
 * Haversine distance calculation between two geographic points
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface NearbyProvider extends ProviderRow {
  distance_km?: number;
}

export interface UseNearbyProvidersOptions {
  /**
   * User's current latitude
   */
  latitude: number;
  /**
   * User's current longitude
   */
  longitude: number;
  /**
   * Search radius in kilometers (default: 5)
   */
  radius_km?: number;
  /**
   * Filter by service category (optional)
   */
  category_id?: string;
  /**
   * Auto-fetch on mount and when params change
   */
  enabled?: boolean;
}

export interface UseNearbyProvidersResult {
  providers: NearbyProvider[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch nearby providers from Supabase with geolocation filtering
 *
 * Usage:
 * ```typescript
 * const { providers, loading, error, refetch } = useNearbyProviders({
 *   latitude: -22.9068,
 *   longitude: -43.1729,
 *   radius_km: 5,
 * });
 * ```
 *
 * Notes:
 * - Fetches verified & active providers only
 * - Calculates distance using Haversine formula
 * - Sorts by distance (nearest first)
 * - Can filter by category_id if needed
 */
export function useNearbyProviders(
  options: UseNearbyProvidersOptions,
): UseNearbyProvidersResult {
  const {
    latitude,
    longitude,
    radius_km = 5,
    category_id,
    enabled = true,
  } = options;

  const [providers, setProviders] = useState<NearbyProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProviders = async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Query all verified & active providers
      // Filtering by distance is done client-side (Supabase geography type not supported in all plans)
      let query = supabase
        .from('providers')
        .select('*')
        .eq('verified', true)
        .eq('active', true);

      // Optional category filter (would need a category relationship)
      // if (category_id) {
      //   query = query.eq('category_id', category_id);
      // }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Filter by distance and sort
      const nearby = (data || [])
        .filter((provider: ProviderRow) => provider.location_lat !== undefined && provider.location_lng !== undefined)
        .map((provider: ProviderRow) => {
          const distance = haversineDistance(
            latitude,
            longitude,
            provider.location_lat as number,
            provider.location_lng as number,
          );
          return {
            ...provider,
            distance_km: distance,
          };
        })
        .filter((provider: NearbyProvider) => provider.distance_km! <= radius_km)
        .sort((a: NearbyProvider, b: NearbyProvider) => (a.distance_km || 0) - (b.distance_km || 0));

      setProviders(nearby);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error fetching nearby providers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when params change
  useEffect(() => {
    if (enabled) {
      fetchProviders();
    }
  }, [latitude, longitude, radius_km, category_id, enabled]);

  return {
    providers,
    loading,
    error,
    refetch: fetchProviders,
  };
}

/**
 * Hook to fetch a single provider by ID
 */
export function useProvider(providerId: string | undefined) {
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!providerId) return;

    const fetchProvider = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('providers')
          .select('*')
          .eq('id', providerId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        setProvider(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error('Error fetching provider:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [providerId]);

  return { provider, loading, error };
}
