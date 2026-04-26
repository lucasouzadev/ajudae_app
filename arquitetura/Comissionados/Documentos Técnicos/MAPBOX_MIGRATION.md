# Migração de MapLibre GL para Mapbox GL JS

> **Status:** Planejamento — início estimado Fase 2 (2026-05-15)
> **Decisão:** Migrar de MapLibre GL + OpenFreeMap para **Mapbox GL JS** antes do lançamento Beta
> **Owner:** CTO
> **Criado em:** 2026-04-16

---

## 1. Contexto e Motivação

### 1.1 Estado atual

- Biblioteca: **MapLibre GL JS** (open-source fork do Mapbox GL JS v1.13)
- Tiles: **OpenFreeMap** (gratuito, estilo "liberty")
- Features implementadas: pins de bairros, markers de prestadores, watchPosition, flyTo, clustering básico, bairro-based region detection
- Custo: **$0/mês**
- Uso: apenas web (PWA). Mobile ainda não implementado.

### 1.2 Problemas com a stack atual

| Problema                                                                              | Impacto                                                               |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| OpenFreeMap tem rate limit agressivo sem plano pago                                   | Cliente vê mapa cinza em horários de pico                             |
| Tiles de OpenFreeMap são atualizados esporadicamente                                  | Endereços novos podem não aparecer                                    |
| MapLibre não tem **Directions API** oficial (precisaríamos OSRM/Valhalla self-hosted) | ETA do prestador → cliente impossível de calcular com qualidade       |
| MapLibre não tem **Geocoding API**                                                    | Search de endereços feito via Nominatim (rate-limited, menos preciso) |
| Não existe **SDK mobile unificado** para Expo React Native                            | Migração mobile seria trabalho dobrado                                |
| Customização de estilo é manual (JSON style)                                          | Design não-padronizado                                                |

### 1.3 Por que Mapbox (e não Google Maps)?

| Critério                  | Mapbox                                | Google Maps                     |
| ------------------------- | ------------------------------------- | ------------------------------- |
| Custo até 100k loads/mês  | **$0** (free tier generoso)           | $200 de crédito, depois $7/1000 |
| Customização visual       | **Excelente** (Studio)                | Limitada                        |
| Directions API            | ✅ incluso                            | ✅ (com custo)                  |
| Geocoding                 | ✅ incluso                            | ✅ (com custo)                  |
| SDK Mobile (React Native) | ✅ oficial Mapbox                     | ✅ (custo adicional iOS)        |
| Offline maps              | ✅ (premium)                          | ❌                              |
| Vendor lock-in            | Baixo (mesma API pattern do MapLibre) | Alto                            |
| Dados brasileiros         | Bons                                  | Excelentes                      |

**Decisão:** **Mapbox**. Google Maps reavaliado na **Fase 9** (multi-cidade) caso a precisão de dados seja crítica.

---

## 2. Escopo da Migração

### 2.1 O que muda

- Biblioteca JavaScript: `maplibre-gl` → `mapbox-gl`
- Tiles: OpenFreeMap URL → Mapbox Style URL
- Autenticação: nenhuma → `mapboxgl.accessToken`
- Adicionar: Mapbox Directions API (novo)
- Adicionar: Mapbox Geocoding API (novo)

### 2.2 O que permanece

- ✅ Lógica de negócio (dispatch, bairros, clustering) — código neutro
- ✅ Coordenadas armazenadas no Postgres (provider_locations, profiles.lat/lng)
- ✅ Cálculo de distância (Haversine em `distanceKm()`)
- ✅ GeoJSON de bairros (`/api/rio/bairros`)
- ✅ Tipos em `ClientMapView.tsx` (ProviderPin, Bairro, etc.)

### 2.3 Arquivos impactados

| Arquivo                                                    | Mudança                                        | Estimativa |
| ---------------------------------------------------------- | ---------------------------------------------- | ---------- |
| `apps/web/app/client/ClientMapView.tsx`                    | Trocar import, ajustar style URL, access token | 2h         |
| `apps/web/app/provider/ProviderMapView.tsx`                | Mesma mudança                                  | 1h         |
| `apps/web/package.json`                                    | Remover maplibre-gl, adicionar mapbox-gl       | 10min      |
| `apps/web/lib/env.ts`                                      | Adicionar `NEXT_PUBLIC_MAPBOX_TOKEN`           | 10min      |
| `apps/web/app/client/ClientSearchBar`                      | Substituir autocomplete por Mapbox Geocoding   | 2h         |
| `apps/web/app/client/request/[id]/RequestTrackingView.tsx` | Adicionar ETA via Directions API               | 3h         |
| **NOVO:** `apps/web/lib/mapbox.ts`                         | Helpers (geocode, directions, eta)             | 2h         |
| `.env.local.example`                                       | Documentar novo env var                        | 5min       |
| `CLAUDE.md`                                                | Atualizar stack técnica                        | 10min      |
| `ARCHITECTURE.md`                                          | Atualizar seção Mapa                           | 20min      |

