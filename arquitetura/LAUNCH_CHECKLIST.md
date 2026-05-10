# Ajudaê — Checklist de Lançamento (TestFlight + APK)
**Versão:** 1.0 | **Data:** 2026-05-09 | **Status do projeto:** ~80% pronto para MVP aberto

Execute cada item em ordem. Não avance para a próxima seção sem concluir a atual.

---

## SEÇÃO 0 — ANTES DE TUDO (Segurança)

> Estas ações são pré-requisito absoluto. Sem elas, não há build seguro.

- [ ] **0.1 Rotacionar a anon key do Supabase**
  - Acesse: [Supabase Dashboard](https://supabase.com/dashboard) → projeto `ajudae_banco`
  - Vá em: **Settings → API**
  - Clique em **"Reveal"** ao lado de `anon public` e depois em **"Generate new key"**
  - Salve a nova chave em local seguro (gerenciador de senhas da equipe)
  - **Motivo:** A chave anterior foi exposta no git history em 2026-05-06

- [ ] **0.2 Tornar o bucket `provider-docs` privado**
  - No Supabase Dashboard → **Storage → Buckets**
  - Clique em `provider-docs` → **Edit bucket**
  - Desmarque "Public bucket" → **Save**
  - Confirme que as políticas RLS do bucket estão configuradas (só admins e o próprio provider podem ler)

- [ ] **0.3 Atualizar o CRM com a nova anon key**
  - No Cloudflare Pages → projeto `ajudae-crm` → **Settings → Environment variables**
  - Atualize `VITE_SUPABASE_ANON_KEY` com o novo valor
  - Faça um novo deploy do CRM para aplicar a mudança

---

## SEÇÃO 1 — CONFIGURAÇÃO DO AMBIENTE DE BUILD

- [ ] **1.1 Instalar o EAS CLI (se ainda não tiver)**
  ```bash
  npm install -g eas-cli
  eas --version  # deve ser >= 18.8.1
  ```

- [ ] **1.2 Fazer login no EAS**
  ```bash
  eas login
  # Use a conta Expo do projeto (owner: juiceluqi)
  ```

- [ ] **1.3 Configurar os EAS Secrets (nova anon key + Maps)**
  ```bash
  cd artifacts/fretex

  # Supabase (use a chave nova da Seção 0.1)
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
    --value "https://rlehpgvvevarpkkamied.supabase.co"

  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
    --value "<nova_anon_key>"

  # Google Maps (obtenha no Google Cloud Console, projeto com Maps SDK habilitado)
  eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
    --value "<sua_google_maps_api_key>"
  ```

- [ ] **1.4 Verificar que os secrets foram criados**
  ```bash
  eas secret:list
  # Deve listar os 3 secrets acima
  ```

---

## SEÇÃO 2 — VALIDAÇÃO TÉCNICA (Testes manuais antes do build)

> Use `npx expo start` + dispositivo físico via QR. Teste com 2 dispositivos reais para fluxos cliente↔prestador.

### 2.1 Autenticação
- [ ] Criar nova conta como **Cliente** (e-mail + OTP)
- [ ] Criar nova conta como **Prestador** (e-mail + OTP)
- [ ] Confirmar que o modal LGPD bloqueia até aceite
- [ ] Testar "Esqueci a senha" → receber e-mail → redefinir → login

### 2.2 Onboarding do Prestador
- [ ] Preencher o formulário de 5 etapas completo (CPF, veículo, documentos, selfie)
- [ ] Confirmar que validações por campo funcionam (erros inline ao digitar)
- [ ] Confirmar que câmera abre para selfie
- [ ] Enviar o formulário e confirmar que aparece como `pending` no CRM

### 2.3 Fluxo Core Cliente → Prestador
- [ ] **Cliente:** Criar solicitação de serviço (tipo, origem, destino)
- [ ] **Prestador:** Ver a solicitação aparecer e aceitar
- [ ] **Cliente:** Receber notificação de aceitação
- [ ] **Prestador:** Marcar como "a caminho"
- [ ] **Cliente:** Ver status atualizar em `track.tsx`
- [ ] **Prestador:** Mostrar PIN de início (4 dígitos)
- [ ] **Cliente:** Inserir PIN de início → serviço muda para "em andamento"
- [ ] **Cliente:** Ver PIN de conclusão (6 dígitos)
- [ ] **Prestador:** Inserir PIN de conclusão → serviço concluído
- [ ] **Cliente:** Tela de avaliação aparece, enviar nota 1–5

### 2.4 Dual-PIN de Segurança
- [ ] Inserir PIN errado 5× → confirmar que vai para status de disputa automaticamente

### 2.5 Notificações Push
- [ ] **Foreground:** Confirmar banner de notificação durante o fluxo acima
- [ ] **Background:** Minimizar o app no dispositivo do Cliente, o Prestador aceita → o Cliente recebe notificação com app fechado?
  - *(Este é o item de maior risco — validar com cuidado)*

### 2.6 Chat
- [ ] Durante um serviço ativo, abrir o chat
- [ ] Enviar mensagem como Cliente
- [ ] Confirmar que o Prestador recebe em tempo real
- [ ] Testar quick messages (respostas rápidas pré-definidas)

### 2.7 Pagamento
- [ ] Iniciar fluxo de pagamento em `payment.tsx`
- [ ] Confirmar que a integração com o gateway (Pix/OpenPix) está conectada
  - Se for ambiente de teste: usar chave de sandbox
  - Se for produção: usar chave real com valor simbólico (R$0,01 ou similar)
- [ ] Confirmar que o webhook `payment_webhook` registra o status no banco

### 2.8 Mapa
- [ ] Abrir o Marketplace
- [ ] Confirmar que pins de prestadores aparecem em coordenadas GPS reais (não SVG estático)
- [ ] Testar botão "Centralizar localização"
- [ ] Colocar um prestador online → confirmar que aparece no mapa do cliente

### 2.9 LGPD — Exclusão de Conta
- [ ] Ir em Configurações → "Excluir minha conta"
- [ ] Confirmar que dados são anonimizados no banco (não deletados fisicamente)
- [ ] Confirmar que login com o mesmo e-mail é bloqueado após exclusão

### 2.10 CRM Admin
- [ ] Login no CRM com conta admin
- [ ] Verificar que prestador enviado em 2.2 aparece como pendente
- [ ] Aprovar o prestador → confirmar que o app mobile reflete a aprovação
- [ ] Verificar signed URLs nos documentos (expiram em 5 minutos, não são públicos)

---

## SEÇÃO 3 — BUILD iOS (TestFlight)

> Pré-requisito: conta Apple Developer ativa (US$99/ano). Bundle ID `com.ajuda.app` deve estar registrado.

- [ ] **3.1 Build de preview para TestFlight**
  ```bash
  cd artifacts/fretex
  eas build --platform ios --profile preview
  # Aguardar o build (15–30 min na fila do EAS)
  ```

- [ ] **3.2 Acompanhar o build**
  ```bash
  eas build:list --platform ios --limit 3
  ```
  Ou acesse: https://expo.dev/accounts/juiceluqi/projects/ajudae/builds

- [ ] **3.3 Submeter para TestFlight**
  ```bash
  eas submit --platform ios --latest
  # Selecionar "TestFlight" quando solicitado
  ```
  - No App Store Connect: adicionar testers externos (link público) ou internos (e-mails)
  - A Apple pode levar até 24h para aprovar a build no TestFlight externo

- [ ] **3.4 Verificar que o app abre no iOS sem crash**
  - Instalar via TestFlight em iPhone físico
  - Abrir o app → confirmar que não crasha na tela inicial
  - Fazer o fluxo do item 2.3 rapidamente para smoke test

---

## SEÇÃO 4 — BUILD Android (APK)

> O perfil `preview` do `eas.json` já está configurado para gerar APK de distribuição interna.

- [ ] **4.1 Build do APK**
  ```bash
  cd artifacts/fretex
  eas build --platform android --profile preview
  # Aguardar o build (10–20 min)
  ```

- [ ] **4.2 Baixar o APK gerado**
  ```bash
  eas build:list --platform android --limit 3
  # Copiar a URL de download do artefato
  ```
  Ou acesse o link direto no dashboard do EAS.

- [ ] **4.3 Distribuição do APK**
  - **Opção A (simples):** Compartilhar o link de download direto do EAS com os testers
  - **Opção B (recomendado):** Usar Firebase App Distribution para controle de testers
    ```bash
    # Se usar Firebase:
    firebase appdistribution:distribute app-release.apk \
      --app <FIREBASE_APP_ID> \
      --groups testers \
      --release-notes "MVP Aberto v1.0"
    ```

- [ ] **4.4 Verificar que o APK instala e abre no Android**
  - Instalar o APK em dispositivo Android físico (permitir "fontes desconhecidas")
  - Confirmar que mapa abre com Google Maps (não mapa padrão)
  - Testar notificações

---

## SEÇÃO 5 — PÓS-DISTRIBUIÇÃO

### 5.1 Monitoramento imediato (primeiras 48h)
- [ ] Acompanhar logs do Supabase: **Dashboard → Logs → Edge Functions**
  - Verificar erros nas funções `request_create`, `payment_create`, `proposal_create`
- [ ] Acompanhar erros do app: configurar Sentry ou usar `eas diagnostics`
- [ ] Monitorar tabela `requests` no banco: novos pedidos chegando?
- [ ] Monitorar tabela `tickets`: algum tester abrindo suporte?

### 5.2 Métricas de sucesso (PRD)
- [ ] Taxa de conversão (request → completion): meta > 80%
- [ ] Tempo médio de aceitação pelo prestador: meta < 2 min
- [ ] Disputas de PIN: meta < 5% dos serviços
- [ ] Crashes na tela principal: meta = 0

### 5.3 Após os primeiros testers
- [ ] Coletar feedback sobre UX do mapa (GPS real funcionando?)
- [ ] Verificar se push background chegou para todos os testers
- [ ] Checar se algum tester teve problema com o pagamento Pix
- [ ] Revisar CRM: prestadores precisam ser aprovados antes de aparecer no marketplace

---

## SEÇÃO 6 — DÉBITOS TÉCNICOS (pós-lançamento, antes da beta pública)

Estes itens não bloqueiam o TestFlight/APK mas devem ser resolvidos antes de escalar:

| Prioridade | Item | Estimativa |
|-----------|------|-----------|
| 🟠 Alta | `djb2` → `HMAC-SHA256` no dual-PIN (`expo-crypto`) | 2 dias |
| 🟠 Alta | `console.log` → guard por `if (__DEV__)` nos contexts | 0.5 dia |
| 🟠 Alta | Cloudflare Access com domínio customizado (Zero Trust real) | 1 dia |
| 🟡 Média | `lib/providers.ts` sem cache (adicionar SWR ou React Query) | 1 dia |
| 🟡 Média | CRM sem paginação nas listas (adicionar quando volume crescer) | 1 dia |
| 🟢 Baixa | Extrair `PortfolioSheet` de `index.tsx` para componente próprio | 0.5 dia |
| 🟢 Baixa | Extrair `MapExpandModal` de `marketplace.tsx` para componente próprio | 0.5 dia |

---

## Referência Rápida — Comandos

```bash
# Iniciar dev server
cd artifacts/fretex && npx expo start

# TypeScript check
cd artifacts/fretex && pnpm typecheck

# Build iOS preview
cd artifacts/fretex && eas build --platform ios --profile preview

# Build Android APK
cd artifacts/fretex && eas build --platform android --profile preview

# Submit iOS para TestFlight
cd artifacts/fretex && eas submit --platform ios --latest

# Listar builds recentes
eas build:list --limit 5

# Ver secrets configurados
eas secret:list

# CRM dev local
pnpm --filter @workspace/crm run dev

# CRM build produção
pnpm --filter @workspace/crm run build
```

---

## Links Importantes

| Recurso | URL |
|---------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/rlehpgvvevarpkkamied |
| EAS Builds | https://expo.dev/accounts/juiceluqi/projects/ajudae/builds |
| App Store Connect | https://appstoreconnect.apple.com |
| Cloudflare Pages (CRM) | https://dash.cloudflare.com |
| Repositório | https://github.com/lucasouzadev/ajudae_app |

---

_Gerado em: 2026-05-09 | Próxima revisão: após validação da Seção 2_
