# PRD.md — Comissionados

> Product Requirements Document. Define o que cada tela faz, como se comporta e quais são as regras.
> Este documento alinha Dev 2 (Frontend) com o produto real sem necessidade de reunião a cada feature.
> **Owner:** CPO (Sócio 2) — atualizar sempre que uma regra de produto mudar.

---

## Princípios de Produto (MVP)

1. **Simples primeiro:** Se pode ser mais simples, é mais simples.
2. **Confiança acima de tudo:** Cada decisão deve aumentar a confiança do cliente ou do prestador.
3. **Operável:** A equipe de 3 pessoas consegue resolver qualquer problema via painel admin.
4. **Sem chat livre:** Mensagens rápidas pré-definidas. Chat real é Fase 2.

---

## Papéis e Permissões

| Role       | Cadastro                 | O que pode fazer                                |
| ---------- | ------------------------ | ----------------------------------------------- |
| `client`   | Qualquer pessoa          | Criar pedido, acompanhar, avaliar, abrir ticket |
| `provider` | Aprovação manual (admin) | Receber pedidos, aceitar, executar, concluir    |
| `admin`    | Interno (vocês 3)        | Tudo + verificar prestadores + resolver tickets |

---

# FLUXOS DO CLIENTE

---

## Tela 1 — Onboarding

**Quando aparece:** Primeiro acesso após cadastro.

**Objetivo:** Coletar dados mínimos e pedir permissões necessárias.

### Passos

1. Tela de boas-vindas: logo + frase curta ("Serviços de confiança, perto de você.")
2. Nome do usuário (input obrigatório, mínimo 3 chars)
3. Telefone (input, formato brasileiro, obrigatório)
4. Solicitação de permissão de GPS — mensagem clara: "Para encontrar prestadores perto de você"
5. Tela de confirmação: "Tudo pronto!"

### Regras

- Se o usuário negar GPS: permitir continuar, mas avisar que os resultados serão menos precisos.
- Telefone: validar formato (11 dígitos com DDD).
- Salvar via `profiles` (UPDATE, não INSERT — perfil já existe via trigger).

---

## Tela 2 — Home

**Quando aparece:** Toda vez que o app abre (após onboarding).

### Layout

- **Header:** Logo + ícone de perfil (canto direito)
- **Barra de busca:** "O que você precisa?" (leva para Tela 3)
- **Grade de categorias:** Cards com ícone e nome (Frete, Mudança, Carreto)
- **Seção "Meus Pedidos":** Lista os pedidos ativos (se houver)

### Regras

- Se houver pedido ativo (status `accepted`, `en_route`, `in_progress`): mostrar banner no topo com status e botão "Acompanhar".
- Categorias inativas (`active = false`) não aparecem.
- Pedidos concluídos ou cancelados não aparecem na home (apenas no histórico).

---

## Tela 3 — Lista de Prestadores

**Quando aparece:** Ao clicar em uma categoria.

### Layout

- **Header:** Nome da categoria + filtros (distância, avaliação)
- **Lista de cards:** Um card por prestador disponível
- **Card do prestador:**
  - Foto de perfil (ou avatar padrão)
  - Nome
  - Avaliação (estrelas + número de avaliações)
  - Distância aproximada (ex: "2,3 km")
  - Tipo de veículo
  - Botão "Solicitar"

### Regras

- Mostrar apenas prestadores `verified = true` e `active = true`.
- Ordenação padrão: mais próximo primeiro.
- Se GPS disponível: calcular distância real. Se não: ordenar por `rating_avg DESC`.
- Sem prestadores disponíveis: mensagem "Nenhum prestador disponível agora. Tente em alguns minutos." + botão de recarregar.
- Raio máximo de busca: 10km no MVP.

---

## Tela 4 — Criar Solicitação

**Quando aparece:** Ao clicar em "Solicitar" no card do prestador, ou em "Criar pedido" na categoria.

### Layout

- **Endereço de origem** (input com busca de endereço — Google Places ou manual)
- **Endereço de destino** (opcional no MVP, label: "Para onde vai? (opcional)")
- **Descrição** (textarea: "Descreva o que precisa ser transportado")
- **Fotos** (upload, máximo 5, opcional)
- **Precisa de ajudante?** (toggle — sim/não)
- **Agendar para depois?** (toggle — se sim, mostrar seletor de data/hora)
- **Resumo e confirmação:** mostrar endereços + categoria + estimativa de preço (se disponível)
- **Botão "Confirmar Pedido"**

### Regras

- Endereço de origem é obrigatório.
- Fotos: apenas jpg/png/webp, máximo 5MB por foto.
- Se agendado: data mínima = agora + 1 hora.
- Ao confirmar: chamar `request_create` → receber `otp_code`.
- **Após confirmação:** exibir modal com OTP/PIN (Tela 4B) antes de qualquer outra coisa.

---

## Tela 4B — Modal OTP (aparece imediatamente após criar pedido)

