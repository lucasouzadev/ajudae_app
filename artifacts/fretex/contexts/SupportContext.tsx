import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type TicketStatus = "open" | "under_review" | "resolved";

export interface Ticket {
  id: string;
  reason: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
}

interface SupportContextType {
  tickets: Ticket[];
  createTicket: (reason: string, description: string) => Promise<string>;
}

const SupportContext = createContext<SupportContextType | null>(null);

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function normalizeStatus(status: string): TicketStatus {
  if (status === "in_review") return "under_review";
  if (status === "closed") return "resolved";
  if (status === "resolved") return "resolved";
  return "open";
}

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTickets([]);
      return;
    }

    const { data } = await supabase
      .from("tickets")
      .select("id, reason, description, status, created_at")
      .eq("opened_by", user.id)
      .order("created_at", { ascending: false });

    setTickets((data ?? []).map((ticket: any) => ({
      id: ticket.id,
      reason: ticket.reason,
      description: ticket.description ?? "",
      status: normalizeStatus(ticket.status),
      createdAt: ticket.created_at,
    })));
  };

  useEffect(() => {
    load().catch(() => setTickets([]));
  }, []);

  const createTicket = async (reason: string, description: string) => {
    if (!isUuid(reason)) throw new Error("Ticket precisa estar vinculado a um serviço");

    const { data, error } = await supabase.functions.invoke("ticket_open", {
      body: {
        request_id: reason,
        reason: description,
        media_urls: [],
      },
    });

    if (error) throw new Error(error.message || "Não foi possível abrir ticket");
    if (data?.error) throw new Error(String(data.error));
    await load();
    return String(data?.ticket_id ?? data?.id ?? "");
  };

  return (
    <SupportContext.Provider value={{ tickets, createTicket }}>
      {children}
    </SupportContext.Provider>
  );
}

export const useSupport = () => {
  const context = useContext(SupportContext);
  if (!context) throw new Error("useSupport must be used within SupportProvider");
  return context;
};
