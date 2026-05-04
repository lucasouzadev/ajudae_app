# Roadmap Beta Pública — Ajudaê Marketplace

**Horizonte:** 24 meses a partir de maio 2026  
**Ponto de partida:** MVP Test Closed (fluxo completo funcionando, Supabase real, sem pagamento nem chat)

---

## Estado de Entrada

O MVP entrou na fase de QA fechado com:
- Auth real (Supabase)
- Fluxo completo cliente + prestador com dual-PIN
- 22 push notifications automáticas (foreground/app aberto)
- LGPD + permissões OS sincronizadas no banco
- Providers ainda via query direta Supabase (MOCK_PROVIDERS removido nesta sprint)

O que não existe e precisa existir antes de qualquer usuário externo:
- Pagamento
- Chat
- Push em background
- Conformidade LGPD total (falta DELETE /users/me)

---

## Fase 1 — Core Funcional (Meses 1–3)

Sem estes itens não há produto utilizável por usuários reais. Todos são P0.

### 1.1 Pagamento Pix integrado

| Campo | Valor |
|-------|-------|
| Prioridade | P0 |
| Esforço estimado | 15 dias |
| Time | Backend + Frontend |
| Dependências | Conta Mercado Pago ou Gerencianet; tabela `payments` no DB |

**O que fazer:**
- Integrar API Pix (Mercado Pago ou Gerencianet) no backend
- Criar Edge Function `payment_create` que gera QR Code Pix
- Criar Edge Function `payment_webhook` para receber confirmação
- Frontend: tela `payment.tsx` já existe com mock — substituir por QR Code real
- Atualizar fluxo: serviço só pode ser aceito após pagamento confirmado (ou modelo pós-pago com retenção)

**Decisão de produto pendente:** pré-pago (cliente paga antes) vs. pós-pago com caução (retém na conclusão). Definir antes de implementar.

---

### 1.2 Chat em tempo real (Supabase Realtime)

| Campo | Valor |
|-------|-------|
| Prioridade | P0 |
| Esforço estimado | 10 dias |
| Time | Backend + Frontend |
| Dependências | Tabela `messages` no DB; Supabase Realtime habilitado |

**O que fazer:**
- Criar tabela `messages` (`id`, `service_id`, `sender_id`, `content`, `created_at`)
- Habilitar Realtime na tabela com RLS: só participantes do serviço veem mensagens
- Frontend: `inbox.tsx` já existe — implementar subscription Supabase Realtime
- NotificationContext: evento `new_message` já catalogado — conectar ao canal real

---

### 1.3 Posição ao vivo do prestador no mapa

| Campo | Valor |
|-------|-------|
| Prioridade | P0 |
| Esforço estimado | 8 dias |
| Time | Backend + Frontend |
| Dependências | `providers.location_lat`, `providers.location_lng` já existem no DB; Supabase Realtime |

**O que fazer:**
- Prestador: enviar posição GPS a cada 10s quando `online = true` via `PATCH /providers/me/location`
- Backend: Edge Function ou REST para atualizar `location_lat`/`location_lng`
- Habilitar Realtime na tabela `providers` (coluna `location_lat`, `location_lng`)
- Cliente: `track.tsx` — substituir coordenada estática por subscription Realtime
- `MapReal.tsx` já tem estrutura para atualizar pins — conectar ao stream

---

### 1.4 DELETE /users/me (LGPD Art. 18)

| Campo | Valor |
|-------|-------|
| Prioridade | P0 |
| Esforço estimado | 3 dias |
| Time | Backend |
| Dependências | Nenhuma — obrigatório por lei |

**O que fazer:**
- Edge Function `user_delete` que: anonimiza dados pessoais em `profiles`, cancela serviços ativos, remove push token, deleta auth user
- Frontend: botão já existe em Configurações (ProfileOverlay) — conectar ao endpoint
- Importante: não deletar dados financeiros/histórico (obrigação fiscal 5 anos)

