import React, { createContext, useContext, useState } from "react";

export interface PaymentMethod {
  id: string;
  type: "pix" | "credit_card" | "cash";
  last4?: string;
  brand?: string;
  isDefault?: boolean;
}

interface PaymentsContextType {
  methods: PaymentMethod[];
  addMethod: (method: Omit<PaymentMethod, "id">) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
}

const PaymentsContext = createContext<PaymentsContextType | null>(null);

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  const addMethod = async (_method: Omit<PaymentMethod, "id">) => {
    setMethods([]);
  };

  const setDefault = async (_id: string) => {
    setMethods((current) => current);
  };

  return (
    <PaymentsContext.Provider value={{ methods, addMethod, setDefault }}>
      {children}
    </PaymentsContext.Provider>
  );
}

export const usePayments = () => {
  const context = useContext(PaymentsContext);
  if (!context) throw new Error("usePayments must be used within PaymentsProvider");
  return context;
};
