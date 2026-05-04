# PRD — Ajudaê Marketplace

**Versão:** MVP Test Closed — maio 2026  
**Status:** QA fechado com backend Supabase real  
**Próxima revisão:** ao final do QA fechado (estimativa: 2 semanas)

---

## Visão do Produto

Ajudaê é um marketplace de serviços de logística urbana (mudança, frete, entrega) que conecta clientes a prestadores autônomos verificados. O produto permite contratar, rastrear, validar e avaliar um serviço inteiramente pelo app, com garantia via sistema dual-PIN.

A proposta de longo prazo é ser a plataforma de confiança para serviços de movimentação no Brasil, substituindo a informalidade (grupos de WhatsApp, indicações) por um processo rastreável, seguro e com histórico.

---

## Público-alvo

**Cliente (contratante):**
- Pessoa física, 25–45 anos, smartphone Android ou iOS
- Precisa de ajuda com mudança residencial, frete de móveis ou entrega de objetos grandes
- Não tem caminhão ou contato confiável — busca segurança e praticidade
- Sensível a preço mas disposta a pagar mais por confiança e rastreamento

**Prestador (autônomo):**
- Motorista de van, caminhão ou moto com disponibilidade variável
- Renda complementar ou principal via serviços avulsos
- Já atua informalmente — o app é uma forma de ter mais pedidos e receber com segurança
- Precisa de autonomia: decidir quando está online, quais pedidos aceitar, definir preço

---

## Proposta de Valor

**Para o cliente:**
- Contrata em minutos sem negociar preço por WhatsApp
- Rastreia o prestador em tempo real
- Dual-PIN garante que o serviço foi de fato iniciado e concluído
- Histórico de serviços e avaliações do prestador antes de contratar

**Para o prestador:**
- Pedidos chegam sem custo de aquisição
- Pagamento garantido pelo sistema (sem calote)
- Controle total: online/offline com um toque
- Portfólio e reputação construídos dentro do app

---

## Estado Atual (MVP Test Closed — maio 2026)

### Funcionalidades Implementadas

| Funcionalidade | Detalhes |
|---------------|---------|
| Autenticação | Supabase Auth (e-mail + senha, OTP por e-mail) |
| Onboarding | 5 etapas: nome, tipo de serviço, localização, foto, preferências |
| LGPD + Permissões OS | Consentimento bloqueante, sync de `lgpd_accepted`, `geolocation_requested`, `notifications_requested`, `camera_requested` no banco. `PermissionGate` sequencial. |
| Fluxo completo do cliente | Solicitar serviço → rastrear → confirmar PIN de início (4 dígitos) → receber PIN de conclusão (6 dígitos) → avaliar |
| Fluxo completo do prestador | Ficar online → aceitar pedido → ir ao local → mostrar PIN de início → receber PIN de conclusão → concluir |
| Dual-PIN offline | Hash djb2 gerado no device; sem dependência de rede para validar PIN. Máx. 5 tentativas antes de entrar em disputa. |
| 22 push notifications automáticas | Disparam em cada mudança de estado do serviço, tentativas de PIN, aceitação de pedido, mensagens. Funcionam apenas com app aberto (foreground). |
| UI blocking durante serviço ativo | Cliente e prestador ficam presos nas telas do serviço ativo enquanto `service.status !== null`. |
| Perfil do prestador | Portfólio, preços, especialidades — gerenciado via `PortfolioContext` (local, não persistido no DB ainda). |
| Marketplace | Lista de prestadores disponíveis com filtro por tipo de serviço. Mapa com pins dos prestadores. |

### Funcionalidades em Progresso (esta sprint)

| Funcionalidade | O que está sendo feito |
|---------------|------------------------|
| Lista de prestadores real | Removendo `MOCK_PROVIDERS` (dados estáticos) — substituindo por query direta na tabela `providers` do Supabase. Filtro: `active = true`, ordenado por `rating_avg DESC`. |
| Toggle online real | Prestador ao apertar "Ficar Online" atualiza `providers.active = true` no banco. Ao desligar, `active = false`. |
| Remoção de credenciais demo | Qualquer credencial hardcoded removida do código. |
| Dashboard de métricas real | `rating_avg` e `rating_count` do prestador lidos do banco — não mais valores fixos. |

### Backlog MVP (necessário antes de usuários externos)

| Item | Prioridade |
|------|-----------|
| Pagamento Pix integrado | P0 |
| Chat em tempo real | P0 |
| Posição ao vivo do prestador no mapa | P0 |
| DELETE /users/me (LGPD Art. 18) | P0 |
| Push em background (app fechado) | P0 |

