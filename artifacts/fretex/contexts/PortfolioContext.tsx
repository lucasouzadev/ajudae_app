import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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

// Debounce writes to avoid hammering Supabase on each keystroke
function useDebouncedPersist(portfolio: PortfolioData, delay = 1200) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("providers")
        .update({ bio: portfolio.bio, portfolio_data: portfolio })
        .eq("id", user.id);
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [portfolio]);
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolioState] = useState<PortfolioData>(EMPTY_PORTFOLIO);

  // Load full portfolio on mount
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("providers")
        .select("bio, portfolio_data")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) return;
      if (data.portfolio_data && typeof data.portfolio_data === "object") {
        setPortfolioState({ ...EMPTY_PORTFOLIO, ...data.portfolio_data });
      } else if (data.bio) {
        setPortfolioState((current) => ({ ...current, bio: data.bio }));
      }
    }).catch(() => {});
  }, []);

  useDebouncedPersist(portfolio);

  const setPortfolio: React.Dispatch<React.SetStateAction<PortfolioData>> = (next) => {
    setPortfolioState((current) => (typeof next === "function" ? next(current) : next));
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
