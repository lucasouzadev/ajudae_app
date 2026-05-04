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

export const MOCK_FAQS = {
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

export const MOCK_POSTINGS = [
  { id: "post-1", client: "Julia Nunes", ini: "JN", route: "Tijuca → Centro", cat: "Frete" as Category, budget: "R$120", objects: "2 armários + 8 caixas", when: "Hoje · 14h", urgency: "Alta" as const, providers: 3, scheduled: false, lat: -22.9278, lng: -43.2268 },
  { id: "post-2", client: "Marcelo T.", ini: "MT", route: "Barra → Recreio", cat: "Mudança" as Category, budget: "R$260", objects: "Mudança de studio", when: "Amanhã · 09h", urgency: "Média" as const, providers: 5, scheduled: true, lat: -22.9895, lng: -43.3685 },
  { id: "post-3", client: "Helena R.", ini: "HR", route: "Botafogo → Humaitá", cat: "Entrega" as Category, budget: "R$48", objects: "Geladeira pequena", when: "Hoje · 19h", urgency: "Baixa" as const, providers: 2, scheduled: false, lat: -22.9519, lng: -43.1864 },
  { id: "post-4", client: "Ricardo A.", ini: "RA", route: "Tijuca → Barra", cat: "Mudança" as Category, budget: "R$165", objects: "Sofá + 4 caixas", when: "Hoje · 15h", urgency: "Alta" as const, providers: 1, scheduled: true, lat: -22.9278, lng: -43.2268 },
  { id: "post-5", client: "Bruno F.", ini: "BF", route: "Centro → Lapa", cat: "Frete" as Category, budget: "R$95", objects: "Mesa + 2 cadeiras", when: "Amanhã · 11h", urgency: "Média" as const, providers: 2, scheduled: true, lat: -22.9035, lng: -43.1731 },
  { id: "post-6", client: "Patricia V.", ini: "PV", route: "Flamengo → Tijuca", cat: "Entrega" as Category, budget: "R$38", objects: "Caixa média", when: "Hoje · 18h", urgency: "Baixa" as const, providers: 4, scheduled: false, lat: -22.9249, lng: -43.1749 },
];
