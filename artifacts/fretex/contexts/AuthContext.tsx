import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Profile } from '../lib/supabase';

type Role = 'cliente' | 'prestador';

// Map UI roles (Portuguese) ↔ DB roles (English)
function toDbRole(role: Role): 'client' | 'provider' {
  return role === 'cliente' ? 'client' : 'provider';
}
function toUiRole(dbRole: string): Role {
  return dbRole === 'client' ? 'cliente' : 'prestador';
}

interface User extends Profile {
  onboardingCompleted?: boolean;
  gpsGranted?: boolean;
}

interface AuthContextType {
  user: User | null;
  role: Role;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  signup: (nome: string, email: string, telefone: string, senha: string, role: Role) => Promise<void>;
  completeOnboarding: (name: string, phone: string, gpsGranted: boolean) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('cliente');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check existing session on app launch
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user profile from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const userData: User = {
            ...profile,
            email: session.user.email || '',
            onboardingCompleted: true,
          };
          setUser(userData);
          setRole(toUiRole(profile.role));
          await AsyncStorage.setItem('@fretex_user', JSON.stringify(userData));
        }
      } else {
        setUser(null);
        setRole('cliente');
        await AsyncStorage.removeItem('@fretex_user');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const userData: User = {
            ...profile,
            email: session.user.email || '',
            onboardingCompleted: true,
          };
          setUser(userData);
          setRole(toUiRole(profile.role));
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, senha: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          const userData: User = {
            ...profile,
            email: data.user.email || '',
            onboardingCompleted: true,
          };
          setUser(userData);
          setRole(toUiRole(profile.role));
          await AsyncStorage.setItem('@fretex_user', JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (nome: string, email: string, telefone: string, senha: string, role: Role) => {
    try {
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { name: nome },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              name: nome,
              email,
              phone: telefone,
              role: toDbRole(role),
              is_active: true,
            },
          ])
          .select()
          .single();

        if (profileError) throw profileError;

        if (profile) {
          const userData: User = {
            ...profile,
            email,
            onboardingCompleted: true,
          };
          setUser(userData);
          setRole(role);
          await AsyncStorage.setItem('@fretex_user', JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const completeOnboarding = async (name: string, phone: string, gpsGranted: boolean) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ name, phone })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updated: User = { ...data, email: user.email, onboardingCompleted: true, gpsGranted };
        setUser(updated);
        await AsyncStorage.setItem('@fretex_user', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole('cliente');
      await AsyncStorage.removeItem('@fretex_user');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const switchRole = async (newRole: Role) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: toDbRole(newRole) })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updated: User = { ...data, email: user.email, onboardingCompleted: true };
        setUser(updated);
        setRole(newRole);
        await AsyncStorage.setItem('@fretex_user', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Switch role error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
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