### Backlog Beta

Ver `arquitetura/BETA_ROADMAP.md` para detalhamento completo com estimativas e dependências.

---

## Fluxos Principais

### Fluxo do Cliente

```
[Abre o app]
     │
     ▼
[Mapa com prestadores online]
     │
     ▼
[Seleciona prestador → vê perfil + preço]
     │
     ▼
[Cria solicitação: tipo, endereço origem/destino, detalhes]
     │  (Edge Function: request_create)
     ▼
[Aguarda prestador aceitar]
     │  (status: pending → accepted)
     ▼
[Rastreia prestador no mapa]
     │  (track.tsx — posição do prestador)
     ▼
[Prestador chegou → confirma início]
     │
     ├─ Cliente digita PIN de início (4 dígitos) [confirm-start-pin.tsx]
     │  ↕ djb2 hash validado offline
     └─ Prestador mostra PIN de início (start-pin.tsx)
     │
     ▼
[Serviço em andamento]
     │
     ▼
[Serviço concluído → cliente recebe PIN de conclusão]
     │
     ├─ Cliente mostra PIN (6 dígitos) [otp-modal.tsx]
     └─ Prestador digita PIN [job-otp.tsx]
     │  (Edge Function: request_complete_with_otp)
     ▼
[Avaliação do prestador] [rate.tsx]
     │
     ▼
[Volta ao mapa]
```

### Fluxo do Prestador

```
[Abre o app]
     │
     ▼
[Dashboard do prestador]
     │
     ▼
[Ativa "Estou Online"] ──► [providers.active = true no banco]
     │
     ▼
[Recebe notificação de novo pedido]
     │
     ▼
[Vê detalhes do pedido] [job.tsx]
     │
     ├─ Recusa → volta ao dashboard
     └─ Aceita → [status: accepted]
     │
     ▼
[Navega até o cliente]
     │
     ▼
[Chegou → Iniciar Serviço]
     │
     ├─ Mostra PIN de início (4 dígitos) ao cliente [start-pin.tsx]
     └─ Aguarda cliente confirmar [djb2 hash]
     │
     ▼
[Serviço em execução]
     │
     ▼
[Concluiu → digita PIN de conclusão]
     │  (6 dígitos que o cliente mostra) [job-otp.tsx]
     │  (Edge Function: request_complete_with_otp)
     ▼
[Serviço concluído → pagamento liberado]
     │
     ▼
[Volta ao dashboard]
```

---

## Critérios de Aceitação do MVP Test Closed

Para considerar o QA fechado bem-sucedido, todos os cenários abaixo precisam funcionar com 2 dispositivos reais (um cliente, um prestador):

| Cenário | Critério de aceite |
|---------|-------------------|
| Cadastro e login | Usuário cria conta, recebe OTP por e-mail, loga com sucesso |
| Onboarding LGPD | Modal de consentimento aparece, aceitar habilita permissões, recusar bloqueia o app |
| Prestador online | Toggle "Online" aparece no mapa do cliente em até 5 segundos |
| Criação de pedido | Cliente cria pedido e prestador recebe push notification |
| Aceitação de pedido | Prestador aceita e cliente vê status mudar para "Aceito" |
| PIN de início | Cliente digita 4 dígitos corretos → status muda para "Em andamento" |
| PIN incorreto | Após 5 tentativas erradas → status muda para "Em disputa" |
| PIN de conclusão | Prestador digita 6 dígitos corretos → serviço concluído |
| Avaliação | Cliente avalia 1–5 estrelas → dado salvo no banco |
| LGPD DELETE | Usuário solicita exclusão → dados anonimizados (quando implementado) |

---

## Métricas de Sucesso do MVP

**Métricas de produto (a medir no QA fechado):**

| Métrica | Meta mínima |
|---------|-------------|
| Taxa de conversão pedido → conclusão | > 80% (QA controlado) |
| Tempo médio de aceitação de pedido | < 2 minutos |
| Taxa de falha de PIN (disputas) | < 5% dos serviços |
| Crashes no fluxo principal | 0 |
| Latência do mapa (atualização de posição) | < 5 segundos |

**Métricas técnicas:**

| Métrica | Meta |
|---------|------|
| Tempo de resposta das Edge Functions | < 500ms p95 |
| Taxa de entrega de push (foreground) | 100% |
| Erros de autenticação Supabase | 0 |

