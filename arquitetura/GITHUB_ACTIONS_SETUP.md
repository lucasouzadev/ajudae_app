# GitHub Actions — Workflows de Build & Deploy

**Status:** ✅ Configurado para EAS Build + TestFlight/APK + EAS Updates  
**Data:** 2026-05-28  
**Workflows:** 2 (build.yml + eas-update.yml)

---

## 📋 Overview

Existem 2 workflows configurados para automatizar builds e updates:

| Workflow | Trigger | Função | Plataformas |
|----------|---------|--------|-------------|
| **EAS Build** | Manual (workflow_dispatch) | Build iOS (TestFlight) + Android (APK) | ios / android / all |
| **EAS Update** | Manual (workflow_dispatch) | Deploy OTA via canais EAS | preview / production |

---

## 🔧 Configuração Necessária

### 1. EXPO_TOKEN Secret (CRÍTICO)

**Localização:** GitHub → Settings → Secrets and variables → Actions

**Pré-requisito:** Token criado no EAS da conta `juiceluqi`

**Como criar o token (se não existir):**

```bash
# 1. No terminal local (autenticado com juiceluqi)
eas token:create --non-interactive

# 2. Copia o token gerado
# 3. GitHub → Settings → Secrets and variables → Actions
# 4. New repository secret:
#    - Name: EXPO_TOKEN
#    - Value: <token_aqui>
```

**Como verificar se já existe:**
```bash
# No repositório local:
gh secret list
# Se vazio, precisa criar
```

---

## 🚀 Como Usar os Workflows

### Build iOS para TestFlight

```
GitHub → Actions → EAS Build → Run workflow
├── platform: ios
├── profile: preview (ou production)
└── Run
```

**Sequência automática:**
1. ✅ Checkout código
2. ✅ Setup Node.js + pnpm
3. ✅ Install dependencies
4. ✅ EAS Login (via EXPO_TOKEN)
5. ✅ `eas build --platform ios --profile preview`
6. ✅ **Aguarda ~15-30 min**
7. ✅ `eas submit --platform ios --latest`
8. ✅ **TestFlight: 1-24h para aprovação Apple**

**Resultado:**
- Build ID no EAS Dashboard
- Link no App Store Connect (TestFlight)
- Notificação aos testers configurados

---

### Build Android para APK

```
GitHub → Actions → EAS Build → Run workflow
├── platform: android
├── profile: preview (ou production)
└── Run
```

**Sequência automática:**
1. ✅ Checkout código
2. ✅ Setup Node.js + pnpm
3. ✅ Install dependencies
4. ✅ EAS Login (via EXPO_TOKEN)
5. ✅ `eas build --platform android --profile preview`
6. ✅ **Aguarda ~10-20 min**

**Resultado:**
- Build ID no EAS Dashboard
- Download direto: `https://expo.dev/accounts/juiceluqi/projects/ajudae/builds`
- APK pronto para distribuição (Firebase App Distribution, TestFlight internal, Google Play, etc)

---

### Build Ambas Plataformas

```
GitHub → Actions → EAS Build → Run workflow
├── platform: all
├── profile: preview (ou production)
└── Run
```

**Sequência:**
1. Build Android (10-20 min)
2. Submit Android (N/A, APK fica no dashboard)
3. Build iOS (15-30 min)
4. Submit iOS para TestFlight (automático)

**Total:** ~30-60 min

---

### EAS Update (Over-the-Air)

```
GitHub → Actions → EAS Update → Run workflow
├── channel: preview (ou production)
├── message: "Descrição do update"
└── Run
```

**Sequência:**
1. ✅ Checkout código
2. ✅ Setup Node.js + pnpm
3. ✅ Install dependencies
4. ✅ EAS Login (via EXPO_TOKEN)
5. ✅ `eas update --channel preview --message "..."`
6. ✅ **Aguarda ~2-5 min**

**Resultado:**
- Update publicado no canal `preview` ou `production`
- Apps em field checam automaticamente (checkAutomatically: ON_LOAD)
- Download + install em background (usuário não vê)
- Próxima vez que abre, nova versão está ativa

**Nota:** Canais são definidos em `eas.json`:
```json
"build": {
  "preview": { "channel": "preview" },
  "production": { "channel": "production" }
}
```

---

## 📊 Estado das Plataformas

### iOS
- ✅ Bundle ID: `com.ajuda.app`
- ✅ Distribution: `store` (TestFlight)
- ✅ Perfil: `preview` (desenvolvimento/teste)
- ✅ Submit: Automático após build
- ⏳ Pré-requisito: Apple Team ID configurado no EAS

