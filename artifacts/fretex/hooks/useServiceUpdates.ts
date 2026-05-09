import { useEffect, useCallback } from 'react';
import { supabase, ServiceRequest } from '@/lib/supabase';

/**
 * Real-time subscription to service request status updates
 *
 * Listens to changes on the requests table for a specific request ID
 * and calls the onUpdate callback when status or other fields change
 *
 * Usage:
 * ```typescript
 * useServiceUpdates(requestId, (updatedRequest) => {
 *   console.log('Service status changed:', updatedRequest.status);
 *   setServiceStatus(updatedRequest.status);
 * });
 * ```
 */
export function useServiceUpdates(
  requestId: string | null | undefined,
  onUpdate: (request: ServiceRequest) => void,
) {
  useEffect(() => {
    if (!requestId) return;

    // Subscribe to updates on this specific request
    const channel = supabase
      .channel(`request:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          // Payload.new contains the updated record
          if (payload.new) {
            onUpdate(payload.new as ServiceRequest);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`📡 Listening for updates on request ${requestId}`);
        } else if (status === 'CLOSED') {
          console.log(`📡 Unsubscribed from request ${requestId}`);
        }
      });

    // Cleanup: unsubscribe when component unmounts or requestId changes
    return () => {
      channel.unsubscribe();
    };
  }, [requestId, onUpdate]);
}

/**
 * Real-time subscription to new nearby requests
 *
 * Listens for new requests created by clients and filters by distance
 * Called by provider app to show new nearby jobs
 */
export function useNearbyRequests(
  providerLatitude: number,
  providerLongitude: number,
  serviceRadiusKm: number = 5,
  onNewRequest: (request: ServiceRequest) => void,
) {
  const haversineDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  useEffect(() => {
    // Subscribe to new requests (INSERT events)
    const channel = supabase
      .channel('new-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          filter: `status=eq.requested`, // Only new requests, not accepted ones
        },
        (payload) => {
          if (payload.new) {
            const request = payload.new as ServiceRequest;

            // Filter by distance
            if (request.origin_lat && request.origin_lng) {
              const distance = haversineDistance(
                providerLatitude,
                providerLongitude,
                request.origin_lat,
                request.origin_lng,
              );

              if (distance <= serviceRadiusKm) {
                console.log(`📍 New nearby request: ${request.address_origin} (${distance.toFixed(1)}km away)`);
                onNewRequest(request);
              }
            }
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Listening for new nearby requests');
        } else if (status === 'CLOSED') {
          console.log('📡 Stopped listening for new requests');
        }
      });

    // Cleanup
    return () => {
      channel.unsubscribe();
    };
  }, [providerLatitude, providerLongitude, serviceRadiusKm, onNewRequest, haversineDistance]);
}

/**
 * Real-time subscription to provider location updates
 *
 * Allows clients to track a provider's real-time location
 */
export function useProviderLocation(
  providerId: string | null | undefined,
  onLocationUpdate: (lat: number, lng: number) => void,
) {
  useEffect(() => {
    if (!providerId) return;

    // Subscribe to location updates
    const channel = supabase
      .channel(`provider-location:${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'provider_locations',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          if (payload.new) {
            const row = payload.new as { lat?: number; lng?: number };
            if (typeof row.lat === "number" && typeof row.lng === "number") {
              onLocationUpdate(row.lat, row.lng);
            }
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [providerId, onLocationUpdate]);
}

/**
 * Real-time subscription to ratings on a specific service
 *
 * Allows both client and provider to see ratings as they're posted
 */
export function useServiceRatings(
  requestId: string | null | undefined,
  onRatingAdded: (ratingCount: number) => void,
) {
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`ratings:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ratings',
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          // Query updated count
          supabase
            .from('ratings')
            .select('id', { count: 'exact' })
            .eq('request_id', requestId)
            .then(({ count }) => {
              if (count !== null) {
                onRatingAdded(count);
              }
            });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [requestId, onRatingAdded]);
}
