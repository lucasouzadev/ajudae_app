import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Role = 'cliente' | 'prestador';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  role: Role;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  signup: (nome: string, email: string, telefone: string, senha: string, role: Role) => Promise<void>;
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
    // Mock login
    const mockUser: User = { id: '1', name: 'João Silva', email, role: 'cliente' };
    await AsyncStorage.setItem('@fretex_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setRole('cliente');
  };

  const signup = async (nome: string, email: string, telefone: string, senha: string, role: Role) => {
    const mockUser: User = { id: '2', name: nome, email, role };
    await AsyncStorage.setItem('@fretex_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setRole(role);
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