### Android
- ✅ Package: `com.ajuda.app`
- ✅ Build Type: `apk`
- ✅ Distribution: `internal` (distribuição manual)
- ✅ Perfil: `preview` (desenvolvimento/teste)
- ✅ Pronto: APK pode ser distribuído via Firebase, Google Play, etc

### Canais EAS
- ✅ `preview`: Para testes fechados (TestFlight + APK)
- ✅ `production`: Para lançamento público
- ✅ Updates OTA: Ambos os canais suportam

---

## 🔍 Monitoramento & Debug

### Ver Builds no Dashboard
```
https://expo.dev/accounts/juiceluqi/projects/ajudae/builds
```

### Ver Logs de um Build
```bash
eas build:list --limit 5
eas build:view <BUILD_ID>
```

### Ver Buildlogs Completos
```bash
eas build:logs <BUILD_ID>
```

### Verificar Secrets no GitHub
```bash
gh secret list
# Saída: EXPO_TOKEN *** (mascarado)
```

---

## 📱 Testadores

### Adicionar Testers no TestFlight
```
Apple App Store Connect
→ TestFlight
→ Internal Testers (ou External Testers)
→ Add emails
```

Os testers vão receber convite + link para instalar pelo TestFlight app.

### Distribuir APK
**Opção A — Link direto do EAS:**
```
Copiar URL de download do APK no EAS Dashboard
Enviar por email/Slack
Tester clica → download → instala (permitir "fontes desconhecidas")
```

**Opção B — Firebase App Distribution:**
```bash
firebase appdistribution:distribute app.apk \
  --app <FIREBASE_APP_ID> \
  --groups testers \
  --release-notes "v1.0.0 build X"
```

**Opção C — Google Play Internal Testing:**
```
Google Play Console
→ Testing → Internal testing
→ Upload APK/AAB
→ Add testers
```

---

## ✅ Pre-Flight Checklist

Antes de rodar o primeiro workflow:

- [ ] EXPO_TOKEN configurado em GitHub Secrets
- [ ] Conta Apple Developer ativa + vinculada ao EAS
- [ ] Apple Team ID configurado no EAS → Build settings → iOS
- [ ] Provisioning profile e certificate válidos (Apple)
- [ ] Google Maps API Key configurada nos EAS Secrets (✅ já feito)
- [ ] Supabase anon key configurada nos EAS Secrets (✅ já feito)
- [ ] `runtimeVersion` em app.config.js está `{ policy: "appVersion" }` (✅ correto)
- [ ] Canais em eas.json estão definidos (✅ preview e production)
- [ ] Bundle ID / Package name corretos (✅ com.ajuda.app)

---

## 🚨 Troubleshooting

### "EXPO_TOKEN not found"
```
GitHub Actions → Logs
Error: EXPO_TOKEN secret not configured

Solução:
1. GitHub → Settings → Secrets → EXPO_TOKEN
2. Se não existe, executar: eas token:create
3. Copiaar token → GitHub Secrets
```

### "Build fails: Apple credentials not configured"
```
Solução:
1. EAS Dashboard → Projects → ajudae → Build settings
2. iOS → App credentials
3. Se vazio, clicar "Create new"
   ou "Setup credentials" (EAS pedirá conta Apple)
4. Aguardar 5-10 min, tentar build novamente
```

### "eas submit: Distribution certificate expired"
```
Solução:
1. EAS Dashboard → Credentials → iOS
2. Renovar certificate (EAS faz automaticamente)
3. Tentar submit novamente
```

### "APK não instala no Android: app.aab obrigatório"
```
Para Play Store: sim, precisa .aab
Para teste: APK funciona normalmente
Verifique: eas.json → preview → android → buildType: "apk" ✅
```

---

## 📚 Documentação de Referência

| Recurso | URL |
|---------|-----|
| EAS Build Docs | https://docs.expo.dev/build/introduction/ |
| EAS Submit Docs | https://docs.expo.dev/submit/introduction/ |
| EAS Update Docs | https://docs.expo.dev/eas-update/introduction/ |
| GitHub Actions | https://github.com/expo/expo-github-action |
| EAS Dashboard | https://expo.dev/accounts/juiceluqi/projects/ajudae |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |

---

## Workflow Files

### `.github/workflows/build.yml`
- Manual trigger (workflow_dispatch)
- Platforms: android | ios | all
- Profiles: preview | production
- iOS: Auto-submit para TestFlight
- Android: APK no dashboard EAS

### `.github/workflows/eas-update.yml`
- Manual trigger (workflow_dispatch)
- Channels: preview | production
- Message: Descrição do update (optional)
- OTA deploy para ambos iOS + Android

---

_Last Updated: 2026-05-28_
