import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Category } from "@/constants/mockData";

export type ServiceStatus = "requested" | "accepted" | "en_route" | "in_progress" | "completed" | "cancelled" | "disputed";

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
  otp: string;
  otpAttempts: number;
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
      | "otp"
      | "otpAttempts"
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
  advanceStatus: (next: ServiceStatus, note?: string) => Promise<void>;
  cancelService: (reason: string) => Promise<void>;
  completeWithOtp: (entered: string) => Promise<{ ok: boolean; disputed?: boolean; remaining?: number }>;
  openTicket: (ticketId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

const STORAGE_KEY = "@ajudae_active_service";

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveService | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setActive(JSON.parse(stored));
    });
  }, []);

  const persist = async (next: ActiveService | null) => {
    setActive(next);
    if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const createService: ServiceContextType["createService"] = async (payload) => {
    const now = new Date().toISOString();
    const next: ActiveService = {
      ...payload,
      id: `req-${Date.now()}`,
      status: "requested",
      otp: genOtp(),
      otpAttempts: 0,
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

  const advanceStatus: ServiceContextType["advanceStatus"] = async (newStatus, note) => {
    if (!active) return;
    const now = new Date().toISOString();
    const next: ActiveService = {
      ...active,
      status: newStatus,
      events: [...active.events, { at: now, status: newStatus, note }],
    };
    await persist(next);
  };

  const cancelService: ServiceContextType["cancelService"] = async (reason) => {
    if (!active) return;
    const now = new Date().toISOString();
    const next: ActiveService = {
      ...active,
      status: "cancelled",
      cancellationReason: reason,
      events: [...active.events, { at: now, status: "cancelled", note: reason }],
    };
    await persist(next);
  };

  const completeWithOtp: ServiceContextType["completeWithOtp"] = async (entered) => {
    if (!active) return { ok: false };
    if (entered === active.otp) {
      const now = new Date().toISOString();
      const next: ActiveService = {
        ...active,
        status: "completed",
        events: [...active.events, { at: now, status: "completed", note: "PIN confirmado" }],
      };
      await persist(next);
      return { ok: true };
    }
    const attempts = active.otpAttempts + 1;
    if (attempts >= 5) {
      const now = new Date().toISOString();
      const next: ActiveService = {
        ...active,
        otpAttempts: attempts,
        status: "disputed",
        events: [...active.events, { at: now, status: "disputed", note: "PIN errado 5x" }],
      };
      await persist(next);
      return { ok: false, disputed: true };
    }
    await persist({ ...active, otpAttempts: attempts });
    return { ok: false, remaining: 5 - attempts };
  };

  const openTicket: ServiceContextType["openTicket"] = async (ticketId) => {
    if (!active) return;
    const now = new Date().toISOString();
    const next: ActiveService = {
      ...active,
      status: "disputed",
      ticketId,
      events: [...active.events, { at: now, status: "disputed", note: `Ticket ${ticketId} aberto` }],
    };
    await persist(next);
  };

  const clear = async () => {
    await persist(null);
  };

  return (
    <ServiceContext.Provider
      value={{ active, createService, assignProvider, advanceStatus, cancelService, completeWithOtp, openTicket, clear }}
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
