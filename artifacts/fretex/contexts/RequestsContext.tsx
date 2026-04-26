import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type ServiceStatus = 'draft' | 'requested' | 'matching' | 'accepted' | 'provider_en_route' | 'provider_arrived' | 'in_progress' | 'completed_pending_confirmation' | 'completed' | 'cancelled' | 'disputed';

export interface ServiceRequest {
  id: string;
  customerId: string;
  providerId?: string;
  status: ServiceStatus;
  origin: string;
  destination: string;
  price: number;
  serviceType: string;
  createdAt: string;
}

interface RequestsContextType {
  requests: ServiceRequest[];
  createRequest: (req: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateStatus: (id: string, status: ServiceStatus) => Promise<void>;
}

const mockRequests: ServiceRequest[] = [
  {
    id: 'req-1',
    customerId: '1',
    providerId: 'p-1',
    status: 'completed',
    origin: 'Vila Madalena, SP',
    destination: 'Pinheiros, SP',
    price: 150,
    serviceType: 'Mudança',
    createdAt: new Date().toISOString(),
  },
];

const RequestsContext = createContext<RequestsContextType | null>(null);

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const stored = await AsyncStorage.getItem('@fretex_requests');
    if (stored) {
      setRequests(JSON.parse(stored));
    } else {
      setRequests(mockRequests);
      await AsyncStorage.setItem('@fretex_requests', JSON.stringify(mockRequests));
    }
  };

  const createRequest = async (req: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: ServiceRequest = {
      ...req,
      id: `req-${Date.now()}`,
      status: 'requested',
      createdAt: new Date().toISOString(),
    };
    const updated = [newReq, ...requests];
    setRequests(updated);
    await AsyncStorage.setItem('@fretex_requests', JSON.stringify(updated));
  };

  const updateStatus = async (id: string, status: ServiceStatus) => {
    const updated = requests.map(r => r.id === id ? { ...r, status } : r);
    setRequests(updated);
    await AsyncStorage.setItem('@fretex_requests', JSON.stringify(updated));
  };

  return (
    <RequestsContext.Provider value={{ requests, createRequest, updateStatus }}>
      {children}
    </RequestsContext.Provider>
  );
}

export const useRequests = () => {
  const context = useContext(RequestsContext);
  if (!context) throw new Error('useRequests must be used within RequestsProvider');
  return context;
};