**Propósito:** Mostrar o PIN de conclusão ao cliente uma única vez.

### Layout

- Fundo escurecido (modal sobre a tela)
- Título: "Guarde este código!"
- PIN em destaque (fonte grande, fácil de ler)
- Texto: "Você vai precisar deste código no final do serviço para confirmar a conclusão."
- Botão "Entendi, vou guardar"
- **Sem botão de fechar (X).** Usuário precisa clicar no botão.

### Regras

- O PIN **não pode ser recuperado depois.** Se o usuário perder, o Admin pode gerar um novo via painel.
- PIN exibido apenas uma vez. Após fechar o modal, nunca mais mostrado.
- Se o usuário fechar o app antes de ver o modal: mostrar novamente ao reabrir (enquanto status != `completed`).

---

## Tela 5 — Acompanhar Pedido

**Quando aparece:** Após criar o pedido / ao clicar em pedido ativo na home.

### Layout

- **Status atual** (barra de progresso visual):
  `Aguardando aceite → A caminho → Em execução → Concluído`
- **Informações do prestador** (após aceite):
  - Foto, nome, avaliação, tipo de veículo
- **Endereço de origem e destino**
- **Botão "Mensagem rápida"** (abre lista de opções pré-definidas)
- **Botão "Problema?"** (abre ticket — visível a partir de `accepted`)
- **Botão "Cancelar"** (visível apenas em `requested`)
- **Timer** mostrando quanto tempo falta para o pedido expirar (apenas em `requested`)

### Regras

- Atualização de status via **Realtime** (Supabase).
- Se status mudar para `completed`: navegar automaticamente para Tela 7 (Avaliação).
- Se status mudar para `cancelled`: mostrar modal com motivo + botão "Criar novo pedido".
- Se status mudar para `disputed`: mostrar banner "Seu pedido está em análise" + link para o ticket.
- Mensagens rápidas disponíveis para o cliente: "Ainda estou aguardando", "Preciso cancelar".

---

## Tela 6 — Cancelamento (modal)

**Quando aparece:** Ao clicar em "Cancelar" na Tela 5.

### Layout

- Título: "Por que deseja cancelar?"
- Opções (radio):
  - "Não preciso mais do serviço"
  - "Demorou muito para aceitar"
  - "Encontrei outra solução"
  - "Outro motivo"
- Campo de texto (opcional, aparece se "Outro motivo")
- Botão "Confirmar cancelamento" (vermelho)
- Botão "Voltar"

### Regras

- Cancelamento disponível apenas em status `requested`.
- Após `accepted`: exibir aviso "Cancelar agora pode gerar cobrança de taxa" antes de confirmar.
- Chamar `request_update_status` com `new_status: 'cancelled'`.

---

## Tela 7 — Avaliação

**Quando aparece:** Automaticamente após `status = 'completed'`.

### Layout

- Foto + nome do prestador
- "Como foi o serviço?"
- Seletor de 1 a 5 estrelas (obrigatório)
- Campo de comentário (opcional, máximo 300 chars)
- Botão "Enviar avaliação"
- Link "Pular por agora" (permite pular, mas aparece novamente no histórico)

### Regras

- Apenas 1 avaliação por pedido.
- Só disponível após `completed`.
- Avaliação não pode ser editada após envio.

---

## Tela 8 — Abrir Ticket

**Quando aparece:** Ao clicar em "Problema?" na Tela 5.

### Layout

- Título: "Descreva o problema"
- Campo de texto obrigatório (mínimo 20 chars)
- Upload de fotos (evidências, opcional)
- Botão "Enviar"

### Regras

- Chamar `ticket_open`.
- Após envio: status do pedido muda para `disputed`.
- Mostrar mensagem: "Seu ticket foi aberto. Nossa equipe entrará em contato em até 4 horas."

---

# FLUXOS DO PRESTADOR

---

## Tela P1 — Perfil e Configuração

**Quando aparece:** Primeiro acesso após cadastro como prestador.

### Campos

- Foto de perfil (obrigatório para verificação)
- Bio (texto livre, máximo 200 chars)
- Categorias que atende (multi-select das categorias ativas)
- Tipo de veículo (select)
- Placa do veículo
- Raio de atendimento em km (slider: 1km a 20km, default 5km)

### Regras

- Após preencher: status fica `verified = false`. **O prestador NÃO aparece na busca** até aprovação manual pelo Admin.
- Exibir mensagem: "Seu cadastro foi enviado para análise. Entraremos em contato em até 24h."

---

## Tela P2 — Home do Prestador

### Layout

- **Toggle grande:** Online / Offline (destaque, canto superior)
- **Pedidos recebidos:** Lista de pedidos em `requested` compatíveis com as categorias do prestador
- **Pedido ativo:** Card de destaque se houver pedido em andamento
- **Histórico:** Link para serviços concluídos

### Regras

- Toggle Online só fica ativo se `verified = true`.
- Se não verificado: mostrar badge "Aguardando aprovação" e toggle desativado.
- Chamar `provider_toggle_active` ao mudar o toggle.