**Estimativa total:** 11 horas de dev (1.5 dias de trabalho).

---

## 3. Plano de Execução

### 3.1 Pré-requisitos

1. Criar conta Mapbox (https://mapbox.com)
2. Criar **access token** com escopos mínimos:
   - `styles:read`
   - `fonts:read`
   - `datasets:read`
   - `vision:read`
3. Configurar **URL restrictions** no token (limitar a `*.ajudaeh.com.br` + `localhost:3000`)
4. Setar budget alert em 80% do plano free (50k monthly active users)
5. Escolher um estilo base no Mapbox Studio (ou customizar um)

### 3.2 Passos (ordem obrigatória)

#### Passo 1 — Setup de ambiente (30min)

```bash
# Remover MapLibre
pnpm --filter @ajudaeh/web remove maplibre-gl

# Adicionar Mapbox
pnpm --filter @ajudaeh/web add mapbox-gl
pnpm --filter @ajudaeh/web add -D @types/mapbox-gl
```

```bash
# .env.local
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

```typescript
// apps/web/lib/env.ts — adicionar
export const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
export function hasMapboxEnv() {
  return !!mapboxToken && mapboxToken.startsWith('pk.')
}
```

#### Passo 2 — Refactor do ClientMapView (2h)

```typescript
// ANTES (MapLibre + OpenFreeMap)
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const map = new maplibregl.Map({
  container: ref.current,
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [-43.35, -22.93],
  zoom: 13,
})

// DEPOIS (Mapbox)
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { mapboxToken } from '../../lib/env'

mapboxgl.accessToken = mapboxToken!

const map = new mapboxgl.Map({
  container: ref.current,
  style: 'mapbox://styles/mapbox/light-v11', // ou style custom do Studio
  center: [-43.35, -22.93],
  zoom: 13,
})
```

**Nota:** a API é **95% idêntica**. Os imports `maplibregl.Map`, `maplibregl.Marker`, etc. viram `mapboxgl.*`. O resto do código (markers, layers, sources) não muda.

#### Passo 3 — Helpers Mapbox (2h)

Criar `apps/web/lib/mapbox.ts`:

```typescript
import { mapboxToken } from './env'

export async function geocodeAddress(query: string) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=br&language=pt&limit=5&proximity=-43.35,-22.93`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  return data.features as Array<{
    id: string
    place_name: string
    center: [number, number] // [lng, lat]
  }>
}

export async function getDirections(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${mapboxToken}&overview=full&geometries=geojson&language=pt`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Directions failed')
  const data = await res.json()
  const route = data.routes[0]
  return {
    durationSeconds: route.duration,
    distanceMeters: route.distance,
    geometry: route.geometry, // LineString para renderizar no mapa
    etaMinutes: Math.ceil(route.duration / 60),
  }
}
```

#### Passo 4 — Integrar Geocoding no Search Bar (2h)

Substituir o autocomplete fixo de BAIRROS por geocoding dinâmico com fallback para bairros locais.

#### Passo 5 — Integrar Directions em RequestTrackingView (3h)

- Quando status = `en_route`, chamar `getDirections(provider, client)` a cada 60s
- Renderizar LineString no mapa
- Exibir ETA em HUD flutuante

#### Passo 6 — Testes manuais (1h)

Checklist:

- [ ] Mapa renderiza corretamente no primeiro load
- [ ] Pins de bairros continuam aparecendo
- [ ] Markers de prestadores continuam sendo posicionados
- [ ] flyTo funciona
- [ ] watchPosition (geolocation) funciona
- [ ] Busca de endereço via geocoding retorna resultados
- [ ] Directions API calcula rota e ETA
- [ ] Sem erros no console
- [ ] Mobile (Chrome Android, Safari iOS) rendem corretamente
- [ ] Dark mode (style switch) funciona

#### Passo 7 — Limpeza (30min)

- Remover código morto relacionado ao OpenFreeMap fallback
- Atualizar documentação (CLAUDE.md, ARCHITECTURE.md)
- Remover `BAIRROS` constants se substituído por geocoding (ou manter como fallback offline)

---

## 4. Estrutura de Custo

### 4.1 Free tier Mapbox (suficiente para Beta)

- Map Loads: **50.000/mês** grátis
- Directions API: **100.000 requests/mês** grátis
- Geocoding API: **100.000 requests/mês** grátis
- Matrix API: **100.000 requests/mês** grátis

### 4.2 Projeção para Beta (100 usuários ativos)

| Feature                                       | Requests/usuário/mês | Total mês | Free tier? |
| --------------------------------------------- | -------------------- | --------- | ---------- |
| Map Loads                                     | ~150                 | 15k       | ✅         |
| Geocoding (busca endereço)                    | ~20                  | 2k        | ✅         |
| Directions (ETA a cada 60s em pedidos ativos) | ~100                 | 10k       | ✅         |

**Custo estimado Beta:** $0/mês

### 4.3 Projeção para Produção Real (1k usuários)

- Map Loads: ~150k/mês → paga **$0.50 por 1k = $50**
- Directions: ~100k/mês → **$0.20 por 1k = $20**
- Geocoding: ~20k/mês → **$0.75 por 1k = $15**

**Custo estimado 1k usuários ativos:** ~**$85/mês** (~R$ 425)

### 4.4 Projeção para 10k usuários

**~$450/mês** (~R$ 2.250) — ainda barato comparado a Google Maps

---

## 5. Riscos e Mitigações

| Risco                                         | Mitigação                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Token comprometido (subido para repo público) | URL restriction no token + Git hook de secret scan                     |
| Custo surpresa (pico de uso)                  | Budget alert em 80% via Mapbox dashboard                               |
| Degradação Mapbox (outage)                    | Fallback para MapLibre + OpenFreeMap (código legado mantido comentado) |
| Mobile SDK diferente da web                   | Usar @rnmapbox/maps (SDK oficial) na Fase 5 (mobile Expo)              |
| Rate limit inesperado em Geocoding            | Cache em Redis (Upstash) das buscas populares                          |
| Bloqueio pelo Brasil (sanções, etc.)          | Improvável, mas manter MapLibre como plano B                           |

---

## 6. Checklist de Go-Live

### Pré-deploy

- [ ] Access token criado com URL restrictions
- [ ] Budget alert configurado
- [ ] Variável `NEXT_PUBLIC_MAPBOX_TOKEN` adicionada na Vercel (preview + production)
- [ ] Variável documentada em `.env.local.example`
- [ ] Código em branch `feat/mapbox-migration`
- [ ] PR revisado pelo CTO

### Deploy (blue-green)

- [ ] Deploy em preview (Vercel preview URL)
- [ ] Smoke test em preview: cliente + prestador + admin
- [ ] Deploy em production
- [ ] Monitorar Sentry + PostHog por 24h
- [ ] Verificar Mapbox dashboard (loads, errors, latency)

### Pós-deploy

- [ ] Atualizar `CLAUDE.md` (stack técnica)
- [ ] Atualizar `ARCHITECTURE.md` (diagrama + seção Mapa)
- [ ] Notificar equipe
- [ ] Arquivar código MapLibre em branch `archive/maplibre` para referência

---

## 7. Rollback Plan

Se Mapbox falhar em produção:

1. Rebase para commit anterior à migração (ou revert em produção)
2. Reverter deploy na Vercel (1 clique)
3. MapLibre volta a funcionar imediatamente
4. Investigar erro no Sentry + Mapbox dashboard
5. Rollforward após fix

**RTO (rollback):** < 5 minutos (revert Vercel).

---

## 8. Próximos Passos Após Migração

### 8.1 Otimizações de UX

- Mapbox Studio: criar estilo personalizado Ajudaê (cores de marca, POIs relevantes)
- Usar `PulsingDot` ou `AnimatedLine` para marcadores de prestador em movimento
- 3D buildings em zoom alto (visual premium)

### 8.2 Features Premium

- **Isochrones API:** mostrar área alcançável em X minutos (planning)
- **Matrix API:** matchmaking otimizado (N prestadores × M clientes)
- **Static Images API:** thumbnails de rotas em receipts/notificações

### 8.3 Mobile (Fase 5)

- Expo React Native + `@rnmapbox/maps`
- Same token + same style URL
- Offline maps em áreas frequentes (premium feature)

---

## 9. Referências

- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [Mapbox Pricing](https://www.mapbox.com/pricing)
- [Migration from MapLibre to Mapbox](https://docs.mapbox.com/help/troubleshooting/migrate-from-mapbox-js-v1/) (inversa, mas útil)
- [Mapbox Studio](https://studio.mapbox.com/) (editor visual de estilos)
- [@rnmapbox/maps](https://github.com/rnmapbox/maps) (React Native SDK oficial)

---

**Assinatura:** CTO — 2026-04-16
**Status:** Aprovado, aguardando início da Fase 2 (2026-05-15)
