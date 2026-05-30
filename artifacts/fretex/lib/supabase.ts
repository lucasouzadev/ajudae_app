import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY not set. ' +
    'All API calls will fail. Set these in EAS Secrets (production) or .env.local (local dev).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Enums (mirror of DB enums) ────────────────────────────────────────────

export type UserRole = 'client' | 'provider' | 'admin';

export type RequestStatus =
  | 'requested'
  | 'accepted'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'disputed';

export type CancelReason =
  | 'client_gave_up'
  | 'provider_unavailable'
  | 'wrong_address'
  | 'price_disagreement'
  | 'no_show'
  | 'other';

export type TicketStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export type VehicleType = 'car' | 'utility' | 'van' | 'truck_small' | 'truck_large';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
export type PaymentProvider = 'stripe' | 'mercado_pago';
export type ServiceProposalStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

// ─── Table types (match actual DB schema) ──────────────────────────────────

/** public.profiles — created automatically via handle_new_user trigger */
export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  phone?: string;
  cpf?: string;
  avatar_url?: string;
  is_active: boolean;
  lat?: number;
  lng?: number;
  lgpd_accepted: boolean;
  geolocation_requested: boolean;
  camera_requested: boolean;
  notifications_requested: boolean;
  theme_mode?: 'light' | 'dark';
  app_language?: 'pt-BR' | 'en-US' | 'es-ES';
  background_tracking_enabled?: boolean;
  notification_preferences?: {
    orders?: boolean;
    messages?: boolean;
    payments?: boolean;
    account?: boolean;
    marketing?: boolean;
  } | null;
  expo_push_token?: string | null;
  push_token_updated_at?: string | null;
  last_consent_update?: string;
  created_at: string;
  updated_at: string;
}

/** public.providers — separate table, FK → profiles.id */
export interface ProviderRow {
  id: string;
  verified: boolean;
  active: boolean;
  bio?: string;
  service_radius_km: number;
  location_lat?: number;
  location_lng?: number;
  location_updated_at?: string;
  vehicle_type?: VehicleType;
  vehicle_plate?: string;
  vehicle_capacity_kg?: number;
  vehicle_model?: string;
  vehicle_year?: number;
  service_type?: 'frete' | 'mudanca' | 'entrega';
  service_category?: string;
  rating_avg: number;
  rating_count: number;
  onboarding_status: 'incomplete' | 'submitted' | 'approved' | 'rejected';
  cpf?: string;
  birth_date?: string;
  contact_method?: 'ligacao' | 'whatsapp';
  contact_availability?: string;
  doc_rg_url?: string;
  doc_residence_url?: string;
  doc_cnh_url?: string;
  doc_crlv_url?: string;
  doc_selfie_url?: string;
  kyc_status: 'not_started' | 'in_progress' | 'approved' | 'manual_review' | 'rejected';
  kyc_report_id?: string;
  kyc_completed_at?: string;
  kyc_score?: number;
  submitted_at?: string;
  validation_notes?: string;
  rejection_reason?: string;
  rejection_until?: string;
  created_at: string;
  updated_at: string;
}

/** public.categories */
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  active: boolean;
  created_at: string;
}

/** public.requests */
export interface ServiceRequest {
  id: string;
  client_id: string;
  provider_id?: string;
  category_id: string;
  status: RequestStatus;
  address_origin: string;
  address_dest?: string;
  origin_lat?: number;
  origin_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  description?: string;
  media_urls: string[];
  needs_helper: boolean;
  scheduled_for?: string;
  price_estimated?: number;
  price_final?: number;
  platform_fee?: number;
  otp_code_hash?: string;
  otp_expires_at?: string;
  cancel_reason?: CancelReason;
  cancel_note?: string;
  cancelled_by?: string;
  expires_at: string;
  payment_status?: PaymentStatus;
  payment_provider?: PaymentProvider;
  payment_provider_id?: string;
  payment_intent_id?: string;
  payment_checkout_url?: string;
  payment_qr_code?: string;
  payment_qr_code_base64?: string;
  payment_expires_at?: string;
  payment_captured_at?: string;
  payment_amount?: number;
  payment_error?: string;
  payment_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** public.request_events — append-only audit log */
export interface RequestEvent {
  id: string;
  request_id: string;
  actor_id?: string;
  from_status?: RequestStatus;
  to_status: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface ServiceProposal {
  id: string;
  client_id: string;
  provider_id: string;
  category_id: string;
  status: ServiceProposalStatus;
  address_origin: string;
  address_dest?: string;
  origin_lat?: number;
  origin_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  description?: string;
  media_urls: string[];
  needs_helper: boolean;
  price_proposed?: number;
  scheduled_for?: string;
  decision_note?: string;
  decided_at?: string;
  accepted_request_id?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/** public.tickets */
export interface Ticket {
  id: string;
  request_id: string;
  opened_by: string;
  status: TicketStatus;
  reason: string;
  description?: string;
  media_urls: string[];
  resolved_by?: string;
  resolution?: string;
  notes_admin?: string;
  created_at: string;
  updated_at: string;
}

/** public.ratings */
export interface Rating {
  id: string;
  request_id: string;
  client_id: string;
  provider_id: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  created_at: string;
}

/** public.provider_locations */
export interface ProviderLocation {
  provider_id: string;
  lat: number;
  lng: number;
  heading?: number;
  accuracy_m?: number;
  captured_at: string;
  source: 'gps' | 'manual' | 'system';
}
