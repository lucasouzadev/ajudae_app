import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";

interface FormSubmission {
  id: string;
  provider_name: string;
  provider_email: string;
  service_type: string;
  service_category: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_plate: string;
  vehicle_type: string;
  contact_method: string;
  contact_availability: string;
  onboarding_status: string;
  validation_notes: string;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  not_started: "bg-slate-100 text-slate-500",
};

export function Forms() {
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FormSubmission | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("providers")
        .select(`
          id, service_type, service_category, vehicle_model, vehicle_year, vehicle_plate,
          vehicle_type, contact_method, contact_availability,
          onboarding_status, validation_notes, created_at,
          profiles(name, email)
        `)
        .not("onboarding_status", "eq", "not_started")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError("Não foi possível carregar os formulários. Recarregue a página.");
        setLoading(false);
        return;
      }

      if (data) {
        setForms(
          data.map((row: any) => ({
            id: row.id,
            provider_name: sanitizeText(row.profiles?.name ?? ""),
            provider_email: sanitizeText(row.profiles?.email ?? ""),
            service_type: sanitizeText(row.service_type ?? ""),
            service_category: sanitizeText(row.service_category ?? ""),
            vehicle_model: sanitizeText(row.vehicle_model ?? ""),
            vehicle_year: Number(row.vehicle_year) || 0,
            vehicle_plate: sanitizeText(row.vehicle_plate ?? ""),
            vehicle_type: sanitizeText(row.vehicle_type ?? ""),
            contact_method: sanitizeText(row.contact_method ?? ""),
            contact_availability: sanitizeText(row.contact_availability ?? ""),
            onboarding_status: sanitizeText(row.onboarding_status ?? ""),
            validation_notes: sanitizeText(row.validation_notes ?? ""),
            created_at: row.created_at,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h1 className="text-lg font-bold text-slate-900">Formulários</h1>
          <p className="text-xs text-slate-500">{forms.length} envios recebidos</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
            </div>
          ) : loadError ? (
            <div className="p-4 text-center text-sm text-red-600">{loadError}</div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <span className="text-3xl">📋</span>
              <span className="text-sm">Nenhum formulário</span>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {forms.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => setSelected(f)}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 ${selected?.id === f.id ? "bg-yellow-50" : ""}`}
                  >
                    <div className="font-medium text-slate-900">{f.provider_name || "—"}</div>
                    <div className="text-xs text-slate-400">{f.provider_email || "—"}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[f.onboarding_status] ?? "bg-slate-100 text-slate-500"}`}>
                        {f.onboarding_status}
                      </span>
                      <span className="text-xs capitalize text-slate-500">{f.service_type || "—"}</span>
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
            <span className="text-5xl">📋</span>
            <span className="text-sm">Selecione um formulário para ver detalhes</span>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-1 text-xl font-bold text-slate-900">{selected.provider_name || "—"}</h2>
            <p className="mb-5 text-sm text-slate-500">
              {selected.provider_email || "—"} · enviado em {new Date(selected.created_at).toLocaleDateString("pt-BR")}
            </p>

            {[
              {
                title: "Serviço",
                rows: [
                  ["Tipo", selected.service_type],
                  ["Categoria", selected.service_category],
                ],
              },
              {
                title: "Veículo",
                rows: [
                  ["Modelo", selected.vehicle_model],
                  ["Ano", selected.vehicle_year > 0 ? String(selected.vehicle_year) : "—"],
                  ["Placa", selected.vehicle_plate],
                  ["Tipo", selected.vehicle_type],
                ],
              },
              {
                title: "Contato",
                rows: [
                  ["Método", selected.contact_method],
                  ["Disponibilidade", selected.contact_availability],
                ],
              },
            ].map((section) => (
              <div key={section.title} className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {section.title}
                </div>
                <div className="divide-y divide-slate-50">
                  {section.rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between px-5 py-3 text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium text-slate-900">{value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {selected.validation_notes && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-yellow-700">Observações</div>
                {/* sanitizeText strips HTML; whitespace-pre-line is safe here */}
                <p className="whitespace-pre-line text-sm text-slate-700">{selected.validation_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