---

## Contratos de API

### Implementados

| Endpoint | Descrição |
|---------|-----------|
| `Supabase Auth` | Signup, login, OTP |
| `Edge Function: request_create` | Cria pedido de serviço |
| `Edge Function: request_update_status` | Atualiza status do serviço |
| `Edge Function: request_complete_with_otp` | Valida PIN de conclusão |
| `SELECT providers WHERE active = true` | Lista prestadores online (nesta sprint) |
| `PATCH profiles` | Sync de permissões LGPD |

### Pendentes (necessários para beta)

| Endpoint | Responsável | Fase |
|---------|-------------|------|
| `PATCH providers/me/location` | Backend | Fase 1.3 |
| `POST payment_create` | Backend | Fase 1.1 |
| `POST payment_webhook` | Backend | Fase 1.1 |
| `DELETE user_delete` | Backend | Fase 1.4 |
| `POST messages` + Realtime subscription | Backend | Fase 1.2 |
| Expo Push API (chamada servidor) | Backend | Fase 1.5 |
| `GET providers_nearby` (PostGIS) | Backend | Fase 3.1 |
| `PATCH providers/me/portfolio` | Backend | Fase 3.4 |

---

## Dívida Técnica Conhecida

| Item | Severidade | Impacto | Fase de resolução |
|------|-----------|---------|------------------|
| `djb2` em vez de HMAC-SHA256 no dual-PIN | Alta | Segurança do PIN é criptograficamente fraca | Fase 2.1 |
| Push notifications apenas foreground | Alta | Usuário perde notificações com app fechado | Fase 1.5 |
| `PortfolioContext` não persistido no banco | Média | Prestador perde portfólio ao reinstalar app | Fase 3.4 |
| `PortfolioSheet` inline em `index.tsx` | Baixa | Arquivo se aproxima do limite de 2500 linhas | Próximo refactor |
| `MapExpandModal` inline em `marketplace.tsx` | Baixa | Manutenção difícil | Próximo refactor |
| Coordenadas SVG no mapa (não GPS real) | Alta | Mapa não mostra posições reais | Fase 1.3 |
| Camera permission não solicitada no onboarding para prestadores | Baixa | Prestador pode não ter câmera habilitada ao tirar foto do portfólio | Próximo refactor |

---

## Regras de Negócio Críticas

### Sistema Dual-PIN

O dual-PIN é o mecanismo central de confiança do app. Garante que início e conclusão do serviço foram confirmados presencialmente.

**PIN de início (4 dígitos):**
- Gerado pelo prestador no device (hash djb2 do `service_id` + timestamp truncado)
- Cliente recebe o PIN por outro canal (app mostra na tela do prestador, cliente digita no próprio app)
- Validação offline — não precisa de rede
- Máximo 5 tentativas incorretas → status `disputed`
- Tentativas são registradas em `service.startPinAttempts`

**PIN de conclusão (6 dígitos):**
- Gerado pelo sistema ao iniciar o serviço
- Exibido no app do cliente (otp-modal.tsx)
- Prestador digita no próprio app (job-otp.tsx)
- Validação via Edge Function `request_complete_with_otp` (não offline)
- Máximo 5 tentativas → `disputed`
- Tentativas registradas em `service.conclusionAttempts`

**Estado de disputa:**
- Quando `disputed`, serviço fica bloqueado
- Resolução manual pelo suporte (painel admin fora do app)
- Cliente e prestador recebem push informando a disputa

### UI Blocking durante Serviço Ativo

Quando `service.status !== null` (há serviço ativo), a navegação do app é bloqueada:
- Cliente não consegue sair das telas do fluxo do serviço
- Prestador não consegue voltar ao dashboard enquanto serviço não for concluído ou cancelado
- Previne abandono acidental do fluxo e mantém estado consistente

Implementado em `ServiceContext.tsx` — verificado em cada tela via `useService()`.

### Prestadores Online (aparecem no mapa)

Um prestador aparece no mapa do cliente somente quando:
1. `providers.active = true` no banco (toggle ativado pelo prestador)
2. Prestador não tem serviço ativo no momento (`service.status === null` para o prestador)

Se o prestador estiver em um serviço ativo, ele não aparece para novos clientes. Implementar esta regra no filtro da query quando a lista real for conectada.

---

_Última atualização: 2026-05-04 — Sprint MVP Test Closed_  
_Para roadmap de funcionalidades futuras, ver `arquitetura/BETA_ROADMAP.md`_
