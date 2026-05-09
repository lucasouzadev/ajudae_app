import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  photoSections: boolean;
  reviewSection: boolean;
  servicesSection: boolean;
}

const EMPTY_PORTFOLIO: PortfolioData = {
  bio: "",
  promoText: "",
  promoDue: "",
  services: [],
  featuredReview: "",
  reviewAuthor: "",
  supportsHelpers: false,
  helpersCount: 0,
  photoSections: false,
  reviewSection: true,
  servicesSection: true,
};

interface PortfolioContextType {
  portfolio: PortfolioData;
  setPortfolio: React.Dispatch<React.SetStateAction<PortfolioData>>;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolioState] = useState<PortfolioData>(EMPTY_PORTFOLIO);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("providers")
        .select("bio")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.bio) setPortfolioState((current) => ({ ...current, bio: data.bio }));
    }).catch(() => {});
  }, []);

  const setPortfolio: React.Dispatch<React.SetStateAction<PortfolioData>> = (next) => {
    setPortfolioState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from("providers").update({ bio: resolved.bio }).eq("id", user.id).then(() => {});
      }).catch(() => {});
      return resolved;
    });
  };

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
