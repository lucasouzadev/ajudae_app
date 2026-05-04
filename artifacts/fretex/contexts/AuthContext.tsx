import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Profile, ProviderRow, UserRole } from '../lib/supabase';

type Role = 'cliente' | 'prestador';
type AccountStatus =
  | 'signed_out'
  | 'pending_email'
  | 'client_active'
  | 'provider_needs_validation'
  | 'provider_pending_review'
  | 'provider_verified';

type AuthActionStatus = Exclude<AccountStatus, 'signed_out'>;

interface PendingAccount {
  email: string;
  role: Role;
  name?: string;
  phone?: string;
  cpf?: string;
  status: 'pending_email_confirmation';
}

interface User extends Profile {
  email: string;
  provider: ProviderRow | null;
  verified: boolean;
  onboardingCompleted: boolean;
  gpsGranted?: boolean;
  accountStatus: Exclude<AccountStatus, 'signed_out' | 'pending_email'>;
}

interface AuthAccountStatusResponse {
  exists: boolean;
  email: string;
  role?: UserRole;
  status?:
    | 'not_found'
    | 'pending_email_confirmation'
    | 'client_active'
    | 'provider_needs_validation'
    | 'provider_pending_review'
    | 'provider_verified';
  name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  email_confirmed?: boolean;
  provider?: {
    verified: boolean;
    active: boolean;
    onboarding_status: string;
    kyc_status: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  role: Role;
  pendingAccount: PendingAccount | null;
  accountStatus: AccountStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<AuthActionStatus>;
  signup: (nome: string, email: string, telefone: string, senha: string, role: Role, cpf?: string) => Promise<'pending_email'>;
  confirmSignupOtp: (code: string, email?: string) => Promise<AuthActionStatus>;
  resendSignupOtp: (email?: string) => Promise<void>;
  clearPendingAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  completeOnboarding: (name: string, phone: string, gpsGranted: boolean) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_STORAGE_KEY = '@fretex_user';
const PENDING_STORAGE_KEY = '@fretex_pending_account';

function toDbRole(role: Role): 'client' | 'provider' {
  return role === 'cliente' ? 'client' : 'provider';
}

function toUiRole(dbRole: string): Role {
  return dbRole === 'client' ? 'cliente' : 'prestador';
}

function toAccountStatus(role: UserRole, provider: ProviderRow | null): Exclude<AccountStatus, 'signed_out' | 'pending_email'> {
  if (role !== 'provider') {
    return 'client_active';
  }

  if (provider?.verified) {
    return 'provider_verified';
  }

  if (provider?.onboarding_status === 'submitted') {
    return 'provider_pending_review';
  }

  return 'provider_needs_validation';
}

function mapPendingAccount(data: AuthAccountStatusResponse): PendingAccount | null {
  if (!data.exists || data.status !== 'pending_email_confirmation' || !data.role) {
    return null;
  }

  return {
    email: data.email,
    role: toUiRole(data.role),
    name: data.name ?? undefined,
    phone: data.phone ?? undefined,
    cpf: data.cpf ?? undefined,
    status: 'pending_email_confirmation',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('cliente');
  const [pendingAccount, setPendingAccount] = useState<PendingAccount | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('signed_out');
  const [isLoading, setIsLoading] = useState(true);

  async function persistUser(next: User | null) {
    setUser(next);
    if (next) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  async function persistPending(next: PendingAccount | null) {
    setPendingAccount(next);
    if (next) {
      await AsyncStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(PENDING_STORAGE_KEY);
    }
  }

  async function clearPendingAccount() {
    await persistPending(null);
    if (!user) {
      setAccountStatus('signed_out');
      setRole('cliente');
    }
  }

  async function loadProvider(userId: string, dbRole: UserRole) {
    if (dbRole !== 'provider') {
      return null;
    }

    const { data } = await supabase
      .from('providers')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    return data ?? null;
  }

  async function buildUser(profile: Profile, email: string, gpsGranted?: boolean) {
    const provider = await loadProvider(profile.id, profile.role);
    const nextStatus = toAccountStatus(profile.role, provider);

    const nextUser: User = {
      ...profile,
      email,
      provider,
      verified: Boolean(provider?.verified),
      onboardingCompleted: true,
      gpsGranted,
      accountStatus: nextStatus,
    };

    return nextUser;
  }

  async function syncAuthenticatedUser(userId: string, email: string, gpsGranted?: boolean) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw error ?? new Error('Perfil não encontrado');
    }

    const nextUser = await buildUser(profile, email, gpsGranted);
    await persistUser(nextUser);
    await persistPending(null);
    setRole(toUiRole(profile.role));
    setAccountStatus(nextUser.accountStatus);
    return nextUser;
  }

  async function lookupAccountStatus(email: string) {
    const { data, error } = await supabase.functions.invoke<AuthAccountStatusResponse>('auth_account_status', {
      body: { email: email.trim().toLowerCase() },
    });

    if (error || !data) {
      throw error ?? new Error('Não foi possível consultar status da conta');
    }

    return data;
  }

  async function refreshUser() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return;
    }

    await syncAuthenticatedUser(session.user.id, session.user.email || '');
  }

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          await syncAuthenticatedUser(session.user.id, session.user.email || '');
        } catch {
          await persistUser(null);
          setRole('cliente');
          setAccountStatus('signed_out');
        }
        return;
      }

      const storedPending = await AsyncStorage.getItem(PENDING_STORAGE_KEY);
      if (storedPending) {
        const parsed = JSON.parse(storedPending) as PendingAccount;
        await persistUser(null);
        setRole(parsed.role);
        setPendingAccount(parsed);
        setAccountStatus('pending_email');
      } else {
        await persistUser(null);
        setRole('cliente');
        setAccountStatus('signed_out');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function checkSession() {
    try {
      const storedPending = await AsyncStorage.getItem(PENDING_STORAGE_KEY);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await syncAuthenticatedUser(session.user.id, session.user.email || '');
        return;
      }

      if (storedPending) {
        const parsed = JSON.parse(storedPending) as PendingAccount;
        await persistUser(null);
        setPendingAccount(parsed);
        setRole(parsed.role);
        setAccountStatus('pending_email');
        return;
      }

      await persistUser(null);
      setPendingAccount(null);
      setRole('cliente');
      setAccountStatus('signed_out');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, senha: string): Promise<AuthActionStatus> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          const statusData = await lookupAccountStatus(email);
          const nextPending = mapPendingAccount(statusData);

          if (nextPending) {
            await persistPending(nextPending);
            setRole(nextPending.role);
            setAccountStatus('pending_email');
            return 'pending_email';
          }
        }

        throw error;
      }

      if (!data.user) {
        throw new Error('Usuário não autenticado');
      }

      const nextUser = await syncAuthenticatedUser(data.user.id, data.user.email || email);
      return nextUser.accountStatus;
    } catch (error) {
      throw error;
    }
  }

  async function signup(
    nome: string,
    email: string,
    telefone: string,
    senha: string,
    nextRole: Role,
    cpf?: string,
  ): Promise<'pending_email'> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          name: nome,
          role: toDbRole(nextRole),
          phone: telefone,
          cpf,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Usuário não criado');
    }

    const nextPending: PendingAccount = {
      email,
      role: nextRole,
      name: nome,
      phone: telefone,
      cpf,
      status: 'pending_email_confirmation',
    };

    await persistPending(nextPending);
    setRole(nextRole);
    setAccountStatus('pending_email');
    return 'pending_email';
  }

  async function confirmSignupOtp(code: string, email?: string): Promise<AuthActionStatus> {
    const targetEmail = (email ?? pendingAccount?.email ?? '').trim().toLowerCase();

    if (!targetEmail) {
      throw new Error('Nenhum e-mail pendente para confirmar');
    }

    let verifyData: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>['data'] | null = null;
    let verifyError: unknown = null;

    for (const otpType of ['signup', 'email'] as const) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: code,
        type: otpType,
      });

      if (!error) {
        verifyData = data;
        verifyError = null;
        break;
      }

      verifyError = error;
    }

    if (!verifyData) {
      throw verifyError;
    }

    const sessionUser = verifyData.user ?? verifyData.session?.user;
    if (!sessionUser) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        throw new Error('Sessão não iniciada após confirmar código');
      }

      const nextUser = await syncAuthenticatedUser(
        sessionData.session.user.id,
        sessionData.session.user.email || targetEmail,
      );
      return nextUser.accountStatus;
    }

    const nextUser = await syncAuthenticatedUser(sessionUser.id, sessionUser.email || targetEmail);
    return nextUser.accountStatus;
  }

  async function resendSignupOtp(email?: string) {
    const targetEmail = (email ?? pendingAccount?.email ?? '').trim().toLowerCase();

    if (!targetEmail) {
      throw new Error('Nenhum e-mail pendente para reenviar');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
    });

    if (error) {
      throw error;
    }
  }

  async function completeOnboarding(name: string, phone: string, gpsGranted: boolean) {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name,
        phone,
        geolocation_requested: gpsGranted,
        last_consent_update: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error('Não foi possível atualizar perfil');
    }

    const updatedUser = await buildUser(data, user.email, gpsGranted);
    await persistUser(updatedUser);
    setRole(toUiRole(data.role));
    setAccountStatus(updatedUser.accountStatus);
  }

  async function logout() {
    await supabase.auth.signOut();
    await persistUser(null);
    await persistPending(null);
    setRole('cliente');
    setAccountStatus('signed_out');
  }

  async function switchRole(newRole: Role) {
    if (!user) return;

    const nextDbRole = toDbRole(newRole);
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: nextDbRole })
      .eq('id', user.id)
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error('Não foi possível trocar perfil');
    }

    if (nextDbRole === 'provider') {
      await supabase.from('providers').upsert({ id: user.id }, { onConflict: 'id' });
    }

    const nextUser = await buildUser(data, user.email, user.gpsGranted);
    await persistUser(nextUser);
    setRole(newRole);
    setAccountStatus(nextUser.accountStatus);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        pendingAccount,
        accountStatus,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        confirmSignupOtp,
        resendSignupOtp,
        clearPendingAccount,
        refreshUser,
        completeOnboarding,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

// Safe version that returns defaults if context unavailable (for provider components)
export function useAuthSafe() {
  const context = useContext(AuthContext);
  return context ?? {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    role: null,
    accountStatus: null,
    login: async () => {},
    signup: async () => {},
    logout: async () => {},
    refreshUser: async () => {},
    confirmSignupOtp: async () => {},
    resendSignupOtp: async () => {},
    clearPendingAccount: () => {},
    completeOnboarding: async () => {},
    pendingAccount: null,
  };
}
