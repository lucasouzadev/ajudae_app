import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type TicketStatus = 'open' | 'under_review' | 'resolved';

export interface Ticket {
  id: string;
  reason: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
}

interface SupportContextType {
  tickets: Ticket[];
  createTicket: (reason: string, description: string) => Promise<void>;
}

const SupportContext = createContext<SupportContextType | null>(null);

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const stored = await AsyncStorage.getItem('@fretex_tickets');
    if (stored) {
      setTickets(JSON.parse(stored));
    }
  };

  const createTicket = async (reason: string, description: string) => {
    const newTicket: Ticket = {
      id: `tk-${Date.now()}`,
      reason,
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    const updated = [newTicket, ...tickets];
    setTickets(updated);
    await AsyncStorage.setItem('@fretex_tickets', JSON.stringify(updated));
  };

  return (
    <SupportContext.Provider value={{ tickets, createTicket }}>
      {children}
    </SupportContext.Provider>
  );
}

export const useSupport = () => {
  const context = useContext(SupportContext);
  if (!context) throw new Error('useSupport must be used within SupportProvider');
  return context;
};
