import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  category: string;
  priority: "low" | "medium" | "high";
  user_name: string;
  user_email: string;
  created_at: string;
}

const STATUS = {
  open: { label: "Aberto", cls: "bg-red-100 text-red-700" },
  in_progress: { label: "Em andamento", cls: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolvido", cls: "bg-green-100 text-green-700" },
  closed: { label: "Fechado", cls: "bg-slate-100 text-slate-500" },
};

const PRIORITY = {
  low: { label: "Baixa", cls: "text-slate-400" },
  medium: { label: "Média", cls: "text-yellow-600" },
  high: { label: "Alta", cls: "text-red-600 font-bold" },
};

export function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("open");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, title, description, status, category, priority, created_at, profiles(name, email)")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError("Não foi possível carregar os tickets. Recarregue a página.");
        setLoading(false);
        return;
      }

      if (data) {
        setTickets(
          data.map((row: any) => ({
            id: row.id,
            title: sanitizeText(row.title ?? "Sem título"),
            description: sanitizeText(row.description ?? ""),
            status: (row.status ?? "open") as TicketStatus,
            category: sanitizeText(row.category ?? ""),
            priority: (row.priority ?? "medium") as Ticket["priority"],
            user_name: sanitizeText(row.profiles?.name ?? ""),
            user_email: sanitizeText(row.profiles?.email ?? ""),
            created_at: row.created_at,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  async function updateTicketStatus(id: string, nextStatus: TicketStatus) {
    if (actioning) return;
    setActioning(true);
    setActionError(null);

    const previousStatus = tickets.find((t) => t.id === id)?.status;

    /* Optimistic update */
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
    if (selected?.id === id) setSelected((p) => p ? { ...p, status: nextStatus } : p);

    const { error } = await supabase
      .from("support_tickets")
      .update({ status: nextStatus })
      .eq("id", id);

    if (error) {
      /* Rollback on failure */
      if (previousStatus) {
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: previousStatus } : t)));
        if (selected?.id === id) setSelected((p) => p ? { ...p, status: previousStatus } : p);
      }
      setActionError("Não foi possível atualizar o status. Tente novamente.");
    }

    setActioning(false);
  }

  const filtered = tickets.filter((t) => statusFilter === "all" || t.status === statusFilter);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex w-96 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h1 className="text-lg font-bold text-slate-900">Tickets de Suporte</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["all", "open", "in_progress", "resolved", "closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === s ? "bg-yellow-400 text-slate-900" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {s === "all" ? "Todos" : STATUS[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
            </div>
          ) : loadError ? (
            <div className="p-4 text-center text-sm text-red-600">{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <span className="text-3xl">🎉</span>
              <span className="text-sm">Sem tickets aqui</span>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => { setSelected(t); setActionError(null); }}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 ${selected?.id === t.id ? "bg-yellow-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex-1 font-medium leading-snug text-slate-900">{t.title}</span>
                      <span className={`text-xs ${PRIORITY[t.priority].cls}`}>{PRIORITY[t.priority].label}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS[t.status].cls}`}>
                        {STATUS[t.status].label}
                      </span>
                      <span className="text-xs text-slate-400">{t.user_name || "—"}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <span className="text-5xl">🎫</span>
            <span className="text-sm">Selecione um ticket para ver detalhes</span>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${STATUS[selected.status].cls}`}>
                {STATUS[selected.status].label}
              </span>
              <span className={`text-xs font-medium ${PRIORITY[selected.priority].cls}`}>
                Prioridade {PRIORITY[selected.priority].label}
              </span>
            </div>
            <h2 className="mb-1 text-xl font-bold text-slate-900">{selected.title}</h2>
            <p className="mb-4 text-sm text-slate-500">
              {selected.user_name || "—"} · {selected.user_email || "—"} ·{" "}
              {new Date(selected.created_at).toLocaleString("pt-BR")}
            </p>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {/* Content is sanitized in load(); whitespace-pre-line is safe on sanitized text */}
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {selected.description || "Sem descrição."}
              </p>
            </div>

            {actionError && (
              <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <span className="text-red-500">⚠</span>
                <p className="text-sm text-red-700">{actionError}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map((s) => (
                <button
                  key={s}
                  disabled={selected.status === s || actioning}
                  onClick={() => updateTicketStatus(selected.id, s)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${
                    selected.status === s
                      ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {STATUS[s].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
