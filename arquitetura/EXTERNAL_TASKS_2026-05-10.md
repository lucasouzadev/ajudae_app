# External Tasks — UI/UX Implementation Complete

**Data:** 2026-05-10  
**Status:** Code implementation ✅ | Awaiting external resources  
**Branch:** `claude/review-mvp-readiness-adQuT` (ready to test)

---

## Crítico (Bloqueia Launch)

### 1. Mascote Assets (Bloqueador de EmptyState Visual)

**O que é:** Imagens PNG/SVG do mascote Ajudaê que será exibido em telas vazias (inbox, proposals, marketplace, etc).

**O que você precisa fazer:**
1. Confirmar / criar (ou designar designer):
   - `mascot-running.png` — mascote em movimento (para estados de espera)
   - `mascot-standing.png` — mascote parado (para estados neutros)
   - Dimensões: 108×108px ou maior (recomendado 256×256 com background transparente)
   - Formato: PNG com canal Alpha (transparência)

2. Colocar em:
   ```
   artifacts/fretex/assets/images/mascot/
   ├── mascot-running.png
   └── mascot-standing.png
   ```

3. Testar:
   ```bash
   cd artifacts/fretex
   npx expo start
   # Navegar até tela de Inbox/Marketplace vazia → deve mostrar mascote flutuante
   ```

**Timeline:** Recomendado antes de build para TestFlight/APK.

**Impacto se não fizer:** EmptyState renderiza com placeholder circular cinza em vez de mascote. Funcionalidade intacta, mas visual incompleto.

---

### 2. Supabase Key Rotation (SEGURANÇA CRÍTICA)

**O que é:** A `anon key` do Supabase foi exposta acidentalmente em git history (commit anterior). Precisa ser rotacionada.

**O que você precisa fazer:**
1. Acessar Supabase Dashboard → https://supabase.com/dashboard
2. Selecionar projeto `ajudae_banco` (rlehpgvvevarpkkamied)
3. Settings → API
4. Copiar nova `anon key` gerada
5. Atualizar em **Cloudflare Pages** (CRM):
   - Settings → Environment variables
   - `VITE_SUPABASE_ANON_KEY` = (new key)
   - Redeploy do CRM
6. Não precisa atualizar app mobile (anon key pública é inerente ao design, mas idealmente usar PublishableKey no futuro)

**Quando:** ASAP (antes de qualquer deploy público).

---

### 3. Bucket de Documentos — Privado (SEGURANÇA)

**O que é:** O bucket `provider-docs` no Supabase Storage deve ser configurado como privado (não public).

**O que você precisa fazer:**
1. Acessar Supabase Dashboard → Storage
2. Selecionar bucket `provider-docs`
3. Clicar em ⚙️ Settings
4. Alterar para **Private** (não Public)
5. Verificar que CRM ainda acessa via `getSignedUrl()` (5min TTL) — deve continuar funcionando

**Quando:** Junto com key rotation.

---

## Alta Prioridade (Antes de TestFlight/APK)

### 4. Cloudflare Access — Domínio Customizado (CRM)

**O que é:** O CRM web está em `ajudae-app.pages.dev`, mas Cloudflare Access (Zero Trust) não funciona com domínio `pages.dev`. Precisa de domínio customizado.

**O que você precisa fazer:**
1. Registrar domínio (ou usar existente, ex: `admin.ajudae.app.br`)
2. Em Cloudflare → Websites → adicionar domínio:
   - Apontar nameservers para Cloudflare
   - Ou adicionar registros CNAME se já usa outro registrar
3. Em Cloudflare Pages:
   - Projeto `ajudae-app` → Custom domains
   - Adicionar novo domínio (ex: `admin.ajudae.app.br`)
4. Em Cloudflare Zero Trust → Applications:
   - Editar `ajudae crm`
   - Substituir URL de `*.pages.dev` para novo domínio
   - Adicionar regra de e-mail permitido (ex: seu email de admin)

**Timeline:** Não é crítico para MVP fechado, mas recomendado se pretende acessar CRM externamente.

---

### 5. Build EAS — TestFlight/APK (Deploy)

**O que é:** Compilar app mobile para iOS (TestFlight) e Android (APK) com novo branding.

**O que você precisa fazer:**

**Para iOS (TestFlight):**
```bash
cd artifacts/fretex
eas build --platform ios --auto-submit  # Se credenciais Apple já configuradas
# Ou manual: eas build --platform ios (depois submeter no Xcode Cloud)
```

**Para Android (APK):**
```bash
cd artifacts/fretex
eas build --platform android
# Gera APK para teste/distribuição
```