---

## Tela P3 — Card de Solicitação Recebida

**Quando aparece:** Novo pedido disponível enquanto prestador está online.

### Layout

- Categoria do serviço
- Endereço de origem (e destino se houver)
- Descrição
- Distância até a origem
- Fotos (se houver)
- Precisa de ajudante? (sim/não)
- Estimativa de valor (se disponível)
- **Timer:** tempo restante para aceitar (30 segundos por padrão)
- Botão "Aceitar" (verde, destaque)
- Botão "Recusar"

### Regras

- Chamar `request_accept` ao clicar em Aceitar.
- Se outro prestador aceitar primeiro: mostrar "Este pedido já foi aceito" e remover da lista.
- Timer expirado: pedido some da lista automaticamente.

---

## Tela P4 — Pedido Ativo (execução)

**Quando aparece:** Após aceitar um pedido.

### Layout

- Status atual do pedido
- Endereços (origem + destino)
- Detalhes (descrição, fotos, ajudante)
- **Ações por status:**
  - `accepted` → Botão "Estou a caminho"
  - `en_route` → Botão "Cheguei / Iniciar serviço"
  - `in_progress` → Botão "Concluir serviço" (abre Tela P5)
- Botão "Mensagem rápida"
- Contato do cliente (telefone — visível após aceite)

---

## Tela P5 — Concluir com OTP

**Quando aparece:** Ao clicar em "Concluir serviço".

### Layout

- Instrução: "Peça o código de conclusão ao cliente"
- Input para digitar PIN (6 dígitos, teclado numérico)
- Botão "Confirmar conclusão"

### Regras

- Chamar `request_complete_with_otp`.
- Erro de OTP: mostrar "Código incorreto. Tente novamente." (sem revelar quantas tentativas restam).
- Após 5 tentativas erradas: pedido vai para `disputed` automaticamente, mostrar "Pedido em disputa. Entre em contato com o suporte."

---

# PAINEL ADMIN

---

## Tela A1 — Dashboard

### Layout

- Métricas do dia:
  - Pedidos criados / aceitos / concluídos / cancelados
  - Tickets abertos
  - Prestadores online agora
- Alertas: tickets sem resposta há mais de 2h (destaque vermelho)

---

## Tela A2 — Prestadores Pendentes

### Layout

- Lista de prestadores com `verified = false`
- Card: foto, nome, categorias, veículo, data de cadastro
- Botões: "Aprovar" / "Reprovar"
- Ao reprovar: campo obrigatório de motivo (enviado ao prestador)

### Regras

- Chamar `admin_verify_provider`.
- Meta: responder em até 24h após cadastro.

---

## Tela A3 — Lista de Pedidos

### Layout

- Tabela com filtros: status, categoria, data, cliente, prestador
- Colunas: ID curto, status (badge colorido), cliente, prestador, categoria, criado em
- Clique na linha: abre Tela A4

---

## Tela A4 — Detalhe do Pedido

### Layout

- Todos os dados do pedido
- **Timeline de eventos** (`request_events`) em ordem cronológica
- Ações disponíveis pelo admin:
  - Mudar status manualmente (com motivo obrigatório)
  - Gerar novo OTP (emergência operacional)
  - Bloquear prestador (abre modal de confirmação)

---

## Tela A5 — Fila de Tickets

### Layout

- Lista de tickets por status: `open` / `in_review` / `resolved`
- Card: motivo, pedido relacionado, quem abriu, tempo aberto
- Ao clicar: abre detalhe com timeline do pedido + fotos de evidência

### Ações do Admin

- Mudar status do ticket
- Registrar resolução (texto)
- Adicionar notas internas (`notes_admin` — não visível ao cliente)
- Liberar repasse ou estornar pagamento (Fase 2)

---

# COMPORTAMENTOS GLOBAIS

---

## Estados de Loading

- Toda ação assíncrona (criar pedido, aceitar, concluir) deve mostrar estado de loading no botão.
- Desabilitar o botão durante a chamada para evitar duplo clique.

## Tratamento de Erros

- Erros de rede: toast "Sem conexão. Tente novamente."
- Erros da API: exibir mensagem do campo `error` retornado pela Edge Function.
- Erros críticos: logar no Sentry com contexto (user_id, request_id).

## Realtime

- Usar Supabase Realtime para atualizar status do pedido sem polling.
- Canal: `requests:{request_id}` — escutar UPDATE.
- Desinscrever ao sair da tela.

## Notificações Push

- MVP: usar Expo Push (mobile) e Web Push (PWA).
- Eventos que geram push:
  - Cliente: pedido aceito, prestador a caminho, serviço concluído, ticket respondido
  - Prestador: novo pedido disponível (enquanto online), ticket aberto
  - Admin: novo ticket aberto

## Navegação (Bottom Nav — Cliente)

- Início | Pedidos | Perfil

## Navegação (Bottom Nav — Prestador)

- Home | Histórico | Perfil
