import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ServiceStatus = "draft" | "requested" | "matching" | "accepted" | "provider_en_route" | "provider_arrived" | "in_progress" | "completed_pending_confirmation" | "completed" | "cancelled" | "disputed";

export interface ServiceRequest {
  id: string;
  customerId: string;
  providerId?: string;
  providerName?: string;
  clientName?: string;
  status: ServiceStatus;
  origin: string;
  destination: string;
  price: number;
  serviceType: string;
  createdAt: string;
}

interface RequestsContextType {
  requests: ServiceRequest[];
  createRequest: (req: Omit<ServiceRequest, "id" | "createdAt" | "status">) => Promise<void>;
  updateStatus: (id: string, status: ServiceStatus) => Promise<void>;
}

const RequestsContext = createContext<RequestsContextType | null>(null);

function mapRequest(row: any): ServiceRequest {
  return {
    id: row.id,
    customerId: row.client_id,
    providerId: row.provider_id ?? undefined,
    providerName: row.provider?.profiles?.name ?? undefined,
    clientName: row.client?.name ?? undefined,
    status: row.status,
    origin: row.address_origin,
    destination: row.address_dest ?? "",
    price: Number(row.price_final ?? row.price_estimated ?? 0),
    serviceType: row.categories?.name ?? "Serviço",
    createdAt: row.created_at,
  };
}

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRequests([]);
      return;
    }

    const { data } = await supabase
      .from("requests")
      .select(`
        id, client_id, provider_id, status, address_origin, address_dest,
        price_final, price_estimated, created_at,
        categories(name),
        provider:providers!provider_id(profiles(name)),
        client:profiles!client_id(name)
      `)
      .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    setRequests((data ?? []).map(mapRequest));
  };

  useEffect(() => {
    load().catch(() => setRequests([]));
  }, []);

  const createRequest = async (_req: Omit<ServiceRequest, "id" | "createdAt" | "status">) => {
    await load();
  };

  const updateStatus = async (id: string, status: ServiceStatus) => {
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
  };

  return (
    <RequestsContext.Provider value={{ requests, createRequest, updateStatus }}>
      {children}
    </RequestsContext.Provider>
  );
}

export const useRequests = () => {
  const context = useContext(RequestsContext);
  if (!context) throw new Error("useRequests must be used within RequestsProvider");
  return context;
};
