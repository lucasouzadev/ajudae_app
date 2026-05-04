import React, { createContext, useContext, useState } from "react";

export interface PortfolioService {
  title: string;
  price: string;
  desc: string;
}

export interface PortfolioData {
  bio: string;
  promoText: string;
  promoDue: string;
  services: PortfolioService[];
  featuredReview: string;
  reviewAuthor: string;
  supportsHelpers: boolean;
  helpersCount: number;
  photoSections: boolean; // toggle para mostrar a seção de fotos no perfil público
  reviewSection: boolean;
  servicesSection: boolean;
}

const DEFAULT_PORTFOLIO: PortfolioData = {
  bio: "Especialista em mudanças residenciais e comerciais na Zona Norte do Rio. Mais de 5 anos de experiência, equipe treinada e veículo segurado.",
  promoText: "Mudança completa com 10% OFF",
  promoDue: "30/05",
  services: [
    { title: "Mudança Residencial", price: "R$89", desc: "Apartamento ou casa, com 2 ajudantes incluídos" },
    { title: "Frete Rápido", price: "R$49", desc: "Itens avulsos, entrega em até 2h na região" },
  ],
  featuredReview: "Excelente profissional! Cuidou de tudo com muito cuidado e chegou no horário marcado. Super recomendo!",
  reviewAuthor: "Maria S.",
  supportsHelpers: true,
  helpersCount: 2,
  photoSections: true,
  reviewSection: true,
  servicesSection: true,
};

interface PortfolioContextType {
  portfolio: PortfolioData;
  setPortfolio: React.Dispatch<React.SetStateAction<PortfolioData>>;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolio] = useState<PortfolioData>(DEFAULT_PORTFOLIO);
  return (
    <PortfolioContext.Provider value={{ portfolio, setPortfolio }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
