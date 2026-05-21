# EAS Build CI + EAS Update — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir `eas.json` para TestFlight e criar dois workflows GitHub Actions (build manual + OTA update manual) para o app Ajudaê.

**Architecture:** Três arquivos independentes sem dependências entre si — `eas.json` é uma correção pontual, os dois workflows são criados do zero em `.github/workflows/`. A ordem das tasks importa apenas para o commit final ser limpo; cada task pode ser verificada isoladamente.

**Tech Stack:** EAS CLI (expo-eas), GitHub Actions, pnpm 10.x, Node 20.x, expo/expo-github-action@v8

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `artifacts/fretex/eas.json` | Modificar | Corrigir `distribution` iOS no perfil `preview` para `"store"` |
| `.github/workflows/build.yml` | Criar | Workflow `workflow_dispatch` de build EAS (APK + TestFlight) |
| `.github/workflows/eas-update.yml` | Criar | Workflow `workflow_dispatch` de OTA update via EAS Update |

---

## Task 1: Corrigir `eas.json` para suporte a TestFlight

**Files:**
- Modify: `artifacts/fretex/eas.json`

O problema: `distribution: "internal"` no nível raiz do perfil `preview` aplica distribuição ad-hoc ao iOS também, impedindo submissão ao TestFlight. A correção move `distribution` para dentro de cada plataforma.

- [ ] **Step 1: Abrir e editar `artifacts/fretex/eas.json`**

Substituir o conteúdo completo do arquivo por:

```json
{
  "cli": {
    "version": ">= 18.8.1",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "channel": "preview",
      "android": {
        "distribution": "internal",
        "buildType": "apk"
      },
      "ios": {
        "distribution": "store"
      },
      "env": {
        "EXPO_PUBLIC_MAP_PROVIDER": "google"
      }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_MAP_PROVIDER": "google"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 2: Validar JSON**

```bash
node -e "require('./artifacts/fretex/eas.json'); console.log('JSON válido')"
```

Esperado: `JSON válido`

- [ ] **Step 3: Commit**

```bash
git add artifacts/fretex/eas.json
git commit -m "fix(eas): corrige distribution iOS no perfil preview para TestFlight

Perfil preview agora gera APK (android/internal) e IPA para
TestFlight (ios/store) em vez de ad-hoc para ambas as plataformas.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Criar workflow de build EAS (`.github/workflows/build.yml`)

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Criar a pasta `.github/workflows/`**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Criar `.github/workflows/build.yml`** com o conteúdo abaixo:

```yaml
name: EAS Build

on:
  workflow_dispatch:
    inputs:
      platform:
        description: 'Plataforma'
        required: true
        default: 'android'
        type: choice
        options:
          - android
          - ios
          - all
      profile:
        description: 'Perfil de build'
        required: true
        default: 'preview'
        type: choice
        options:
          - preview
          - production

jobs:
  build:
    name: EAS Build (${{ github.event.inputs.platform }} / ${{ github.event.inputs.profile }})
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: '10.x'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build
        working-directory: artifacts/fretex
        run: eas build --platform ${{ github.event.inputs.platform }} --profile ${{ github.event.inputs.profile }} --non-interactive
```

- [ ] **Step 3: Validar YAML**

```bash
node -e "
const fs = require('fs');
const yaml = require('js-yaml');
try {
  yaml.load(fs.readFileSync('.github/workflows/build.yml', 'utf8'));
  console.log('YAML válido');
} catch(e) { console.error(e.message); process.exit(1); }
" 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml')); print('YAML válido')"
```

Esperado: `YAML válido`

> Se nenhum dos dois estiver disponível, verificar manualmente que a indentação do arquivo está consistente (2 espaços, sem tabs).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: adiciona workflow de build EAS manual (APK + TestFlight)

Disparo via workflow_dispatch com inputs de plataforma (android/ios/all)
e perfil (preview/production). Autentica com EXPO_TOKEN do GitHub Secrets.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Criar workflow de EAS Update OTA (`.github/workflows/eas-update.yml`)

**Files:**
- Create: `.github/workflows/eas-update.yml`

- [ ] **Step 1: Criar `.github/workflows/eas-update.yml`** com o conteúdo abaixo:

