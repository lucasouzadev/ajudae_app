# iOS Dev Client Build — Ajudaê

Guia para gerar Dev Client para iOS (similar ao Android, mas com Xcode/Testflight).

---

## 🍎 Pré-requisitos para iOS

- **Mac** (Windows/Linux não pode buildar para iOS nativamente)
- **Conta Apple Developer** ($99/ano)
- **Xcode** instalado

**Alternativa no Windows:** Você pode buildar no Android e testar funcionalidade do Google Maps lá. iOS pode vir depois.

---

## 📱 Opção A: Build via EAS (Recomendado)

Muito similar ao Android:

```bash
cd artifacts/fretex
eas build --platform ios --profile development
```

**Resultado:** Testflight link para instalar no seu iPhone/iPad via Apple Testflight app

**Tempo:** 15-20 min na primeira build

---

## 🧪 Instalando via TestFlight

Quando o build completar:

1. Abra o **link do Testflight** que aparece no terminal
2. Clique em "Install" no seu iPhone
3. Abra o app Dev Client
4. Escanear QR code do `npx expo start --dev-client`

---

## ⚙️ Opção B: Build Local com Xcode (Avançado)

Se tiver Mac + Xcode:

```bash
eas build --platform ios --local
```

Xcode irá compilar localmente, é mais rápido se você tiver máquina potente.

---

## 🔑 Credentials para iOS

Primeira vez que você buildar para iOS, EAS pedirá:

- **Apple ID** (email da sua conta Apple)
- **App-specific password** (gerar em [appleid.apple.com](https://appleid.apple.com/account/security))

EAS salva isso de forma segura para builds futuros.

---

## 📦 Depois de Testado no iOS

Quando satisfeito com Google Maps no iOS:

```bash
# Gerar build preview (para beta testers)
eas build --platform ios --profile preview

# Ou production (para App Store)
eas build --platform ios --profile production
```

---

## ⚠️ Importante

- **Dev Client = desenvolvimento apenas**
- Não envie link de TestFlight para usuários reais
- Sempre teste em iPhone físico antes de produção
- Certificados expira em alguns anos, renevar no Apple Developer

---

## 🎯 Próximas Ações (Ambas Plataformas)

Depois de ambos builds funcionando:

1. [ ] Substituir MapSVG por MapReal
2. [ ] Testar Google Maps em ambas plataformas
3. [ ] Atualizar coordenadas mock (Rio de Janeiro)
4. [ ] Build preview para QA testers
5. [ ] Submeter para App Store / Google Play (Fase 2)

---

_Ajudaê — iOS Build Guide — 2026-04-28_