---

### 1.5 Push em background (servidor envia notificação quando app fechado)

| Campo | Valor |
|-------|-------|
| Prioridade | P0 |
| Esforço estimado | 7 dias |
| Time | Backend + Frontend |
| Dependências | `expo-notifications` já instalado; precisa salvar `push_token` no DB |

**O que fazer:**
- Frontend: ao obter `ExpoPushToken`, salvar em `profiles.push_token` via Supabase (hoje o token só existe em memória)
- Backend: criar função `send_push_notification(user_id, event, vars)` que chama API Expo Push
- Disparar push do servidor em todos os eventos de mudança de status de serviço
- Hoje as notificações só funcionam com app aberto (NotificationContext dispara via React)

**Contrato de API necessário:**

```
POST https://exp.host/--/api/v2/push/send
Body: {
  to: push_token,
  title: string,
  body: string,
  data: { screen: string, service_id: string }
}
```

O servidor precisa:
1. Receber webhook de mudança de status (ou trigger no Supabase)
2. Buscar `push_token` do destinatário em `profiles`
3. Chamar Expo Push API
4. Tratar erros `DeviceNotRegistered` (invalidar token no DB)

---

## Fase 2 — Qualidade e Retenção (Meses 3–6)

Itens que aumentam confiança, segurança e retenção. Mistura P0 e P1.

### 2.1 HMAC-SHA256 substituindo djb2 (segurança do PIN)

| Campo | Valor |
|-------|-------|
| Prioridade | P0 |
| Esforço estimado | 5 dias |
| Time | Frontend + Backend |
| Dependências | `expo-crypto` já está disponível no Expo SDK 54 |

**O que fazer:**
- Substituir `djb2` em `ServiceContext.tsx` por `expo-crypto` HMAC-SHA256
- Backend deve validar o hash com a mesma chave secreta (Edge Function `request_complete_with_otp`)
- Migrar serviços ativos durante transição (janela de manutenção ou versionamento do algoritmo)
- Risco atual: djb2 é reversível — alguém pode forçar o PIN por força bruta sem limite criptográfico real

---

### 2.2 Upload de fotos para S3/GCS

| Campo | Valor |
|-------|-------|
| Prioridade | P1 |
| Esforço estimado | 6 dias |
| Time | Backend + Frontend |
| Dependências | Bucket S3 ou GCS; `expo-image-picker` já instalado |

**O que fazer:**
- `request.tsx` tem ImagePicker sem destino — implementar upload real
- `portfolio.tsx` tem seleção de fotos sem upload — implementar
- Backend: Edge Function `upload_presigned_url` que gera URL temporária para upload direto ao bucket
- Frontend: upload com presigned URL (não passa arquivo pelo backend)
- Supabase Storage é alternativa mais simples se volume for baixo

---

### 2.3 Histórico de pedidos real

| Campo | Valor |
|-------|-------|
| Prioridade | P1 |
| Esforço estimado | 4 dias |
| Time | Frontend + Backend |
| Dependências | Tabela `services` já existe no DB |

**O que fazer:**
- `RequestsContext.tsx` tem mock de histórico — substituir por query `SELECT * FROM services WHERE client_id = user.id ORDER BY created_at DESC`
- Paginação obrigatória (usuário pode ter centenas de pedidos)
- Filtros: status, data, tipo de serviço

---

### 2.4 Sistema de disputas com atendente humano

| Campo | Valor |
|-------|-------|
| Prioridade | P1 |
| Esforço estimado | 8 dias |
| Time | Backend + Frontend |
| Dependências | Fase 1.2 (chat) concluída |

**O que fazer:**
- Quando PIN falha 5x, status muda para `disputed` (já implementado)
- Backend: criar tabela `disputes` e notificar atendente humano (email ou painel admin)
- Frontend: `ticket.tsx` já existe — conectar ao sistema real de disputas
- Painel admin: escopo separado (web, fora do app)

