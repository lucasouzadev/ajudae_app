# Spec: EAS Build CI + EAS Update — Ajudaê
**Data:** 2026-05-21  
**Status:** Aprovado  
**Scope:** GitHub Actions workflows (build manual + OTA update manual) + correção `eas.json` para TestFlight

---

## Contexto

O projeto Ajudaê (`artifacts/fretex`) é um app React Native/Expo com EAS configurado (project ID `58679028-d339-4d8d-9fde-bd7dd1ad7725`). O objetivo é:

1. Corrigir o `eas.json` para que o perfil `preview` gere APK no Android e IPA válida para TestFlight no iOS.
2. Criar dois workflows GitHub Actions disparados manualmente (`workflow_dispatch`).
3. Documentar os comandos equivalentes para uso local via terminal.

Não há pasta `.github/` no repositório — tudo será criado do zero.

---

## 1. Correção no `eas.json`

**Problema:** `distribution: "internal"` no nível do perfil `preview` aplica distribuição ad-hoc ao iOS, que não é aceita pelo TestFlight.

**Solução:** Mover `distribution` para dentro de cada plataforma no perfil `preview`.

```json
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
}
```

O perfil `production` não precisa de mudanças — `distribution: "store"` é o padrão do EAS quando não especificado.

---

## 2. GitHub Actions — Workflow de Build

**Arquivo:** `.github/workflows/build.yml`

### Inputs (workflow_dispatch)

| Input | Tipo | Opções | Padrão |
|-------|------|--------|--------|
| `platform` | choice | `android`, `ios`, `all` | `android` |
| `profile` | choice | `preview`, `production` | `preview` |

### Steps

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 20.x
3. `pnpm/action-setup@v4` — pnpm 10.x (versão em uso no projeto)
4. `pnpm install --frozen-lockfile` — instala deps do workspace inteiro
5. `expo/expo-github-action@v8` — autentica com `secrets.EXPO_TOKEN`
6. `eas build --platform ${{ inputs.platform }} --profile ${{ inputs.profile }} --non-interactive` — working-directory: `artifacts/fretex`

### Secret necessário no GitHub

| Nome | Descrição |
|------|-----------|
| `EXPO_TOKEN` | Token de acesso pessoal — expo.dev → Account Settings → Access Tokens |

Os secrets de Supabase e Google Maps ficam no EAS (`eas secret:create`) e **não** precisam estar no GitHub.

---

## 3. GitHub Actions — Workflow de EAS Update (OTA)

**Arquivo:** `.github/workflows/eas-update.yml`

### Inputs (workflow_dispatch)

| Input | Tipo | Opções | Padrão |
|-------|------|--------|--------|
| `channel` | choice | `preview`, `production` | `preview` |
| `message` | string | livre | `"Manual update"` |

### Steps

Idênticos ao workflow de build (checkout → Node → pnpm → install → expo-github-action), substituindo o último step por:

```bash
eas update --channel ${{ inputs.channel }} --message "${{ inputs.message }}" --non-interactive
```

---

## 4. Comandos de Terminal (uso local)

```bash
# Instalar EAS CLI (uma vez)
npm install -g eas-cli
eas login   # conta: juiceluqi

# Build Android APK (preview)
cd artifacts/fretex
eas build --platform android --profile preview

# Build iOS para TestFlight (preview)
cd artifacts/fretex
eas build --platform ios --profile preview
eas submit --platform ios --latest   # envia para TestFlight

# Publicar OTA update
cd artifacts/fretex
eas update --channel preview --message "Descrição do que mudou"

# Ver builds recentes
eas build:list --limit 5

# Verificar secrets configurados no EAS
eas secret:list
```

---

## 5. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `artifacts/fretex/eas.json` | Modificar — mover `distribution` para nível de plataforma no perfil `preview` |
| `.github/workflows/build.yml` | Criar — workflow de build manual |
| `.github/workflows/eas-update.yml` | Criar — workflow de OTA update manual |

---

## 6. Pré-requisitos Externos (fora do código)

Estes itens precisam ser feitos manualmente antes de rodar as builds:

| Item | Onde | Status |
|------|------|--------|
| Criar `EXPO_TOKEN` no expo.dev | expo.dev → Account Settings → Access Tokens | Pendente |
| Adicionar `EXPO_TOKEN` como secret no GitHub | GitHub repo → Settings → Secrets → Actions | Pendente |
| Configurar EAS Secrets (Supabase URL, anon key, Maps key) | `eas secret:create --scope project` | Pendente (ver LAUNCH_CHECKLIST.md Seção 1.3) |
| App registrado no App Store Connect com Bundle ID `com.ajuda.app` | appstoreconnect.apple.com | Confirmado |

---

## 7. Fora do Escopo

- Workflow automático em push/tag — decidido usar apenas `workflow_dispatch`
- Firebase App Distribution — opcional, pode ser adicionado depois
- Sentry / monitoramento de crashes — pós-lançamento
- Submit automático para App Store (apenas TestFlight por ora)
