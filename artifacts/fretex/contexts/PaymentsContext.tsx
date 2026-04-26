import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface PaymentMethod {
  id: string;
  type: 'pix' | 'credit_card' | 'cash';
  last4?: string;
  brand?: string;
  isDefault?: boolean;
}

interface PaymentsContextType {
  methods: PaymentMethod[];
  addMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
}

const mockMethods: PaymentMethod[] = [
  { id: 'pm-1', type: 'credit_card', last4: '4242', brand: 'Visa', isDefault: true },
  { id: 'pm-2', type: 'pix' },
];

const PaymentsContext = createContext<PaymentsContextType | null>(null);

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const stored = await AsyncStorage.getItem('@fretex_payments');
    if (stored) {
      setMethods(JSON.parse(stored));
    } else {
      setMethods(mockMethods);
      await AsyncStorage.setItem('@fretex_payments', JSON.stringify(mockMethods));
    }
  };

  const addMethod = async (method: Omit<PaymentMethod, 'id'>) => {
    const newMethod: PaymentMethod = {
      ...method,
      id: `pm-${Date.now()}`,
    };
    const updated = [...methods, newMethod];
    setMethods(updated);
    await AsyncStorage.setItem('@fretex_payments', JSON.stringify(updated));
  };

  const setDefault = async (id: string) => {
    const updated = methods.map(m => ({ ...m, isDefault: m.id === id }));
    setMethods(updated);
    await AsyncStorage.setItem('@fretex_payments', JSON.stringify(updated));
  };

  return (
    <PaymentsContext.Provider value={{ methods, addMethod, setDefault }}>
      {children}
    </PaymentsContext.Provider>
  );
}

export const usePayments = () => {
  const context = useContext(PaymentsContext);
  if (!context) throw new Error('usePayments must be used within PaymentsProvider');
  return context;
};