---

### 2.5 Rating e reputação real

| Campo | Valor |
|-------|-------|
| Prioridade | P1 |
| Esforço estimado | 3 dias |
| Time | Frontend + Backend |
| Dependências | Tabela `ratings` já existe no DB; `providers.rating_avg` e `rating_count` existem |

**O que fazer:**
- `rate.tsx` tem avaliação — conectar ao INSERT real em `ratings`
- Trigger no DB para recalcular `providers.rating_avg` e `rating_count` automaticamente
- Marketplace: ordenar por rating real (hoje usa ordem aleatória do mock)

---

## Fase 3 — Escala (Meses 6–12)

Itens que permitem crescimento sem degradação de performance ou experiência.

### 3.1 Busca por área e filtros avançados (PostGIS)

| Campo | Valor |
|-------|-------|
| Prioridade | P1 |
| Esforço estimado | 10 dias |
| Time | Backend + Infra |
| Dependências | Extensão PostGIS habilitada no Supabase; providers com coordenadas reais |

**O que fazer:**
- Habilitar PostGIS no projeto Supabase
- Adicionar coluna `location geography(POINT,4326)` em `providers`
- Criar índice GIST para queries geoespaciais
- Edge Function `providers_nearby` aceita `lat`, `lng`, `radius_km`, `service_type`
- Frontend: filtros no marketplace (tipo de serviço, raio, preço, rating)

---

### 3.2 Push servidor por área (webhook ao criar pedido)

| Campo | Valor |
|-------|-------|
| Prioridade | P1 |
| Esforço estimado | 5 dias |
| Time | Backend |
| Dependências | Fase 1.5 (push background) + Fase 3.1 (PostGIS) concluídos |

**O que fazer:**
- Quando cliente cria pedido, Supabase trigger chama função que:
  1. Busca todos prestadores online na área (via PostGIS)
  2. Envia push para cada um: "Novo pedido de [serviço] em [bairro]"
- Limitar a 10 prestadores por disparo (para não spam)
- Rate limiting por prestador (máx 1 push por pedido por prestador)

---

### 3.3 Dashboard analítico para prestadores

| Campo | Valor |
|-------|-------|
| Prioridade | P2 |
| Esforço estimado | 12 dias |
| Time | Frontend + Backend |
| Dependências | Histórico real (Fase 2.3) + Rating real (Fase 2.5) |

**O que fazer:**
- Nova tela `analytics.tsx` para prestadores
- Dados: ganhos por semana/mês, total de serviços, rating médio, taxa de cancelamento, área de calor de pedidos
- Backend: queries agregadas — criar views materializadas no Supabase para performance
- Evitar queries pesadas em tempo real; atualizar views 1x/hora via cron

---

### 3.4 Portfólio persistido no Supabase

| Campo | Valor |
|-------|-------|
| Prioridade | P2 |
| Esforço estimado | 4 dias |
| Time | Frontend + Backend |
| Dependências | Fase 2.2 (upload fotos) concluída |

**O que fazer:**
- `PortfolioContext.tsx` hoje salva dados apenas em memória (se fecha o app, perde)
- Criar tabela `provider_portfolios` (`provider_id`, `photos[]`, `description`, `specialties[]`, `updated_at`)
- Conectar `PATCH /providers/me/portfolio` ao salvar no editor
- Carregar portfólio real na tela `provider/[id].tsx`

---

### 3.5 Verificação de prestadores (KYC)

| Campo | Valor |
|-------|-------|
| Prioridade | P1 |
| Esforço estimado | 15 dias |
| Time | Backend + Frontend + Produto |
| Dependências | Definição do processo de verificação; integração com bureau de crédito ou validação manual |

