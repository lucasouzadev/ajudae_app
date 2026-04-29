import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

/**
 * Supabase client instance for Ajudaê React Native app
 * - Uses AsyncStorage for token persistence
 * - Configured for Expo (React Native)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Type definitions for database tables
 * Generated from Supabase schema
 */
export interface Profile {
  id: string;
  role: 'client' | 'provider';
  name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Provider extends Profile {
  verified: boolean;
  bio?: string;
  location_lat: number;
  location_lng: number;
  vehicle_type?: string;
  vehicle_plate?: string;
  capacity_kg?: number;
  rating_avg?: number;
  rating_count?: number;
  service_radius_km?: number;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  provider_id?: string;
  category_id: string;
  status: 'requested' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  address_origin: string;
  address_dest?: string;
  origin_lat?: number;
  origin_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  description?: string;
  media_urls?: string[];
  needs_helper: boolean;
  scheduled_for?: string;
  price_estimated?: number;
  price_final?: number;
  platform_fee?: number;
  otp_code_hash?: string;
  otp_expires_at?: string;
  cancel_reason?: string;
  cancel_note?: string;
  cancelled_by?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  request_id: string;
  rater_id: string;
  ratee_id: string;
  score: number; // 1-5
  comment?: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  request_id?: string;
  user_id: string;
  category: 'dispute' | 'damage' | 'lost_item' | 'other';
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  subject: string;
  description: string;
  created_at: string;
  resolved_at?: string;
}
