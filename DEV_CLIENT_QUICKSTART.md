# Dev Client Quickstart — Ajudaê

Guia rápido para testar Google Maps com o Dev Client recém-gerado.

---

## 📲 Passo 1: Instalar Dev Client no Device

Quando o EAS Build terminar:

1. **Abra o link do download** que aparecerá no terminal
2. **Baixe o arquivo `.apk`** (Android) ou `.ipa` (iOS)
3. **Instale no seu device:**
   - Android: Transfira para o device → abra gerenciador de arquivos → toque em `.apk`
   - iOS: Conecte via Xcode ou use TestFlight

---

## 🚀 Passo 2: Rodar o Servidor Dev

No terminal, na pasta do projeto:

```bash
cd artifacts/fretex
npx expo start --dev-client
```

Você verá:
```
› Press a to open Android
› Press i to open iOS
› Press w to open web
Press q to exit
```

---

## 📱 Passo 3: Conectar ao Device

**No seu Android/iOS device:**

1. Abra o **app Dev Client** que acabou de instalar
2. **Escanear o QR code** que aparece no terminal (ou via câmera)
3. Selecione a rede WiFi se solicitado
4. **Aguarde ~30 segundos** enquanto carrega

**Boom! 💥** Você está testando Google Maps em tempo real!

---

## 🗺️ Testando Google Maps

Na tela `Marketplace`:

- [ ] Mapa Google Maps carrega com pins
- [ ] Botão "localizar" funciona
- [ ] Toque em pin mostra detalhes
- [ ] "Toque para explorar" abre mapa expandido
- [ ] Sem erros de API Key

---

## 🔄 Workflow de Desenvolvimento

```bash
# Terminal 1: Dev Server
npx expo start --dev-client

# Terminal 2: Editar código
# Sua IDE (VS Code, etc)

# No device:
# Salvar arquivo → app recarrega automaticamente
# Se precisar recompilar módulos nativos → R
```

---

## 🐛 Se Algo Quebrar

### "App não conecta ao servidor"
```bash
npx expo start --clear
```

### "Erro de API Key"
- Verificar `app.json` tem chave correta
- Rebuild: `eas build --platform android --profile development`

### "Tela branca / não carrega"
- Pressione `R` no terminal para reload
- Verifique console: `npx expo start --verbose`

---

## 📦 Depois de Testar

Quando satisfeito com Google Maps:

1. **Substituir MapSVG por MapReal** em `components/MarketMap.tsx`
2. **Atualizar coordenadas mock** em `constants/mockData.tsx`
3. **Commit das mudanças**
4. **Próxima build:** `eas build --platform android --profile preview` (para distribui

r beta)

---

## 🚨 Importante

⚠️ **Dev Client é apenas para desenvolvimento.** Não distribua para usuários reais.

Para produção, faça um build **production** via EAS ou `eas build --platform android --profile production`.

---

_Ajudaê — Dev Client Quick Start — 2026-04-28_
