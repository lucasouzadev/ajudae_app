# Google Maps Integration — Ajudaê

**Status:** Setup inicial completo ✅  
**Data:** 2026-04-28  
**Próximo passo:** Gerar Dev Client e substituir MapSVG por MapReal

---

## ✅ Concluído

- [x] `react-native-maps` v1.20.1 instalado
- [x] `expo-dev-client` v55.0.28 instalado
- [x] `app.json` configurado com Google Maps API Key
- [x] Plugin `react-native-maps` adicionado
- [x] `components/MapReal.tsx` criado

---

## 📋 Próximos Passos

### 1. Gerar Expo Dev Client (Necessário para usar Google Maps)

**Por quê:** Expo Go padrão não suporta Google Maps. Você precisa de um build customizado.

```bash
# Instalar EAS CLI (tool para build)
npm install -g eas-cli

# Fazer login (use conta Expo)
eas login

# Gerar dev client para Android
eas build --profile development --platform android

# Ou para iOS
eas build --profile development --platform ios
```

**Tempo estimado:** 10-15 min (primeira build é mais lenta)

**Resultado:** Download de `.apk` (Android) ou `.ipa` (iOS) para instalar no device

---

### 2. Substituir MapSVG por MapReal

#### 2.1 Na página `artifacts/fretex/app/index.tsx` (ClienteHome)

**Localizar (linha ~434):**
```tsx
<MarketMap
  pins={onlinePins}
  activeId={activePin}
  onPinPress={(id) => setActivePin(id === activePin ? null : id)}
  title="Prestadores ao vivo"
  subtitle={`${onlinePins.length} online · disponíveis agora`}
  badgeColor={c.success}
  onExpand={() => setMapExpanded(true)}
/>
```

**Não precisa mudar nada!** `MarketMap` ainda usa `MapSVG` internamente.

#### 2.2 Em `components/MarketMap.tsx`

**Substituir a linha:**
```tsx
import { MapSVG } from "./MapSVG";
```

**Por:**
```tsx
import { MapReal } from "./MapReal";
```

**E substituir na função:**
```tsx
<MapSVG />
```

**Por:**
```tsx
<MapReal pins={pins} activeId={activeId} onPinPress={onPinPress} height={height - 100} />
```

---

### 3. Atualizar Coordenadas Mock

**Arquivo:** `constants/mockData.tsx`

**Procurar por MOCK_PROVIDERS e atualizar coordenadas:**

```typescript
// Antes (SVG percentual 0-100)
lat: 35, lng: 45

// Depois (coordenadas reais Rio de Janeiro)
lat: -22.9068 + Math.random() * 0.05,
lng: -43.1729 + Math.random() * 0.05
```

**Ranges reais para Rio:**
- Latitude: `-22.75` a `-23.05` (norte-sul)
- Longitude: `-43.10` a `-43.50` (leste-oeste)

---

### 4. Testar no Device

```bash
# Terminal 1: Rodar dev client
npx expo start --dev-client

# Terminal 2: No device, abrir o app gerado no passo 1
# Escanear QR code quando aparecer

# Você verá o mapa real do Google Maps! 🗺️
```

---

## ⚠️ Troubleshooting

### "Map não carrega no device"
- Verificar se Dev Client foi instalado corretamente
- Verificar se API Key está correta em `app.json`
- Verificar internet no device

### "API Key inválida"
- Ir em [Google Cloud Console](https://console.cloud.google.com)
- Verificar se APIs de Maps estão ativadas
- Gerar nova chave se necessário

### "Device não conecta ao Metro"
- Certificar que device e PC estão na mesma rede WiFi
- Rodar `npx expo start --clear`

---

## 📊 Próximas Features

1. **Geolocalização do usuário** — `expo-location` já instalado
2. **Rotas em tempo real** — Directions API
3. **Pins customizados** — Ícones + cores do prestador
4. **Heatmap** — Mostrar areas quentes

---

## 🔐 Segurança da API Key

⚠️ **IMPORTANTE:** Sua chave está em `app.json` (público no código).

**Para produção:**
1. Usar variáveis de ambiente
2. Restringir chave no Google Cloud (apenas Android package `com.ajuda.app` e iOS bundle `com.ajuda.app`)
3. Limitar APIs específicas (Maps, Geocoding, Directions)

---

_Ajudaê — Google Maps Integration Guide — 2026-04-28_
