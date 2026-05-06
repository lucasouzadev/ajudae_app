import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Stats {
  totalProviders: number;
  pendingValidation: number;
  openTickets: number;
  activeServices: number;
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${color}`}>
      <div className="mb-3 text-2xl" aria-hidden>{icon}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalProviders: 0, pendingValidation: 0, openTickets: 0, activeServices: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [providers, pending, tickets, services] = await Promise.all([
          supabase.from("providers").select("id", { count: "exact", head: true }),
          supabase.from("providers").select("id", { count: "exact", head: true }).eq("onboarding_status", "submitted"),
          supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("services").select("id", { count: "exact", head: true }).in("status", ["pending", "in_progress"]),
        ]);

        if (providers.error || pending.error || tickets.error || services.error) {
          setError("Não foi possível carregar os dados. Verifique a conexão e recarregue.");
          setLoading(false);
          return;
        }

        setStats({
          totalProviders: providers.count ?? 0,
          pendingValidation: pending.count ?? 0,
          openTickets: tickets.count ?? 0,
          activeServices: services.count ?? 0,
        });
      } catch {
        setError("Erro inesperado ao carregar o dashboard.");
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral da operação do Ajudaê</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <span className="text-red-500">⚠</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="🚚" label="Prestadores cadastrados" value={stats.totalProviders} color="border-slate-200" />
          <StatCard icon="⏳" label="Aguardando validação" value={stats.pendingValidation} color="border-yellow-200" />
          <StatCard icon="🎫" label="Tickets em aberto" value={stats.openTickets} color="border-red-100" />
          <StatCard icon="⚡" label="Serviços ativos" value={stats.activeServices} color="border-blue-100" />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-slate-900">Acesso rápido</h2>
        <p className="mb-4 text-sm text-slate-500">Navegue pelas seções do CRM.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/providers", icon: "🚚", label: "Ver prestadores" },
            { href: "/documents", icon: "📄", label: "Analisar documentos" },
            { href: "/tickets", icon: "🎫", label: "Gerenciar tickets" },
            { href: "/forms", icon: "📋", label: "Ver formulários" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-medium text-slate-700 transition hover:border-yellow-400 hover:bg-yellow-50"
            >
              <span className="text-2xl" aria-hidden>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
