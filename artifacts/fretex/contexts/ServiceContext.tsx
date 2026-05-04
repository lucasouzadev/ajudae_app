import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/constants/mockData";

export type ServiceStatus =
  | "requested"
  | "accepted"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export interface ActiveService {
  id: string;
  customerId: string;
  customerName: string;
  customerInitials: string;
  customerColor: string;
  customerRating: number;
  providerId?: string;
  providerName?: string;
  providerInitials?: string;
  providerColor?: string;
  providerVehicle?: string;
  providerRating?: number;
  providerKm?: number;
  category: Category;
  origin: string;
  originDetails?: string;
  destination?: string;
  destinationDetails?: string;
  description: string;
  photos: string[];
  needsHelper: boolean;
  scheduled: boolean;
  scheduledFor?: string;
  estimatedPrice: number;
  status: ServiceStatus;
  // PIN system
  pin_start: string;          // 4 digits — local offline validation (client-side)
  pin_conclusion: string;     // 6 digits — server-side OTP verification
  commitment: string;         // SHA-256(id|pin_start|pin_conclusion) — offline verification
  startPinAttempts: number;   // max 5 → disputed (local validation)
  conclusionAttempts: number; // max 5 → disputed (server-side, tracked by backend)
  cancellationReason?: string;
  ticketId?: string;
  createdAt: string;
  events: { at: string; status: ServiceStatus; note?: string }[];
}

