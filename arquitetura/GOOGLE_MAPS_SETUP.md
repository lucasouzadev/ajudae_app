# Setup Google Maps — Ajudaê

> Guia para substituir o mapa SVG mock pelo Google Maps real.
> Estimativa: ~2–3h de setup + 1–2h de integração no código.

---

## 1. Criar API Key no Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie ou selecione um projeto (ex: `ajudae-app`)
3. Vá em **APIs & Services → Library**
4. Ative as seguintes APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
   - **Geocoding API** (para converter endereços em coordenadas)
   - **Directions API** (para rotas entre origem e destino — necessário no fluxo de serviço)
5. Vá em **APIs & Services → Credentials → Create Credentials → API Key**
6. Restrinja a key por plataforma (Android: package name `com.ajuda.app` / iOS: bundle ID `com.ajuda.app`)

---

## 2. Instalar `react-native-maps`

```bash
cd artifacts/fretex
npx expo install react-native-maps
```

> **Importante:** O Expo Go padrão **não suporta** Google Maps (apenas Apple Maps no iOS).
> Para usar Google Maps você precisará de um **Expo Dev Client** ou **build standalone (EAS Build)**.

### Gerar Dev Client (recomendado para desenvolvimento):
```bash
npx expo install expo-dev-client
npx eas build --profile development --platform android  # ou ios
```

---

## 3. Configurar `app.json`

Adicione as keys dentro do objeto `expo`:

```json
{
  "expo": {
    "android": {
      "package": "com.ajuda.app",
      "config": {
        "googleMaps": {
          "apiKey": "SUA_API_KEY_ANDROID_AQUI"
        }
      }
    },
    "ios": {
      "bundleIdentifier": "com.ajuda.app",
      "config": {
        "googleMapsApiKey": "SUA_API_KEY_IOS_AQUI"
      }
    },
    "plugins": [
      "react-native-maps"
    ]
  }
}
```

---

## 4. Substituir MapSVG por MapView real

Arquivo alvo: `artifacts/fretex/components/MapSVG.tsx` → substituir por `MapView`.

### Código de referência para `components/MapReal.tsx`:

```tsx
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { StyleSheet } from "react-native";

const RIO_COORDS = {
  latitude: -22.9068,
  longitude: -43.1729,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export function MapReal({ providers, activeRoute }) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      initialRegion={RIO_COORDS}
      showsUserLocation
      showsMyLocationButton={false}  // usamos botão próprio
    >
      {providers.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat, longitude: p.lng }}
          // usar ProviderPin como custom marker
        />
      ))}

      {/* Rota quando há serviço ativo */}
      {activeRoute && (
        <Polyline
          coordinates={activeRoute}
          strokeColor="#2563EB"
          strokeWidth={4}
        />
      )}
    </MapView>
  );
}
```

### Coordenadas reais dos prestadores:
- Substituir `p.lat` / `p.lng` (atualmente valores mock 0–100) por coordenadas reais no Rio de Janeiro
- Atualizar `constants/mockData.ts` com `lat: -22.9xxx` e `lng: -43.1xxx`

---

## 5. Localização do usuário (expo-location — já instalado)

`expo-location` já está no `package.json`. Ao migrar para mapa real:

```tsx
import * as Location from "expo-location";

// No componente ClienteHome:
const [userCoords, setUserCoords] = useState(null);

const locateMe = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return;
  const loc = await Location.getCurrentPositionAsync({});
  setUserCoords(loc.coords);
  mapRef.current?.animateToRegion({
    ...loc.coords,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
};
```

O botão "Localizar" já está na UI (ícone `locate` em `index.tsx`, linha ~1095).
Apenas conectar ao `locateMe()` acima.

---

## 6. Rotas e Direções (Directions API)

Para mostrar a rota do prestador até o cliente (como na 99):

```tsx
const getRoute = async (origin, destination) => {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=SUA_KEY`
  );
  const data = await res.json();
  // Decodificar polyline de data.routes[0].overview_polyline.points
  // Usar biblioteca `@mapbox/polyline` para decode
};
```

---

## 7. Checklist final antes de ativar

- [ ] API Key criada e restrita por plataforma
- [ ] `react-native-maps` instalado
- [ ] `app.json` atualizado com as keys
- [ ] Dev Client ou EAS Build gerado
- [ ] `MapSVG` substituído por `MapView` em `index.tsx`
- [ ] Coordenadas mock atualizadas para valores reais (Rio de Janeiro)
- [ ] Botão "Localizar" conectado ao `expo-location`
- [ ] Directions API testada para rota no fluxo de serviço ativo

---

_Ajudaê — Google Maps Setup Guide — 2026-04-27_
