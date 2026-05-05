import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/* ─── Generic errors: never leak Supabase internals to the UI ─────────────── */
const GENERIC_AUTH_ERROR = "Credenciais inválidas. Verifique e tente novamente.";
const GENERIC_ROLE_ERROR = "Acesso restrito. Somente administradores podem acessar este painel.";
const GENERIC_SERVER_ERROR = "Erro interno. Tente novamente em alguns instantes.";

/* ─── In-memory rate limiter (5 attempts per 15 min per email) ────────────── */
interface AttemptRecord { count: number; windowStart: number }
const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_WAIT_S = 15 * 60;

function checkRateLimit(email: string): { allowed: boolean; waitSeconds?: number } {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now - record.windowStart > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const wait = Math.ceil((record.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, waitSeconds: Math.max(wait, 1) };
  }

  record.count++;
  return { allowed: true };
}

function recordFailedAttempt(email: string) {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (record && now - record.windowStart <= WINDOW_MS) {
    record.count = Math.min(record.count + 1, MAX_ATTEMPTS);
  } else {
    loginAttempts.set(key, { count: 1, windowStart: now });
  }
}

function clearAttempts(email: string) {
  loginAttempts.delete(email.toLowerCase().trim());
}

/* ─── Auth context ────────────────────────────────────────────────────────── */
interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  adminVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; waitSeconds?: number }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function fetchIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (error || !data) return false;
    return data.role === "admin";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [adminVerified, setAdminVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  /* Every session restore re-validates the admin role in the DB.
     This prevents TOCTOU: a demoted admin with a cached JWT still gets kicked. */
  const verifyAndSetSession = useCallback(async (s: Session | null) => {
    if (!s) {
      setSession(null);
      setAdminVerified(false);
      setLoading(false);
      return;
    }

    const isAdmin = await fetchIsAdmin(s.user.id);
    if (!isAdmin) {
      await supabase.auth.signOut();
      setSession(null);
      setAdminVerified(false);
    } else {
      setSession(s);
      setAdminVerified(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      verifyAndSetSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      verifyAndSetSession(s);
    });

    return () => subscription.unsubscribe();
  }, [verifyAndSetSession]);

  async function signIn(email: string, password: string): Promise<{ error: string | null; waitSeconds?: number }> {
    /* Rate limiting check before even calling Supabase */
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      return {
        error: `Muitas tentativas. Aguarde ${rateCheck.waitSeconds} segundos antes de tentar novamente.`,
        waitSeconds: rateCheck.waitSeconds,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session) {
        recordFailedAttempt(email);
        return { error: GENERIC_AUTH_ERROR };
      }

      const isAdmin = await fetchIsAdmin(data.session.user.id);
      if (!isAdmin) {
        await supabase.auth.signOut();
        recordFailedAttempt(email);
        return { error: GENERIC_ROLE_ERROR };
      }

      clearAttempts(email);
      return { error: null };
    } catch {
      return { error: GENERIC_SERVER_ERROR };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setAdminVerified(false);
  }

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, adminVerified, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
