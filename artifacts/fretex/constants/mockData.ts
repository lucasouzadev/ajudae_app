export interface Provider {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  category: string;
  priceFrom: number;
  neighborhood: string;
  lat: number;
  lng: number;
  isOnline: boolean;
  truckPhoto: string;
}

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'p-1',
    name: 'Carlos Oliveira',
    avatar: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?q=80&w=200&auto=format&fit=crop',
    rating: 4.9,
    reviews: 124,
    category: 'Mudança',
    priceFrom: 150,
    neighborhood: 'Vila Madalena',
    lat: -23.551,
    lng: -46.687,
    isOnline: true,
    truckPhoto: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p-2',
    name: 'Roberto Mendes',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
    rating: 4.7,
    reviews: 89,
    category: 'Frete Pequeno',
    priceFrom: 80,
    neighborhood: 'Pinheiros',
    lat: -23.560,
    lng: -46.695,
    isOnline: true,
    truckPhoto: 'https://images.unsplash.com/photo-1553456558-aff63285faa1?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p-3',
    name: 'José Souza',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    rating: 4.8,
    reviews: 210,
    category: 'Carreto',
    priceFrom: 100,
    neighborhood: 'Moema',
    lat: -23.600,
    lng: -46.660,
    isOnline: false,
    truckPhoto: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=400&auto=format&fit=crop',
  },
];