**O que fazer:**
- DB já tem campos para KYC — implementar fluxo de submissão
- Prestador envia: CPF, foto do documento, selfie
- Backend: integrar com provedor de KYC (ex: Serpro, Unico) ou fluxo manual com painel admin
- Badge "Verificado" no perfil do prestador
- Definir se verificação é obrigatória para aceitar pedidos (decisão de produto)

---

## Fase 4 — Beta Robusta (Meses 12–24)

Itens de maturidade de produto. Todos P2 — não bloqueiam beta, aumentam competitividade.

### 4.1 Multi-idioma (PT-BR + ES)

| Campo | Valor |
|-------|-------|
| Prioridade | P2 |
| Esforço estimado | 20 dias |
| Time | Frontend |
| Dependências | i18n-js ou react-i18next; todas as strings extraídas |

**O que fazer:**
- Extrair todas as strings hardcoded (app inteiro em PT-BR inline hoje)
- Implementar `i18next` + `expo-localization`
- Traduzir para ES (espanhol para expansão para países da América Latina)

---

### 4.2 Precificação dinâmica por demanda e área

| Campo | Valor |
|-------|-------|
| Prioridade | P2 |
| Esforço estimado | 15 dias |
| Time | Backend + Produto |
| Dependências | Histórico de pedidos real + dados de demanda por área |

**O que fazer:**
- Algoritmo de precificação: horário de pico, área de alta demanda, distância, tipo de serviço
- Sugestão de preço ao criar pedido (não obrigatório — prestador pode aceitar ou não)
- Backend: modelo simples baseado em regras (não ML na fase inicial)

---

### 4.3 Integrações fiscais (NF-e para prestadores PJ)

| Campo | Valor |
|-------|-------|
| Prioridade | P2 |
| Esforço estimado | 20 dias |
| Time | Backend + Infra |
| Dependências | Fase 1.1 (pagamento) concluída; parceiro de emissão de NF-e |

**O que fazer:**
- Integrar com provedor de NF-e (Focus NF-e, Nuvem Fiscal)
- Prestador PJ recebe relatório mensal de serviços para declaração
- Opcional: emissão automática de NF-e por serviço concluído

---

### 4.4 Programa de conquistas e reputação (badges)

| Campo | Valor |
|-------|-------|
| Prioridade | P2 |
| Esforço estimado | 10 dias |
| Time | Frontend + Backend |
| Dependências | Rating real (Fase 2.5) + Histórico real (Fase 2.3) |

**O que fazer:**
- Sistema de badges por marcos: "10 serviços sem reclamação", "Avaliação acima de 4.8", "Resposta rápida"
- Tabela `badges` no DB; trigger automático ao atingir critério
- Exibir badges no perfil do prestador

---

### 4.5 API pública para parceiros

| Campo | Valor |
|-------|-------|
| Prioridade | P2 |
| Esforço estimado | 20 dias |
| Time | Backend + Infra |
| Dependências | Produto estabilizado; documentação completa |

**O que fazer:**
- API REST documentada (OpenAPI) para parceiros integrarem pedidos no Ajudaê
- Casos de uso: e-commerces que oferecem entrega via Ajudaê no checkout
- Rate limiting, autenticação OAuth2, sandbox separado

---

## Resumo de Prioridades

| Fase | Itens P0 | Itens P1 | Itens P2 | Esforço total estimado |
|------|----------|----------|----------|------------------------|
| 1 — Core Funcional | 5 | 0 | 0 | ~43 dias |
| 2 — Qualidade | 1 | 4 | 0 | ~26 dias |
| 3 — Escala | 0 | 3 | 2 | ~46 dias |
| 4 — Beta Robusta | 0 | 0 | 5 | ~85 dias |
| **Total** | **6** | **7** | **7** | **~200 dias** |

**Regra de sequenciamento:** nenhum item da Fase 2 começa sem a Fase 1 completa. Itens dentro de uma fase podem ser paralelos se times diferentes executam.

---

_Documento criado em 2026-05-04. Revisar a cada sprint com base em aprendizados do QA fechado._
