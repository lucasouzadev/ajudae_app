import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Role = 'cliente' | 'prestador';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  onboardingCompleted: boolean;
  gpsGranted?: boolean;
  verified?: boolean;
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
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem('@fretex_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setRole(parsed.role);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, senha: string) => {
    const mockUser: User = { id: '1', name: 'João Silva', email, role: 'cliente', onboardingCompleted: true };
    await AsyncStorage.setItem('@fretex_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setRole('cliente');
  };

  const signup = async (nome: string, email: string, telefone: string, senha: string, role: Role) => {
    const mockUser: User = { id: '2', name: nome, email, role, onboardingCompleted: false, verified: role === 'cliente' };
    await AsyncStorage.setItem('@fretex_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setRole(role);
  };

  const completeOnboarding = async (name: string, phone: string, gpsGranted: boolean) => {
    if (!user) return;
    const updated: User = { ...user, name, phone, gpsGranted, onboardingCompleted: true };
    await AsyncStorage.setItem('@fretex_user', JSON.stringify(updated));
    setUser(updated);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@fretex_user');
    setUser(null);
    setRole('cliente');
  };

  const switchRole = async (newRole: Role) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    await AsyncStorage.setItem('@fretex_user', JSON.stringify(updated));
    setUser(updated);
    setRole(newRole);
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
