import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
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
  // PIN system — both generated at service creation
  pin_start: string;          // 4 digits — provider displays, client enters at arrival
  pin_conclusion: string;     // 6 digits — client shows, provider enters at completion
  commitment: string;         // djb2(id|pin_start|pin_conclusion) — offline verification
  startPinAttempts: number;   // max 5 → disputed
  conclusionAttempts: number; // max 5 → disputed
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

function computeCommitment(serviceId: string, pinStart: string, pinConclusion: string): string {
  const input = `${serviceId}|${pinStart}|${pinConclusion}`;
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(h, 31) + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
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
      // Discard data from old format that lacks the commitment field
      if (!parsed.commitment) {
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

  const createService: ServiceContextType["createService"] = async (payload) => {
    const now = new Date().toISOString();
    const id = `req-${Date.now()}`;
    const pin_start = genPin(4);
    const pin_conclusion = genPin(6);
    const commitment = computeCommitment(id, pin_start, pin_conclusion);
    const next: ActiveService = {
      ...payload,
      id,
      status: "requested",
      pin_start,
      pin_conclusion,
      commitment,
      startPinAttempts: 0,
      conclusionAttempts: 0,
      createdAt: now,
      events: [{ at: now, status: "requested", note: "Pedido criado" }],
    };
    await persist(next);
    return next;
  };

  const assignProvider: ServiceContextType["assignProvider"] = async (info) => {
    if (!active) return;
    const now = new Date().toISOString();
    const next: ActiveService = {
      ...active,
      ...info,
      status: "accepted",
      events: [...active.events, { at: now, status: "accepted", note: `Aceito por ${info.providerName}` }],
    };
    await persist(next);
  };

  const advanceStatus: ServiceContextType["advanceStatus"] = async (next, note) => {
    if (!active) return { ok: false, error: "Nenhum serviço ativo" };
    const allowed = VALID_TRANSITIONS[active.status] ?? [];
    if (!allowed.includes(next)) {
      return { ok: false, error: "Transição inválida" };
    }
    const now = new Date().toISOString();
    const updated: ActiveService = {
      ...active,
      status: next,
      events: [...active.events, { at: now, status: next, note }],
    };
    await persist(updated);
    return { ok: true };
  };

  const cancelService: ServiceContextType["cancelService"] = async (reason) => {
    if (!active) return { ok: false, error: "Nenhum serviço ativo" };
    if (active.status !== "requested" && active.status !== "accepted") {
      return { ok: false, error: "Cancelamento não permitido neste estado" };
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
  };

  const validateStartPin: ServiceContextType["validateStartPin"] = async (entered) => {
    if (!active) return { ok: false };
    if (active.status !== "en_route") {
      return { ok: false };
    }
    const match = computeCommitment(active.id, entered, active.pin_conclusion) === active.commitment;
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
  };

  const completeWithConclusion: ServiceContextType["completeWithConclusion"] = async (entered) => {
    if (!active) return { ok: false };
    if (active.status !== "in_progress") {
      return { ok: false };
    }
    const match = computeCommitment(active.id, active.pin_start, entered) === active.commitment;
    if (match) {
      const now = new Date().toISOString();
      await persist({
        ...active,
        status: "completed",
        events: [...active.events, { at: now, status: "completed", note: "PIN de conclusão confirmado" }],
      });
      return { ok: true };
    }
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
  };

  const openTicket: ServiceContextType["openTicket"] = async (ticketId) => {
    if (!active) return;
    const now = new Date().toISOString();
    await persist({
      ...active,
      status: "disputed",
      ticketId,
      events: [...active.events, { at: now, status: "disputed", note: `Ticket ${ticketId} aberto` }],
    });
  };

  const clear = async () => {
    await persist(null);
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