```yaml
name: EAS Update (OTA)

on:
  workflow_dispatch:
    inputs:
      channel:
        description: 'Canal de atualização'
        required: true
        default: 'preview'
        type: choice
        options:
          - preview
          - production
      message:
        description: 'Descrição do update'
        required: false
        default: 'Manual update'
        type: string

jobs:
  update:
    name: EAS Update (${{ github.event.inputs.channel }})
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: '10.x'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Publish update
        working-directory: artifacts/fretex
        run: eas update --channel ${{ github.event.inputs.channel }} --message "${{ github.event.inputs.message }}" --non-interactive
```

- [ ] **Step 2: Validar YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/eas-update.yml')); print('YAML válido')" 2>/dev/null || node -e "
const fs = require('fs');
const yaml = require('js-yaml');
try {
  yaml.load(fs.readFileSync('.github/workflows/eas-update.yml', 'utf8'));
  console.log('YAML válido');
} catch(e) { console.error(e.message); process.exit(1); }
"
```

Esperado: `YAML válido`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/eas-update.yml
git commit -m "ci: adiciona workflow de EAS Update (OTA) manual

Disparo via workflow_dispatch com inputs de canal (preview/production)
e mensagem descritiva do update. Usa o mesmo EXPO_TOKEN do build workflow.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Configurar GitHub Secret + validação final

Esta task não modifica código — é o checklist de configuração externa obrigatória para os workflows funcionarem.

- [ ] **Step 1: Gerar EXPO_TOKEN**

1. Acesse [expo.dev/accounts/juiceluqi/settings/access-tokens](https://expo.dev/accounts/juiceluqi/settings/access-tokens)
2. Clique em **"Create token"**
3. Nome sugerido: `github-actions-ajudae`
4. Copie o token gerado (ele só aparece uma vez)

- [ ] **Step 2: Adicionar EXPO_TOKEN como secret no GitHub**

1. Acesse o repositório no GitHub → **Settings → Secrets and variables → Actions**
2. Clique em **"New repository secret"**
3. Nome: `EXPO_TOKEN`
4. Valor: cole o token do Step 1
5. Clique em **"Add secret"**

- [ ] **Step 3: Verificar EAS Secrets do projeto (se ainda não configurados)**

```bash
cd artifacts/fretex
eas secret:list
```

Esperado: ver pelo menos as 3 entradas abaixo. Se não aparecerem, criar com os comandos:

```bash
# Rodar dentro de artifacts/fretex

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://rlehpgvvevarpkkamied.supabase.co"

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<nova_anon_key_rotacionada>"

eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
  --value "<sua_google_maps_api_key>"
```

> **Atenção:** use a anon key **rotacionada** (ver LAUNCH_CHECKLIST.md Seção 0.1 — a key anterior foi exposta em git history).

- [ ] **Step 4: Smoke test do workflow de build via GitHub Actions**

1. Acesse o repositório no GitHub → aba **Actions**
2. Selecione **"EAS Build"** na sidebar esquerda
3. Clique em **"Run workflow"**
4. Selecione: Platform = `android`, Profile = `preview`
5. Clique em **"Run workflow"**
6. Acompanhe o log — o step "Build" deve mostrar a URL do build no EAS dashboard
7. Confirmar que o build aparece em: https://expo.dev/accounts/juiceluqi/projects/ajudae/builds

- [ ] **Step 5: (Após build Android concluir) Testar download do APK**

```bash
cd artifacts/fretex
eas build:list --platform android --limit 1
# Copiar a URL de download e instalar no dispositivo Android
```

- [ ] **Step 6: (Após build iOS concluir) Submit para TestFlight**

```bash
cd artifacts/fretex
eas submit --platform ios --latest
```

Seguir prompts interativos para autenticar com Apple ID da conta Developer.

---

## Referência rápida pós-implementação

```bash
# Via terminal (em casa)
cd artifacts/fretex
eas build --platform android --profile preview          # APK
eas build --platform ios --profile preview              # TestFlight IPA
eas submit --platform ios --latest                      # Submete para TestFlight
eas update --channel preview --message "descrição"      # OTA update

# Via GitHub Actions
# Aba Actions → "EAS Build" → Run workflow
# Aba Actions → "EAS Update (OTA)" → Run workflow
```
