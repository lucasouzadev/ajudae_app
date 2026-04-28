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

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: "p-1",
    name: "Carlos Oliveira",
    ini: "CO",
    vehicle: "Van",
    cat: "Mudança",
    rating: 4.9,
    jobs: 127,
    price: "R$89",
    priceFrom: 89,
    lat: -22.9278,
    lng: -43.2268,
    color: "#FFCC00",
    area: "Tijuca",
    km: 2.4,
    helpers: 2,
    equipment: ["Carrinho", "Cintas", "Cobertores"],
    model: "Fiorino 2021",
    plate: "KZT-4E21",
    workShift: "Seg a Sáb · 07h às 19h",
    responseTime: "4 min",
    completionRate: "98%",
    acceptanceRate: "92%",
    bio: "Especialista em mudanças compactas e residenciais com proteção de carga e ajudantes próprios.",
    workAreas: ["Tijuca", "Maracanã", "Vila Isabel", "Grajaú"],
    isOnline: true,
    reviews: [
      { author: "Juliana M.", text: "Chegou cedo, embalou tudo com cuidado e subiu quatro andares sem perder o ritmo.", rating: 5, when: "há 2 dias" },
      { author: "Thiago P.", text: "Foi transparente no valor final e explicou cada etapa antes de carregar.", rating: 5, when: "há 1 semana" },
    ],
    recentServices: [
      { label: "Mudança residencial", when: "Último serviço", value: "R$89" },
      { label: "Transporte de móveis", when: "Semana passada", value: "R$110" },
      { label: "Montagem no destino", when: "Este mês", value: "R$135" },
    ],
  },
  {
    id: "p-2",
    name: "Marcos Frete",
    ini: "MF",
    vehicle: "Caminhão",
    cat: "Frete",
    rating: 4.7,
    jobs: 84,
    price: "R$140",
    priceFrom: 140,
    lat: -22.9035,
    lng: -43.1731,
    color: "#2563EB",
    area: "Centro",
    km: 4.8,
    helpers: 1,
    equipment: ["Rampa", "Cintas"],
    model: "HR 2019",
    plate: "RJM-9A84",
    workShift: "Seg a Dom · 06h às 20h",
    responseTime: "5 min",
    completionRate: "95%",
    acceptanceRate: "89%",
    bio: "Atende fretes urbanos e interbairros com foco em rapidez de coleta, amarração e entrega segura.",
    workAreas: ["Centro", "Lapa", "Glória", "Catete"],
    isOnline: true,
    reviews: [
      { author: "Amanda R.", text: "Atualizou a rota em tempo real e foi objetivo na coleta dos móveis.", rating: 5, when: "ontem" },
      { author: "Fabio L.", text: "Resolveu um acesso apertado no prédio sem improviso arriscado.", rating: 4, when: "há 6 dias" },
    ],
    recentServices: [
      { label: "Frete urbano", when: "Último serviço", value: "R$140" },
      { label: "Retirada em loja", when: "Semana passada", value: "R$165" },
      { label: "Carga avulsa", when: "Este mês", value: "R$190" },
    ],
  },
  {
    id: "p-3",
    name: "Rafael Carreto",
    ini: "RC",
    vehicle: "Utilitário",
    cat: "Frete",
    rating: 4.8,
    jobs: 203,
    price: "R$65",
    priceFrom: 65,
    lat: -22.8956,
    lng: -43.2728,
    color: "#16A34A",
    area: "Méier",
    km: 5.3,
    helpers: 0,
    equipment: ["Carrinho"],
    model: "Saveiro CS",
    plate: "LTX-2C17",
    workShift: "Seg a Sáb · 08h às 22h",
    responseTime: "6 min",
    completionRate: "96%",
    acceptanceRate: "90%",
    bio: "Bom para serviços ágeis, retirada em loja e transporte de móveis desmontados.",
    workAreas: ["Méier", "Engenho Novo", "Cachambi", "Del Castilho"],
    isOnline: true,
    reviews: [
      { author: "Carla B.", text: "Preço justo e boa comunicação. Ideal para fretes menores e rápidos.", rating: 5, when: "há 3 dias" },
      { author: "Renan A.", text: "Subiu o material sozinho e entregou tudo no tempo estimado.", rating: 5, when: "há 9 dias" },
    ],
    recentServices: [
      { label: "Frete urbano", when: "Último serviço", value: "R$65" },
      { label: "Retirada em loja", when: "Semana passada", value: "R$82" },
      { label: "Carga avulsa", when: "Este mês", value: "R$104" },
    ],
  },
  {
    id: "p-4",
    name: "Pedro Entrega",
    ini: "PE",
    vehicle: "Carro",
    cat: "Entrega",
    rating: 5.0,
    jobs: 31,
    price: "R$40",
    priceFrom: 40,
    lat: -22.9519,
    lng: -43.1864,
    color: "#9333EA",
    area: "Botafogo",
    km: 3.1,
    helpers: 0,
    equipment: [],
    model: "Fiat Uno 2020",
    plate: "QNV-6D55",
    workShift: "Qua a Dom · 09h às 21h",
    responseTime: "7 min",
    completionRate: "97%",
    acceptanceRate: "91%",
    bio: "Ideal para entregas urgentes, objetos menores e deslocamentos com comunicação rápida.",
    workAreas: ["Botafogo", "Humaitá", "Flamengo", "Urca"],
    isOnline: true,
    reviews: [
      { author: "Patricia V.", text: "Entrega rápida, cordial e com atualização constante pela plataforma.", rating: 5, when: "hoje" },
      { author: "Edu C.", text: "Excelente para correria do dia. Resposta muito rápida.", rating: 5, when: "há 4 dias" },
    ],
    recentServices: [
      { label: "Entrega expressa", when: "Último serviço", value: "R$40" },
      { label: "Coleta programada", when: "Semana passada", value: "R$52" },
      { label: "Pequenos volumes", when: "Este mês", value: "R$68" },
    ],
  },
  {
    id: "p-5",
    name: "João Mudanças",
    ini: "JM",
    vehicle: "Caminhão",
    cat: "Mudança",
    rating: 4.6,
    jobs: 55,
    price: "R$180",
    priceFrom: 180,
    lat: -22.9999,
    lng: -43.3653,
    color: "#FFCC00",
    area: "Barra",
    km: 9.2,
    helpers: 3,
    equipment: ["Rampa", "Cintas", "Carrinho", "Cobertores"],
    model: "VW Delivery",
    plate: "MHB-8F43",
    workShift: "Seg a Sáb · 05h às 18h",
    responseTime: "8 min",
    completionRate: "94%",
    acceptanceRate: "88%",
    bio: "Opera com equipe reforçada para mudanças maiores, eletros e carga com acesso difícil.",
    workAreas: ["Barra", "Recreio", "Jacarepaguá", "Curicica"],
    isOnline: false,
    reviews: [
      { author: "Mariana T.", text: "Equipe completa e cuidadosa. Deixaram tudo organizado no destino.", rating: 5, when: "há 5 dias" },
      { author: "Vinicius F.", text: "Bom para mudança maior e para itens que exigem amarração.", rating: 4, when: "há 11 dias" },
    ],
    recentServices: [
      { label: "Mudança residencial", when: "Último serviço", value: "R$180" },
      { label: "Transporte de móveis", when: "Semana passada", value: "R$230" },
      { label: "Montagem no destino", when: "Este mês", value: "R$290" },
    ],
  },
];

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
