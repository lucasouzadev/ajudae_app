import { supabase } from "./supabase";
import type { Category } from "@/constants/mockData";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export interface ProposalCreateInput {
  provider_id: string;
  category_name: Category;
  address_origin: string;
  address_dest?: string;
  origin_lat?: number;
  origin_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  description?: string;
  media_urls?: string[];
  needs_helper?: boolean;
  price_proposed?: number;
  scheduled_for?: string;
}

export interface ProposalDecisionInput {
  proposal_id: string;
  decision: "accept" | "reject";
  scheduled_for?: string;
  decision_note?: string;
}

export interface ServiceProposalRow {
  id: string;
  client_id: string;
  provider_id: string;
  category_id: string;
  status: ProposalStatus;
  address_origin: string;
  address_dest?: string | null;
  description?: string | null;
  media_urls?: string[];
  needs_helper: boolean;
  price_proposed?: number | null;
  scheduled_for?: string | null;
  decision_note?: string | null;
  decided_at?: string | null;
  accepted_request_id?: string | null;
  expires_at: string;
  created_at: string;
  categories?: { name?: string | null } | null;
  client?: { name?: string | null } | null;
  provider?: {
    id: string;
    active?: boolean | null;
    verified?: boolean | null;
    profiles?: { name?: string | null } | null;
  } | null;
}

async function readEdgeErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : "Erro inesperado";
  const context = (error as { context?: unknown })?.context;

  if (context && typeof (context as Response).clone === "function") {
    try {
      const response = (context as Response).clone();
      const data = await response.json();
      if (typeof data?.error === "string") return data.error;
      if (typeof data?.message === "string") return data.message;
    } catch {
    }
  }

  return fallback;
}

export async function createProposal(input: ProposalCreateInput) {
  const { data, error } = await supabase.functions.invoke("proposal_create", {
    body: input,
  });

  if (error) throw new Error(await readEdgeErrorMessage(error));
  return data as { id: string; status: ProposalStatus; scheduled_for?: string | null; expires_at: string };
}

export async function decideProposal(input: ProposalDecisionInput) {
  const { data, error } = await supabase.functions.invoke("proposal_decide", {
    body: input,
  });

  if (error) throw new Error(await readEdgeErrorMessage(error));
  return data as {
    proposal_id: string;
    status: ProposalStatus;
    request_id?: string;
    request_status?: string;
    scheduled_for?: string | null;
    otp_code?: string;
  };
}

export async function listProposals() {
  const { data, error } = await supabase.functions.invoke("proposal_list", {
    body: {},
  });

  if (error) throw new Error(await readEdgeErrorMessage(error));
  return (data?.proposals ?? []) as ServiceProposalRow[];
}
