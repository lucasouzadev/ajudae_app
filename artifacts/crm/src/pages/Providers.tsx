import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ValidationStatus = "not_started" | "submitted" | "approved" | "rejected";

interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  onboarding_status: ValidationStatus;
  active: boolean;
  rating_avg: number;
  created_at: string;
}

const STATUS_LABELS: Record<ValidationStatus, { label: string; cls: string }> = {
  not_started: { label: "Não enviou", cls: "bg-slate-100 text-slate-600" },
  submitted: { label: "Aguardando análise", cls: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Aprovado", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Reprovado", cls: "bg-red-100 text-red-700" },
};

export function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ValidationStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("providers")
        .select("id, active, rating_avg, service_type, onboarding_status, created_at, profiles(id, name, email, phone)")
        .order("created_at", { ascending: false });

      if (data) {
        setProviders(
          data.map((row: any) => ({
            id: row.id,
            name: row.profiles?.name ?? "—",
            email: row.profiles?.email ?? "—",
            phone: row.profiles?.phone ?? "—",
            service_type: row.service_type ?? "—",
            onboarding_status: (row.onboarding_status ?? "not_started") as ValidationStatus,
            active: row.active,
            rating_avg: row.rating_avg ?? 0,
            created_at: row.created_at,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = providers.filter((p) => {
    const matchesFilter = filter === "all" || p.onboarding_status === filter;
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Prestadores</h1>
        <p className="text-sm text-slate-500">Gerencie e valide os cadastros de prestadores</p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
        />
        <div className="flex gap-2">
          {(["all", "submitted", "approved", "rejected", "not_started"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === s
                  ? "bg-yellow-400 text-slate-900"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "Todos" : STATUS_LABELS[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <span className="text-4xl">🚚</span>
            <span className="text-sm">Nenhum prestador encontrado</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Serviço</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Online</th>
                <th className="px-5 py-3">Rating</th>
                <th className="px-5 py-3">Cadastro</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const st = STATUS_LABELS[p.onboarding_status];
                return (
                  <tr key={p.id} className={`border-b border-slate-50 transition hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.email}</div>
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-600">{p.service_type}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block h-2 w-2 rounded-full ${p.active ? "bg-green-400" : "bg-slate-300"}`} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {p.rating_avg > 0 ? `⭐ ${p.rating_avg.toFixed(1)}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={`/providers/${p.id}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-yellow-400 hover:bg-yellow-50"
                      >
                        Ver
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
