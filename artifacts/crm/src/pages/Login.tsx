import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/* Generic validation: no detailed hints that aid enumeration */
function validateForm(email: string, password: string): string | null {
  if (!email.trim() || !password) return "Preencha todos os campos.";
  if (password.length < 6) return "Senha muito curta.";
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRe.test(email.trim())) return "E-mail inválido.";
  return null;
}

export function Login() {
  const { session, adminVerified, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);

  if (!loading && session && adminVerified) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const clientError = validateForm(email, password);
    if (clientError) { setError(clientError); return; }

    setSubmitting(true);
    const { error: err, waitSeconds: wait } = await signIn(email.trim(), password);
    if (err) {
      setError(err);
      if (wait) setWaitSeconds(wait);
    }
    setPassword(""); // always clear password field on attempt
    setSubmitting(false);
  }

  const isLocked = waitSeconds > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-3xl font-black text-slate-900 shadow-md">
            A
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Ajudaê CRM</h1>
          <p className="text-center text-sm text-slate-500">
            Painel de administração interno.
            <br />
            Acesso exclusivo — credenciais gerenciadas pelo Supabase.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          autoComplete="on"
          noValidate
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="crm-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                E-mail
              </label>
              <input
                id="crm-email"
                type="email"
                autoComplete="email"
                required
                disabled={submitting || isLocked}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="admin@ajudae.com.br"
                maxLength={254}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="crm-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Senha
              </label>
              <input
                id="crm-password"
                type="password"
                autoComplete="current-password"
                required
                disabled={submitting || isLocked}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                maxLength={128}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:opacity-60"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3"
            >
              <span className="mt-0.5 text-base leading-none text-red-500" aria-hidden>⚠</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || isLocked}
            className="mt-5 w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Verificando..." : isLocked ? `Bloqueado — aguarde ${waitSeconds}s` : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Sem acesso? Solicite ao administrador do Supabase.
        </p>
      </div>
    </div>
  );
}
