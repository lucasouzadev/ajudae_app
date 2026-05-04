# Google Maps — Próximos Passos Manuais

**Status:** Setup 95% completo. O EAS build teve problema de conexão (network issue). Aqui está como continuar manualmente.

---

## 🎯 Opção 1: Rodar Build Manualmente (Recomendado)

Em um terminal na raiz do projeto:

```bash
cd artifacts/fretex
eas build --platform android --profile development
```

Este comando:
1. ✅ Irá compilar o app
2. ✅ Gerar arquivo `.apk` (download link aparecerá no terminal)
3. ✅ Você pode redownload a qualquer momento no dashboard EAS

**Tempo:** 15-25 minutos (primeira build é mais lenta)

---

## 📱 Assim que o Build Terminar

1. **Copia o link de download** que aparece no terminal
2. **No seu Android phone:**
   - Abre o link
   - Baixa o `.apk`
   - Gerenciador de arquivos → encontra o .apk → toca para instalar
   - Permite instalação de fonte desconhecida se pedir

3. **Abre o app Dev Client** que foi instalado

---

## 🚀 Depois: Rodar Expo Dev Server

Em outro terminal:

```bash
cd artifacts/fretex
npx expo start --dev-client
```

Vai aparecer:
```
› Metro Bundler ready at http://localhost:8081
› Press a to open Android
› Press w to open web
Press q to exit
```

---

## 📲 Conectar Phone ao Server

**No seu Android:**

1. Abre o app **Dev Client** (que instalou do .apk)
2. **Escaneia o QR code** que aparece no terminal (ou escreve manualmente)
3. Seleciona WiFi se pedir
4. **Aguarda 20-30 segundos** enquanto carrega

**Boom!** 🎉 Seu app com Google Maps está rodando!

---

## ✅ Testes Rápidos

Dentro do app, teste:

- [ ] Tela Marketplace → mapa carrega com pins reais
- [ ] Toque em um pin → mostra detalhes
- [ ] Botão "Toque para explorar" → abre mapa expandido
- [ ] Não há erros de "API Key invalid"
- [ ] Pins aparecem em locais corretos (Rio de Janeiro)

Se tudo funcionar, Google Maps está configurado! ✅

---

## 🔄 Workflow de Desenvolvimento

Agora que Dev Client está rodando:

```bash
# Terminal 1: Dev Server (já rodando)
npx expo start --dev-client

# Terminal 2: Editar código
# Abra sua IDE (VS Code, etc)
# Edite arquivos

# No phone:
# Arquivo salvo → app recarrega automaticamente
# Se precisar forçar reload, aperte: R (no terminal)
```

---

## 📝 Próximo Task: Integrar Google Maps Real

Quando estiver 100% confortável que tudo funciona:

### 1. Substituir MapSVG por MapReal

**Arquivo:** `artifacts/fretex/components/MarketMap.tsx`

**Linha ~7:** Mudar:
```tsx
import { MapSVG } from "./MapSVG";
```

Para:
```tsx
import { MapReal } from "./MapReal";
```

**Linha ~36:** Mudar:
```tsx
<MapSVG />
```

Para:
```tsx
<MapReal 
  pins={pins} 
  activeId={activeId} 
  onPinPress={onPinPress} 
  height={height - 100} 
/>
```

### 2. Atualizar Coordenadas Mock

**Arquivo:** `artifacts/fretex/constants/mockData.tsx`

Procure por `MOCK_PROVIDERS` e mude as coordenadas:

```typescript
// Antes
lat: 35, lng: 45

// Depois (Rio de Janeiro real)
lat: -22.9068 + Math.random() * 0.05,
lng: -43.1729 + Math.random() * 0.05
```

---

## 🆘 Se Quebrar algo

### Build não carrega
```bash
npx expo start --dev-client --clear
```

### Phone não conecta
- Verificar se phone e computador estão na mesma WiFi
- Restart do router
- Rodar novamente: `npx expo start --dev-client`

### App crash / erro estranho
- Checar console no terminal
- Pressione `R` para reload
- Se persistir, verificar `app.json` tem API Key correta

---

## 📚 Documentação Criada

Leia estes em ordem:

1. `GOOGLE_MAPS_INTEGRATION.md` — Visão geral da integração
2. `DEV_CLIENT_QUICKSTART.md` — Como usar Dev Client (este é mais prático)
3. `IOS_BUILD_GUIDE.md` — Para quando quiser fazer iOS (precisa de Mac)
4. `MAPS_SETUP_STATUS.md` — Status e checklist

---

## 🎯 Timeline Realístico

| Passo | Tempo | Quando |
|-------|-------|--------|
| EAS Build para Android | 20 min | Agora |
| Instalar .apk no phone | 5 min | Após build |
| Rodar Dev Server | 2 min | Imediato |
| Conectar phone | 2 min | Imediato |
| Testar funcionamento | 5 min | Imediato |
| Integrar MapReal | 15 min | Quando pronto |
| **Total** | **~50 min** | Hoje |

---

## ✨ Quando Está 100% Funcionando

Você terá:
- ✅ Google Maps rodando no seu phone
- ✅ Pins em tempo real com cores customizadas
- ✅ Localização do usuário funcionando
- ✅ Preparado para implementar Directions API (rotas)

---

_Ajudaê — Next Steps for Google Maps — 2026-04-28_
