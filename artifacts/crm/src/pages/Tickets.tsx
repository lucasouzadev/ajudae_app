import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";

type TicketStatus = "open" | "in_review" | "resolved" | "closed";

interface Ticket {
  id: string;
  reason: string;
  description: string;
  notes_admin: string;
  status: TicketStatus;
  user_name: string;
  created_at: string;
}

const STATUS = {
  open: { label: "Aberto", cls: "bg-red-100 text-red-700" },
  in_review: { label: "Em análise", cls: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolvido", cls: "bg-green-100 text-green-700" },
  closed: { label: "Fechado", cls: "bg-slate-100 text-slate-500" },
};

export function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("open");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, reason, description, notes_admin, status, created_at, profiles!tickets_opened_by_fkey(name)")
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
            reason: sanitizeText(row.reason ?? "Sem motivo"),
            description: sanitizeText(row.description ?? ""),
            notes_admin: sanitizeText(row.notes_admin ?? ""),
            status: (row.status ?? "open") as TicketStatus,
            user_name: sanitizeText(row.profiles?.name ?? ""),
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

    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
    if (selected?.id === id) setSelected((p) => p ? { ...p, status: nextStatus } : p);

    const { error } = await supabase
      .from("tickets")
      .update({ status: nextStatus })
      .eq("id", id);

    if (error) {
      if (previousStatus) {
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: previousStatus } : t)));
        if (selected?.id === id) setSelected((p) => p ? { ...p, status: previousStatus } : p);
      }
      setActionError("Não foi possível atualizar o status. Tente novamente.");
    }

    setActioning(false);
  }

  const filtered = tickets.filter((t) => statusFilter === "all" || t.status === statusFilter);

  function selectTicket(t: Ticket) {
    setSelected(t);
    setActionError(null);
    setShowDetail(true);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* List panel */}
      <div className={`flex flex-col overflow-hidden border-r border-slate-200 bg-white ${showDetail ? "hidden md:flex md:w-96 md:flex-shrink-0" : "w-full md:w-96 md:flex-shrink-0"}`}>
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <h1 className="text-lg font-bold text-slate-900">Tickets de Suporte</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["all", "open", "in_review", "resolved", "closed"] as const).map((s) => (
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
                    onClick={() => selectTicket(t)}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 ${selected?.id === t.id ? "bg-yellow-50" : ""}`}
                  >
                    <div className="font-medium leading-snug text-slate-900 line-clamp-2">{t.reason}</div>
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

      {/* Detail panel */}
      <div className={`flex-1 overflow-y-auto ${showDetail ? "block" : "hidden md:block"}`}>
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <span className="text-5xl">🎫</span>
            <span className="text-sm">Selecione um ticket para ver detalhes</span>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl p-4 sm:p-8">
            {/* Mobile back button */}
            <button
              onClick={() => setShowDetail(false)}
              className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 md:hidden"
            >
              ← Voltar
            </button>

            <div className="mb-2">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${STATUS[selected.status].cls}`}>
                {STATUS[selected.status].label}
              </span>
            </div>
            <h2 className="mb-1 text-xl font-bold text-slate-900">{selected.reason}</h2>
            <p className="mb-4 text-sm text-slate-500">
              {selected.user_name || "—"} · {new Date(selected.created_at).toLocaleString("pt-BR")}
            </p>

            {selected.description && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Descrição</div>
                {/* Content is sanitized in load(); whitespace-pre-line is safe on sanitized text */}
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {selected.description}
                </p>
              </div>
            )}

            {selected.notes_admin && (
              <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-yellow-700">Notas internas</div>
                <p className="whitespace-pre-line text-sm text-slate-700">{selected.notes_admin}</p>
              </div>
            )}

            {actionError && (
              <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <span className="text-red-500">⚠</span>
                <p className="text-sm text-red-700">{actionError}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(["open", "in_review", "resolved", "closed"] as TicketStatus[]).map((s) => (
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
