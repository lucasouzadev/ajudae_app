export type Category = "Mudança" | "Frete" | "Entrega";

export interface Provider {
  id: string;
  name: string;
  ini: string;
  vehicle: string;
  cat: Category;
  rating: number;
  jobs: number;
  price: string;
  priceFrom: number;
  lat: number;
  lng: number;
  color: string;
  area: string;
  km: number;
  helpers: number;
  equipment: string[];
  model: string;
  plate: string;
  workShift: string;
  responseTime: string;
  completionRate: string;
  acceptanceRate: string;
  bio: string;
  workAreas: string[];
  isOnline: boolean;
  reviews: { author: string; text: string; rating: number; when: string }[];
  recentServices: { label: string; when: string; value: string }[];
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Mudança: "#FFCC00",
  Frete: "#2563EB",
  Entrega: "#16A34A",
};

export const CATEGORIES: Category[] = ["Mudança", "Frete", "Entrega"];
export const FILTERS = ["Todos", "Mudança", "Frete", "Entrega"] as const;

// MOCK_PROVIDERS removido — usar fetchOnlineProviders() de lib/providers.ts

export const STATIC_FAQS = {
  cliente: [
    { q: "Como solicitar um serviço?", a: "Abra o mapa, toque em um prestador disponível e selecione 'Solicitar'. Veja foto, avaliações e veículo antes de confirmar." },
    { q: "Como funciona o pagamento?", a: "O valor é reservado no aceite. O repasse ao prestador só ocorre após ambos confirmarem a conclusão com o PIN de 6 dígitos." },
    { q: "O que é o PIN de segurança?", a: "Um código de 6 dígitos exibido para você ao final do serviço. O prestador confirma o PIN para validar a conclusão." },
    { q: "Posso cancelar um serviço?", a: "Sim. Até 3 minutos após o aceite, o cancelamento é gratuito. Depois, pode haver taxa de 20% do valor estimado." },
  ],
  prestador: [
    { q: "Como me cadastro?", a: "Envie CPF, CNH e documento do veículo. A verificação leva até 24h. Após aprovação, você pode ficar online." },
    { q: "Qual a comissão da plataforma?", a: "15% sobre cada serviço concluído. O valor líquido aparece em cada proposta antes do aceite." },
    { q: "Como recebo os pagamentos?", a: "Repasse automático em até 2 dias úteis na conta cadastrada." },
    { q: "Posso recusar uma proposta?", a: "Sim, sem penalidade. Recusas recorrentes podem reduzir sua prioridade no despacho." },
  ],
};