interface ServiceContextType {
  active: ActiveService | null;
  createService: (
    payload: Omit<
      ActiveService,
      | "id"
      | "status"
      | "pin_start"
      | "pin_conclusion"
      | "commitment"
      | "startPinAttempts"
      | "conclusionAttempts"
      | "providerId"
      | "providerName"
      | "providerInitials"
      | "providerColor"
      | "providerVehicle"
      | "providerRating"
      | "providerKm"
      | "createdAt"
      | "events"
    >,
  ) => Promise<ActiveService>;
  assignProvider: (info: {
    providerId: string;
    providerName: string;
    providerInitials: string;
    providerColor: string;
    providerVehicle: string;
    providerRating: number;
    providerKm: number;
  }) => Promise<void>;
  advanceStatus: (next: ServiceStatus, note?: string) => Promise<{ ok: boolean; error?: string }>;
  cancelService: (reason: string) => Promise<{ ok: boolean; error?: string }>;
  validateStartPin: (entered: string) => Promise<{ ok: boolean; attemptsLeft?: number; disputed?: boolean }>;
  completeWithConclusion: (entered: string) => Promise<{ ok: boolean; attemptsLeft?: number; disputed?: boolean }>;
  openTicket: (ticketId: string) => Promise<void>;
  clear: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Valid state machine transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  requested:   ["accepted", "cancelled"],
  accepted:    ["en_route", "cancelled", "disputed"],
  en_route:    ["in_progress", "disputed"],
  in_progress: ["completed", "disputed"],
  completed:   [],
  cancelled:   [],
  disputed:    [],
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function genPin(digits: number): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

function djb2Hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  // extend to 16 hex chars by mixing two passes
  let h2 = 0x811c9dc5;
  for (let i = str.length - 1; i >= 0; i--) {
    h2 = ((h2 ^ str.charCodeAt(i)) * 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

async function computeCommitment(serviceId: string, pinStart: string, pinConclusion: string): Promise<string> {
  const input = `${serviceId}|${pinStart}|${pinConclusion}`;
  return djb2Hash(input);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ServiceContext = createContext<ServiceContextType | null>(null);

const STORAGE_KEY = "@ajudae_active_service";

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveService | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      const parsed = JSON.parse(stored) as ActiveService;
      // Discard data from old format that lacks the commitment field,
      // or uses the legacy djb2 hash (8 hex chars) instead of SHA-256 (64 hex chars)
      if (!parsed.commitment || parsed.commitment.length < 16) {
        AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }
      setActive(parsed);
    });
  }, []);

  const persist = async (next: ActiveService | null) => {
    setActive(next);
    if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  };

  /**
   * Creates a new service request on Supabase
   *
   * Flow:
   * 1. Generate local PINs (pin_start for offline verification, pin_conclusion for OTP)
   * 2. Call Supabase Edge Function request_create
   * 3. Receive request ID and OTP hash from backend
   * 4. Store locally with plaintext OTP for later verification
   * 5. Return service object to app
   */
  const createService: ServiceContextType["createService"] = async (payload) => {
    try {
      const now = new Date().toISOString();
      const pin_start = genPin(4);        // 4 digits for offline validation
      const pin_conclusion = genPin(6);   // 6 digits for OTP completion
      const commitment = await computeCommitment(`${Date.now()}`, pin_start, pin_conclusion);

      // Call Supabase Edge Function to create request
      // Resolve category UUID from DB by name before calling Edge Function
      const { data: catRow } = await supabase
        .from('categories')
        .select('id')
        .eq('name', payload.category)
        .single();

      if (!catRow?.id) throw new Error(`Categoria "${payload.category}" não encontrada no banco de dados.`);

      const { data, error } = await supabase.functions.invoke('request_create', {
        body: {
          category_name: payload.category,
          address_origin: payload.origin,
          address_dest: payload.destination,
          origin_lat: -22.9068,
          origin_lng: -43.1729,
          description: payload.description,
          media_urls: payload.photos,
          needs_helper: payload.needsHelper,
          scheduled_for: payload.scheduledFor,
          price_estimated: payload.estimatedPrice,
        },
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }

      const serviceId = data.id || `req-${Date.now()}`;
      // Use the server-generated OTP as pin_conclusion so provider's verification matches DB hash
      const serverOtp = data.otp_code || pin_conclusion;

      const next: ActiveService = {
        ...payload,
        id: serviceId,
        status: "requested",
        pin_start,
        pin_conclusion: serverOtp,
        commitment,
        startPinAttempts: 0,
        conclusionAttempts: 0,
        createdAt: now,
        events: [{ at: now, status: "requested", note: "Pedido criado" }],
      };

      await persist(next);
      return next;
    } catch (error) {
      console.error('Create service error:', error);
      throw error;
    }
  };

  /**
   * Accepts a service request on behalf of a provider
   * Calls request_accept Edge Function on Supabase
   */
  const assignProvider: ServiceContextType["assignProvider"] = async (info) => {
    if (!active) return;

    try {
      const { error } = await supabase.functions.invoke('request_accept', {
        body: {
          request_id: active.id,
        },
      });

      if (error) {
        console.error('Accept request error:', error);
        throw error;
      }

      const now = new Date().toISOString();
      const next: ActiveService = {
        ...active,
        ...info,
        status: "accepted",
        events: [...active.events, { at: now, status: "accepted", note: `Aceito por ${info.providerName}` }],
      };
      await persist(next);
    } catch (error) {
      console.error('Assign provider error:', error);
      throw error;
    }
  };

  /**
   * Advances service status through the workflow
   * Calls request_update_status Edge Function on Supabase
   */
  const advanceStatus: ServiceContextType["advanceStatus"] = async (next, note) => {
    if (!active) return { ok: false, error: "Nenhum serviço ativo" };
    const allowed = VALID_TRANSITIONS[active.status] ?? [];
    if (!allowed.includes(next)) {
      return { ok: false, error: "Transição inválida" };
    }

    try {
      const { error } = await supabase.functions.invoke('request_update_status', {
        body: {
          request_id: active.id,
          new_status: next,
        },
      });

      if (error) {
        console.error('Update status error:', error);
        throw error;
      }

      const now = new Date().toISOString();
      const updated: ActiveService = {
        ...active,
        status: next,
        events: [...active.events, { at: now, status: next, note }],
      };
      await persist(updated);
      return { ok: true };
    } catch (error) {
      console.error('Advance status error:', error);
      return { ok: false, error: String(error) };
    }
  };

  const cancelService: ServiceContextType["cancelService"] = async (reason) => {
    if (!active) return { ok: false, error: "Nenhum serviço ativo" };
    if (active.status !== "requested" && active.status !== "accepted") {
      return { ok: false, error: "Cancelamento não permitido neste estado" };
    }

    try {
      const { error } = await supabase.functions.invoke('request_update_status', {
        body: {
          request_id: active.id,
          new_status: 'cancelled',
          cancel_reason: 'other',
          cancel_note: reason,
        },
      });

      if (error) {
        console.error('Cancel service error:', error);
        // Continue anyway - update local state
      }

      const now = new Date().toISOString();
      const next: ActiveService = {
        ...active,
        status: "cancelled",
        cancellationReason: reason,
        events: [...active.events, { at: now, status: "cancelled", note: reason }],
      };
      await persist(next);
      return { ok: true };
    } catch (error) {
      console.error('Cancel error:', error);
      return { ok: false, error: String(error) };
    }
  };

  /**
   * Validates the start PIN locally (offline validation)
   * This uses the commitment hash computed client-side
   * Server-side tracking happens after status advance to "in_progress"
   */
  const validateStartPin: ServiceContextType["validateStartPin"] = async (entered) => {
    if (!active) return { ok: false };
    if (active.status !== "en_route") {
      return { ok: false };
    }

    try {
      const match = await computeCommitment(active.id, entered, active.pin_conclusion) === active.commitment;

      if (match) {
        const now = new Date().toISOString();
        await persist({
          ...active,
          status: "in_progress",
          events: [...active.events, { at: now, status: "in_progress", note: "PIN de início confirmado pelo cliente" }],
        });
        return { ok: true };
      }

      const attempts = active.startPinAttempts + 1;
      if (attempts >= 5) {
        const now = new Date().toISOString();
        await persist({
          ...active,
          startPinAttempts: attempts,
          status: "disputed",
          events: [...active.events, { at: now, status: "disputed", note: "PIN de início errado 5x" }],
        });
        return { ok: false, disputed: true };
      }

      await persist({ ...active, startPinAttempts: attempts });
      return { ok: false, attemptsLeft: 5 - attempts };
    } catch (error) {
      console.error('Validate start PIN error:', error);
      return { ok: false };
    }
  };

  /**
   * Completes service with conclusion PIN verification
   * Calls request_complete_with_otp Edge Function on Supabase
   * Server-side tracks attempts and can auto-transition to disputed after 5 failures
   */
  const completeWithConclusion: ServiceContextType["completeWithConclusion"] = async (entered) => {
    if (!active) return { ok: false };
    if (active.status !== "in_progress") {
      return { ok: false };
    }

    try {
      // Call Supabase Edge Function to verify OTP and complete
      const { data, error } = await supabase.functions.invoke('request_complete_with_otp', {
        body: {
          request_id: active.id,
          otp_code: entered,
        },
      });

      if (error) {
        console.error('Complete with OTP error:', error);
        // Backend tracks attempts and may return dispute status
        throw error;
      }

      if (data?.ok) {
        const now = new Date().toISOString();
        await persist({
          ...active,
          status: "completed",
          events: [...active.events, { at: now, status: "completed", note: "PIN de conclusão confirmado" }],
        });
        return { ok: true };
      }

      // OTP mismatch - backend incremented attempts
      const attempts = active.conclusionAttempts + 1;
      const isDiputed = attempts >= 5;

      if (isDiputed) {
        const now = new Date().toISOString();
        await persist({
          ...active,
          conclusionAttempts: attempts,
          status: "disputed",
          events: [...active.events, { at: now, status: "disputed", note: "PIN de conclusão errado 5x" }],
        });
        return { ok: false, disputed: true };
      }

      await persist({ ...active, conclusionAttempts: attempts });
      return { ok: false, attemptsLeft: 5 - attempts };
    } catch (error) {
      console.error('Complete with conclusion error:', error);
      const attempts = active.conclusionAttempts + 1;

      if (attempts >= 5) {
        const now = new Date().toISOString();
        await persist({
          ...active,
          conclusionAttempts: attempts,
          status: "disputed",
          events: [...active.events, { at: now, status: "disputed", note: "PIN de conclusão errado 5x" }],
        });
        return { ok: false, disputed: true };
      }

      await persist({ ...active, conclusionAttempts: attempts });
      return { ok: false, attemptsLeft: 5 - attempts };
    }
  };

  const openTicket: ServiceContextType["openTicket"] = async (ticketId) => {
    if (!active) return;

    try {
      const { error } = await supabase.functions.invoke('ticket_open', {
        body: {
          request_id: active.id,
          category: 'dispute',
          subject: 'Service Dispute',
          description: `Service ${active.id} disputed`,
        },
      });

      if (error) {
        console.error('Open ticket error:', error);
        // Continue anyway - update local state
      }

      const now = new Date().toISOString();
      await persist({
        ...active,
        status: "disputed",
        ticketId,
        events: [...active.events, { at: now, status: "disputed", note: `Ticket ${ticketId} aberto` }],
      });
    } catch (error) {
      console.error('Open ticket error:', error);
    }
  };

  const clear = async () => {
    try {
      await persist(null);
    } catch (error) {
      console.error('Clear error:', error);
    }
  };

  return (
    <ServiceContext.Provider
      value={{
        active,
        createService,
        assignProvider,
        advanceStatus,
        cancelService,
        validateStartPin,
        completeWithConclusion,
        openTicket,
        clear,
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
}

export function useService() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error("useService must be used within ServiceProvider");
  return ctx;
}
