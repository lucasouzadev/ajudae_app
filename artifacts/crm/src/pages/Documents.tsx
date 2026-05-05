import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSignedUrls, sanitizeText } from "@/lib/security";

interface DocRecord {
  id: string;
  provider_name: string;
  provider_email: string;
  service_type: string;
  doc_rg_url: string;
  doc_residence_url: string;
  doc_cnh_url: string;
  doc_crlv_url: string;
  doc_selfie_url: string;
  onboarding_status: string;
  submitted_at: string;
}

type SignedUrls = Record<string, string | null>;

const BUCKET = "provider-docs";

const DOC_FIELDS: { key: keyof DocRecord; label: string }[] = [
  { key: "doc_rg_url", label: "RG / Identidade" },
  { key: "doc_residence_url", label: "Comprovante de Residência" },
  { key: "doc_cnh_url", label: "CNH" },
  { key: "doc_crlv_url", label: "CRLV" },
  { key: "doc_selfie_url", label: "Selfie" },
];

export function Documents() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DocRecord | null>(null);
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({});
  const [signingUrls, setSigningUrls] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("providers")
        .select(`
          id, service_type, onboarding_status,
          doc_rg_url, doc_residence_url, doc_cnh_url, doc_crlv_url, doc_selfie_url,
          updated_at,
          profiles(name, email)
        `)
        .eq("onboarding_status", "submitted")
        .order("updated_at", { ascending: true });

      if (error) {
        console.error("[Documents] fetch error:", error.code);
        setLoading(false);
        return;
      }

      if (data) {
        setDocs(
          data.map((row: any) => ({
            id: row.id,
            provider_name: sanitizeText(row.profiles?.name ?? ""),
            provider_email: sanitizeText(row.profiles?.email ?? ""),
            service_type: sanitizeText(row.service_type ?? ""),
            doc_rg_url: row.doc_rg_url ?? "",
            doc_residence_url: row.doc_residence_url ?? "",
            doc_cnh_url: row.doc_cnh_url ?? "",
            doc_crlv_url: row.doc_crlv_url ?? "",
            doc_selfie_url: row.doc_selfie_url ?? "",
            onboarding_status: row.onboarding_status,
            submitted_at: row.updated_at,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  /* Fetch signed URLs every time a provider is selected.
     Signed URLs expire in 5 min — never expose raw storage paths to the DOM. */
  async function selectProvider(doc: DocRecord) {
    setSelected(doc);
    setSignedUrls({});
    setActionError(null);
    setSigningUrls(true);

    const paths: Record<string, string> = {};
    for (const { key } of DOC_FIELDS) {
      const val = doc[key] as string;
      if (val) paths[key as string] = val;
    }

    const urls = await getSignedUrls(BUCKET, paths);
    setSignedUrls(urls);
    setSigningUrls(false);
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    if (actioning) return;
    setActioning(true);
    setActionError(null);

    const { error } = await supabase
      .from("providers")
      .update({ onboarding_status: status })
      .eq("id", id);

    if (error) {
      setActionError("Não foi possível atualizar o status. Tente novamente.");
      setActioning(false);
      return;
    }

    setDocs((prev) => prev.filter((d) => d.id !== id));
    setSelected(null);
    setSignedUrls({});
    setActioning(false);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="flex w-80 flex-shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h1 className="text-lg font-bold text-slate-900">Documentos</h1>
          <p className="text-xs text-slate-500">{docs.length} aguardando análise</p>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <span className="text-3xl">✅</span>
            <span className="text-sm">Nenhuma pendência</span>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {docs.map((doc) => (
              <li key={doc.id}>
                <button
                  onClick={() => selectProvider(doc)}
                  className={`w-full p-4 text-left transition hover:bg-slate-50 ${selected?.id === doc.id ? "bg-yellow-50" : ""}`}
                >
                  <div className="font-medium text-slate-900">{doc.provider_name || "—"}</div>
                  <div className="text-xs text-slate-400">{doc.provider_email || "—"}</div>
                  <div className="mt-1 text-xs font-medium capitalize text-slate-500">{doc.service_type || "—"}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-8">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <span className="text-5xl">📄</span>
            <span className="text-sm">Selecione um prestador para analisar</span>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selected.provider_name}</h2>
                <p className="text-sm text-slate-500">
                  {selected.provider_email} · {selected.service_type}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Enviado em {new Date(selected.submitted_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  disabled={actioning || signingUrls}
                  onClick={() => updateStatus(selected.id, "rejected")}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  Reprovar
                </button>
                <button
                  disabled={actioning || signingUrls}
                  onClick={() => updateStatus(selected.id, "approved")}
                  className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
                >
                  Aprovar
                </button>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <span className="text-red-500">⚠</span>
                <p className="text-sm text-red-700">{actionError}</p>
              </div>
            )}

            {/* Note about signed URL expiry */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
              <span className="text-base">🔒</span>
              <p className="text-xs text-blue-700">
                Links de documentos expiram em 5 minutos por segurança. Recarregue o painel caso expire.
              </p>
            </div>

            {signingUrls ? (
              <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                <span className="text-sm">Carregando documentos com acesso seguro...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {DOC_FIELDS.map(({ key, label }) => {
                  const signedUrl = signedUrls[key as string];
                  return (
                    <div key={key as string} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {label}
                      </div>
                      {signedUrl ? (
                        <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={signedUrl}
                            alt={label}
                            className="h-48 w-full object-cover transition hover:opacity-90"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = "none";
                              target.parentElement!.innerHTML =
                                '<div class="flex h-48 items-center justify-center text-sm text-slate-400">Erro ao carregar</div>';
                            }}
                          />
                        </a>
                      ) : (
                        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                          {(selected[key] as string) ? "Erro ao gerar link seguro" : "Não enviado"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={actioning || signingUrls}
                onClick={() => updateStatus(selected.id, "rejected")}
                className="rounded-xl border border-red-200 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                ✕ Reprovar prestador
              </button>
              <button
                disabled={actioning || signingUrls}
                onClick={() => updateStatus(selected.id, "approved")}
                className="rounded-xl bg-green-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                ✓ Aprovar prestador
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
