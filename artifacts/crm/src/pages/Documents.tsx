import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSignedUrls, sanitizeText } from "@/lib/security";

interface DocRecord {
  id: string;
  provider_name: string;
  service_type: string;
  doc_rg_url: string;
  doc_residence_url: string;
  doc_cnh_url: string;
  doc_crlv_url: string;
  doc_selfie_url: string;
  onboarding_status: string;
  submitted_at: string;
}

interface ViewerState {
  label: string;
  url: string;
  fileName: string;
  isImage: boolean;
  isPdf: boolean;
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

function getFileExtension(path: string) {
  const clean = path.split("?")[0].toLowerCase();
  return clean.includes(".") ? clean.slice(clean.lastIndexOf(".") + 1) : "";
}

function isPdfPath(path: string) {
  return getFileExtension(path) === "pdf";
}

function isImagePath(path: string) {
  return ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(getFileExtension(path));
}

function fileNameFromPath(path: string) {
  return path.split("/").pop() || "arquivo";
}

export function Documents() {
  const [showDetail, setShowDetail] = useState(false);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DocRecord | null>(null);
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({});
  const [failedPreviews, setFailedPreviews] = useState<Record<string, boolean>>({});
  const [signingUrls, setSigningUrls] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  async function loadDocs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("providers")
      .select(`
        id, service_type, onboarding_status,
        doc_rg_url, doc_residence_url, doc_cnh_url, doc_crlv_url, doc_selfie_url,
        updated_at,
        profiles(name)
      `)
      .eq("onboarding_status", "submitted")
      .order("updated_at", { ascending: true });

    if (error) {
      console.error("[Documents] fetch error:", error.message);
      setLoading(false);
      return;
    }

    setDocs(
      (data ?? []).map((row: any) => ({
        id: row.id,
        provider_name: sanitizeText(row.profiles?.name ?? ""),
        service_type: sanitizeText(row.service_type ?? ""),
        doc_rg_url: row.doc_rg_url ?? "",
        doc_residence_url: row.doc_residence_url ?? "",
        doc_cnh_url: row.doc_cnh_url ?? "",
        doc_crlv_url: row.doc_crlv_url ?? "",
        doc_selfie_url: row.doc_selfie_url ?? "",
        onboarding_status: row.onboarding_status,
        submitted_at: row.updated_at,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function selectProvider(doc: DocRecord) {
    setShowDetail(true);
    setSelected(doc);
    setSignedUrls({});
    setFailedPreviews({});
    setActionError(null);
    setDecisionNotes("");
    setViewer(null);
    setSigningUrls(true);

    const paths: Record<string, string> = {};
    for (const { key } of DOC_FIELDS) {
      const value = doc[key] as string;
      if (value) {
        paths[key as string] = value;
      }
    }

    const urls = await getSignedUrls(BUCKET, paths);
    setSignedUrls(urls);
    setSigningUrls(false);
  }

  function openViewer(label: string, rawPath: string, signedUrl: string) {
    setViewer({
      label,
      url: signedUrl,
      fileName: fileNameFromPath(rawPath),
      isImage: isImagePath(rawPath),
      isPdf: isPdfPath(rawPath),
    });
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    if (actioning) return;

    const trimmedNotes = decisionNotes.trim();
    if (status === "rejected" && trimmedNotes.length < 10) {
      setActionError("Informe um motivo com pelo menos 10 caracteres para reprovar.");
      return;
    }

    setActioning(true);
    setActionError(null);

    const { data, error } = await supabase.functions.invoke<{
      error?: string;
    }>("admin_verify_provider", {
      body: {
        provider_id: id,
        verified: status === "approved",
        notes: trimmedNotes || undefined,
      },
    });

    if (error || data?.error) {
      setActionError(data?.error || "Não foi possível atualizar o status. Tente novamente.");
      setActioning(false);
      return;
    }

    setDocs((prev) => prev.filter((item) => item.id !== id));
    setSelected(null);
    setSignedUrls({});
    setDecisionNotes("");
    setViewer(null);
    setShowDetail(false);
    setActioning(false);
  }

  return (
    <>
      <div className="flex h-full overflow-hidden">
        <div className={`flex flex-col overflow-y-auto border-r border-slate-200 bg-white ${showDetail ? "hidden md:flex md:w-80 md:flex-shrink-0" : "w-full md:w-80 md:flex-shrink-0"}`}>
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
                    <div className="mt-1 text-xs font-medium capitalize text-slate-500">{doc.service_type || "—"}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto ${showDetail ? "block" : "hidden md:block"}`}>
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <span className="text-5xl">📄</span>
              <span className="text-sm">Selecione um prestador para analisar</span>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl p-4 sm:p-8">
              <button
                onClick={() => setShowDetail(false)}
                className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 md:hidden"
              >
                ← Voltar
              </button>

              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.provider_name}</h2>
                  <p className="text-sm text-slate-500">{selected.service_type}</p>
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

              {actionError ? (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <span className="text-red-500">⚠</span>
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              ) : null}

              <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
                <span className="text-base">🔒</span>
                <p className="text-xs text-blue-700">
                  Links de documentos expiram em 5 minutos por segurança. Recarregue o painel caso expire.
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Motivo da reprovação
                </label>
                <textarea
                  value={decisionNotes}
                  onChange={(event) => setDecisionNotes(event.target.value)}
                  placeholder="Preencha apenas se precisar reprovar este envio."
                  className="min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-yellow-400"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Em caso de reprovação, este texto é enviado ao prestador.
                </p>
              </div>

              {signingUrls ? (
                <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                  <span className="text-sm">Carregando documentos com acesso seguro...</span>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {DOC_FIELDS.map(({ key, label }) => {
                    const signedUrl = signedUrls[key as string];
                    const rawPath = selected[key] as string;
                    const previewFailed = failedPreviews[key as string];
                    const isImage = isImagePath(rawPath);
                    const isPdf = isPdfPath(rawPath);
                    const previewAvailable = Boolean(signedUrl);
                    const fileName = fileNameFromPath(rawPath);

                    return (
                      <div key={key as string} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                          {label}
                        </div>

                        {previewAvailable ? (
                          <button
                            type="button"
                            onClick={() => signedUrl && openViewer(label, rawPath, signedUrl)}
                            className="flex w-full flex-col text-left"
                          >
                            {isImage && !previewFailed ? (
                              <img
                                src={signedUrl ?? undefined}
                                alt={label}
                                className="h-56 w-full object-cover"
                                onError={() =>
                                  setFailedPreviews((prev) => ({ ...prev, [key as string]: true }))
                                }
                              />
                            ) : (
                              <div className="flex h-56 flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
                                <span className="text-4xl">{isPdf ? "📄" : "🖼️"}</span>
                                <div>
                                  <p className="text-sm font-medium text-slate-700">
                                    {isPdf ? "Visualização em PDF" : "Abrir documento"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Clique para abrir no visualizador seguro
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-slate-700">{fileName}</p>
                                <p className="text-[11px] text-slate-400">
                                  {isPdf ? "PDF" : isImage ? "Imagem" : "Arquivo"}
                                </p>
                              </div>
                              <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                                Visualizar
                              </span>
                            </div>
                          </button>
                        ) : (
                          <div className="flex h-56 items-center justify-center px-4 text-center text-sm text-slate-400">
                            {rawPath ? "Erro ao gerar link seguro" : "Não enviado"}
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
                  Reprovar prestador
                </button>
                <button
                  disabled={actioning || signingUrls}
                  onClick={() => updateStatus(selected.id, "approved")}
                  className="rounded-xl bg-green-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
                >
                  Aprovar prestador
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setViewer(null)}
            aria-label="Fechar visualizador"
          />
          <div className="relative z-10 flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{viewer.label}</p>
                <p className="truncate text-sm font-medium text-slate-800">{viewer.fileName}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={viewer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Abrir em nova aba
                </a>
                <button
                  type="button"
                  onClick={() => setViewer(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4">
              {viewer.isImage ? (
                <div className="flex h-full items-center justify-center">
                  <img
                    src={viewer.url}
                    alt={viewer.label}
                    className="max-h-full max-w-full rounded-2xl object-contain shadow-lg"
                  />
                </div>
              ) : (
                <iframe
                  title={viewer.label}
                  src={viewer.url}
                  className="h-full w-full rounded-2xl border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