**Verificações pós-build:**
- [ ] Splash screen amarelo #FFC90E (não laranja)
- [ ] App icon background correto
- [ ] Bottom tab bar visível nas telas principais
- [ ] Chat bubbles — me bubble amarela
- [ ] Zero emojis em qualquer tela

**Timeline:** Após mascote assets, antes de distribuição beta.

---

## Médio Prazo (Antes de Lançamento Público)

### 6. QA Manual — Visão Visual

**Checklist de testes (não automático):**

| Tela | Aspecto | O que verificar |
|------|---------|----------------|
| PrestadorHome | Heatmap | 2 tons (cinza/amarelo), não gradientes |
| PrestadorHome | Stats | Todos com background card cinza, texto preto |
| PrestadorHome | Badges | Ícones Ionicons (trophy, star, etc), sem emoji |
| PrestadorHome | Bottom Tab | Visível, black bg, active tab amarela |
| Chat | Bubble Me | Amarela (#FFC90E) com texto escuro |
| Chat | Bubble Them | Card cinza |
| Payment | Header | TopNav com título "Pagamento" |
| Provider Validation | Service Types | Ícones grandes (MCI/Ionicons), sem emoji |
| Provider Validation | Vehicles | RadioRow com ícones, sem emoji concatenado |
| Empty States | Mascote | Flutuante (quando assets adicionados) ou placeholder |
| ProfileOverlay | Toggles | Ícone circle/ellipse apenas, sem pill background |
| ProfileOverlay | Security | Biometria verde (não purple) |

**Plataformas:**
- iOS (TestFlight, iPhone 14 min)
- Android (APK, Pixel 6+ ou Samsung S21+)
- Web (CRM em domínio customizado, Chrome desktop)

---

### 7. Cascata de Atualizações de Docs Internas

**Documentos recomendados para atualizar (depois de code review):**

1. **`CLAUDE.md`** — Seção "Recent Changes"
   - Adicionar: "✅ UI/UX brand identity implementation (6 etapas) — cores, zero emojis, EmptyState, BottomTabBar"

2. **`MVP_STATUS.md`** — Atualizar completeness % de cada tela
   - PrestadorHome: +10% (visual polish)
   - Chat: +5% (bubble colors)
   - Payment: +5% (TopNav)
   - etc.

3. **`PROGRESS.md`** — Adicionar nova seção
   ```
   ## Week 2026-05-10: UI/UX Brand Identity
   - [x] Color tokens alignment (#FFC90E, #FAF9ED)
   - [x] Font replacement (Fraunces → Nunito)
   - [x] Zero emojis — Ionicons/MCI substitution
   - [x] EmptyState component + float animation
   - [x] Chat bubble colors (me=primary, them=card)
   - [x] Payment TopNav integration
   - [x] ProfileOverlay toggle simplification
   - [x] Heatmap 2-tone, stats uniform
   - [x] Skeleton shimmer LinearGradient
   - [x] BottomTabBar role-aware component
   - [x] TypeScript validation (0 errors)
   - [ ] Mascote assets (waiting)
   - [ ] EAS builds (TestFlight/APK)
   - [ ] QA manual — visual validation
   ```

4. **`LAUNCH_CHECKLIST.md`** — Adicionar à seção "Pre-distribution"
   ```
   - [ ] Mascote PNGs em assets/images/mascot/
   - [ ] EAS builds completo (iOS + Android)
   - [ ] Visual QA checklist executado em device real
   - [ ] Supabase key rotated
   - [ ] CRM bucket privado configurado
   ```

---

## Referência Rápida — O que Está Pronto

✅ **Código:** Todos os 6 etapas implementadas  
✅ **TypeScript:** Zero erros  
✅ **Git:** Commited e pushed  
✅ **Design:** Branding alinhado (cores, fonts, icons)  
✅ **Components:** EmptyState, BottomTabBar, useEntranceAnim novos  
✅ **Screens:** chat, payment, provider-validation refatoradas  

⏳ **Aguardando:** Mascote, key rotation, builds

---

## Como Proceder Agora

### Opção A — Lançamento Rápido (MVP Fechado)
1. Mascote assets → colocar em assets/
2. EAS build (TestFlight/APK)
3. Distribuir em closed beta
4. Skip Cloudflare Access (CRM só acesso interno)

### Opção B — Preparado para Público (Recomendado)
1. Mascote assets
2. Key rotation + bucket privado
3. Cloudflare Access + domínio
4. EAS build
5. QA manual completa
6. Lançar

---

## Suporte / Dúvidas

Qualquer bloqueador durante implementação dessas tasks externas, abra issue no branch e pagaremos com código.

**Session:** `claude/review-mvp-readiness-adQuT`  
**Last commit:** `581b8c6` feat: UI/UX brand identity implementation — 6 etapas completas
