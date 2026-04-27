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

## Tela 4B — Sistema de PIN Duplo (atualizado)

> **Arquitetura aprovada pelo CPO em 2026-04-26.** Substitui o modelo de PIN único de conclusão.
> Objetivo: proteção simétrica — nenhum lado (cliente ou prestador) tem controle total sobre o outro.

---

### Visão Geral do Fluxo de PIN

| Momento | PIN | Quem gera | Quem digita | Proteção |
|---|---|---|---|---|
| **Início do serviço** | PIN de Início (4 dígitos) | Prestador | Cliente | Impede início sem presença do cliente — protege contra cobranças indevidas |
| **Conclusão do serviço** | PIN de Conclusão (4 dígitos) | Cliente | Prestador | Prestador só recebe confirmação se o cliente liberar — protege contra conclusão forçada |

### Guardas de Transição de Status

Os seguintes bloqueios são obrigatórios no backend (`request_update_status`):

- `requested → accepted`: apenas o prestador pode aceitar. Requer `verified = true`.
- `accepted → en_route`: apenas o prestador pode avançar. Sem validação de PIN.
- `en_route → in_progress`: **bloqueado** — requer PIN de Início validado pelo cliente.
- `in_progress → completed`: **bloqueado** — requer PIN de Conclusão validado pelo prestador.
- Cliente **não pode** cancelar após `in_progress` sem taxa de deslocamento.
- Após 5 tentativas erradas em qualquer PIN: status vai para `disputed` automaticamente.

### PIN de Início — Fluxo Detalhado

**Geração (Prestador — Tela P4):**
- Ao chegar no local (`en_route`), o prestador clica em "Cheguei / Gerar PIN de Início"
- Sistema gera PIN de 4 dígitos e exibe na tela do prestador
- Instrução: "Mostre este código ao cliente para iniciar o serviço"
- PIN válido por 10 minutos. Após expirar: prestador gera novo PIN (máximo 3 tentativas/hora)

**Confirmação (Cliente — Tela 5):**
- Cliente vê campo "Digite o código que o prestador mostrou" (teclado numérico)
- Ao confirmar: status avança para `in_progress`
- Se errar: mensagem "Código incorreto" sem revelar tentativas restantes
- Proteção anti-fraude: PIN de Início não pode ser o mesmo do último serviço do mesmo prestador

### PIN de Conclusão — Fluxo Detalhado

**Geração (Cliente — Tela 4B / Tela 5):**
- O PIN de Conclusão é gerado no momento da criação do pedido (Tela 4B — mantido)
- Exibido uma única vez ao cliente, com instrução: "Guarde este código. Você vai precisar dele no final para confirmar a entrega."
- **Sem botão de fechar (X).** Usuário precisa clicar em "Entendi, vou guardar."
- Se o app fechar antes de confirmar: mostrar novamente ao reabrir (enquanto status ≠ `completed`)
- PIN não pode ser recuperado pelo cliente. Admin pode gerar novo via painel em caso de emergência.

**Confirmação (Prestador — Tela P5):**
- Ao concluir o serviço, prestador digita o PIN de 4 dígitos fornecido pelo cliente
- Ao validar: status avança para `completed`, repasse é liberado
- Erros: mensagem "Código incorreto" sem revelar contagem
- Após 5 tentativas erradas: `disputed` automático

### Tela 4B — Modal PIN de Conclusão

**Layout:**
- Fundo escurecido (modal sobre a tela)
- Título: "Guarde este código!"
- `pin_conclusion` em destaque (fonte grande, fácil de ler) — 6 dígitos
- Texto: "Você vai precisar deste código no final do serviço para confirmar a conclusão."
- Aviso: "Só informe ao prestador quando o serviço estiver realmente concluído"
- Botão "Entendi, vou guardar"

**Regras:**
- O `pin_conclusion` é exibido uma única vez. Se perdido, o Admin regenera **ambos** os PINs (`pin_start` + `pin_conclusion`) mais um novo `commitment`.

### Regras Gerais de PIN

- Nenhum PIN é enviado por SMS ou email (reduz risco de interceptação)
- PINs são gerados com entropia criptográfica no backend (não sequenciais)
- Logs de todas as tentativas em `request_events` para auditoria

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
- Ao aceitar: o prestador recebe seu `pin_start` (4 dígitos), exibido em tela com instrução "Mostre este código ao cliente ao chegar para iniciar o serviço". O `pin_start` fica acessível na Tela P4 enquanto o status for `accepted` ou `en_route`.
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

- O PIN de conclusão foi gerado pelo sistema no momento da criação do pedido e é de posse exclusiva do cliente.
- O prestador nunca recebe o PIN de conclusão — apenas digita o que o cliente mostra.
- Chamar `request_complete_with_otp`.
- Erro de OTP: mostrar "Código incorreto. Tente novamente." (sem revelar quantas tentativas restam).
- Após 5 tentativas erradas: pedido vai para `disputed` automaticamente, mostrar "Pedido em disputa. Entre em contato com o suporte."

---

## Sistema de PIN Complementar (Dual-PIN)

### Regras gerais

- `pin_start` (4 dígitos): gerado na criação, entregue ao prestador na aceitação, exibido ao cliente na chegada
- `pin_conclusion` (6 dígitos): gerado na criação, exibido ao cliente uma única vez, digitado pelo prestador na conclusão
- `commitment`: hash(serviceId|pin_start|pin_conclusion) — verificação local sem rede
- Nenhum PIN trafega pela plataforma após a distribuição inicial
- 5 tentativas erradas em qualquer PIN → disputa automática
- Funcionamento offline: verificação é computação local pura

### Máquina de estados

```
requested → accepted → en_route → in_progress → completed
requested → cancelled (apenas neste status)
accepted → cancelled (com aviso de taxa)
qualquer → disputed (ticket ou 5 tentativas erradas)
```

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

---

# FASE 2 — Escopo Aprovado

> **Decisão CPO — 2026-04-26.** Itens abaixo são fora do MVP atual mas têm aprovação formal para a próxima fase.

## Backend / Infraestrutura

### Supabase Realtime
- Substituir mock state local (`ServiceContext`) por subscriptions reais via Supabase Realtime
- Canal por pedido: `requests:{request_id}` — escutar `UPDATE`
- Desinscrever ao sair da tela para evitar vazamento de memória
- Todos os avanços de status (`advanceStatus`) devem chamar Edge Functions reais em vez de setState local

### Push Notifications
- **Mobile:** Expo Push (`expo-notifications`) 
- **Web:** Web Push API (PWA)
- Eventos que geram push:
  - Cliente: pedido aceito, prestador a caminho, PIN de Início gerado (alerta para confirmar), serviço concluído, ticket respondido
  - Prestador: novo pedido disponível (enquanto online), PIN de Início usado pelo cliente, ticket aberto
- Token de push salvo em `profiles.push_token`

### Edge Functions novas/atualizadas
- `request_generate_start_pin` — prestador gera PIN de Início ao chegar; retorna PIN + expiry; salvo em `requests.start_pin_hash`
- `request_validate_start_pin` — cliente valida PIN de Início; avança para `in_progress` se correto
- Atualizar `request_complete_with_otp` para validar PIN de 4 dígitos (migrar de 6 para 4 dígitos)

## Painel Admin (A1–A5)

### Plataforma
- Electron Desktop para uso interno (Admin / COO)
- Também acessível via Web PWA com role `admin`

### Tela A1 — Dashboard
- Métricas em tempo real: pedidos criados / aceitos / concluídos / cancelados
- Tickets abertos, prestadores online agora
- Alertas: tickets sem resposta há mais de 2h (destaque vermelho)

### Tela A2 — Prestadores Pendentes
- Lista de prestadores com `verified = false`
- Botões: "Aprovar" / "Reprovar" (reprovar requer motivo obrigatório)
- Chamar `admin_verify_provider`
- Meta: responder em até 24h após cadastro

### Tela A3 — Lista de Pedidos
- Tabela filtrada por status, categoria, data, cliente, prestador
- Colunas: ID, status (badge colorido), cliente, prestador, categoria, criado em

### Tela A4 — Detalhe do Pedido
- Todos os dados do pedido + timeline de `request_events`
- Ações: mudar status manualmente, gerar novo PIN de Conclusão (emergência), bloquear prestador
- **Nota:** gerar novo PIN de Início não é possível via admin — deve ser re-gerado pelo prestador

### Tela A5 — Fila de Tickets
- Lista por status: open / in_review / resolved
- Ações: mudar status, registrar resolução, notas internas (`notes_admin` — não visível ao usuário)
- Liberar repasse ou estornar pagamento (Fase 2+)

## Rede Ajudaê — Comunidade de Prestadores
> Ver seção completa no final deste documento (aprovada 2026-04-26).

---

# REDE AJUDAÊ — Comunidade de Prestadores

> **Aprovado pelo CPO em 2026-04-26.**
> Comunidade exclusiva para prestadores verificados. Objetivo: troca de indicações, parcerias e dicas operacionais sem desviar o foco para comunicação direta ou concorrência interna.

---

## Visão Geral

- Acesso exclusivo: `verified = true` e `role = provider`
- Canais fixos (não é possível criar novos canais — ever)
- Sem DM direto entre usuários — contato apenas via criação de serviço na plataforma
- Moderação via denúncia entre usuários + análise automática de conteúdo de imagem

## Canais Fixos

| Canal | Emoji | Tipo de Post | Exemplo |
|---|---|---|---|
| **Indicações** | 🤝 | Estruturado: categoria + bairro + horário | "Frete — Tijuca — Sábado 10h, não consigo pegar. Alguém?" |
| **Parceiros** | 👥 | Estruturado: tipo de parceria + bairro + data | "Mudança grande sexta, preciso de 1 ajudante — Maracanã" |
| **Dicas** | 💡 | Texto curto (máximo 200 chars) | "Para eletrodoméstico frágil: cintas cruzadas >>" |

## Estrutura de Post

Posts não são livres — cada canal tem campos fixos obrigatórios (sem textarea livre no MVP):

**Indicações:**
- Categoria (select: Frete / Mudança / Entrega)
- Bairro (input)
- Horário (date/time picker)
- Observação opcional (máx 100 chars)

**Parceiros:**
- Tipo (select: Ajudante / Co-executor / Substituição)
- Bairro (input)
- Data (date picker)
- Observação opcional (máx 100 chars)

**Dicas:**
- Texto livre (máx 200 chars)
- Foto opcional (1 imagem, jpg/png/webp, máx 5MB)

## Regras de Moderação

- Posts com número de telefone detectado: ocultados automaticamente antes de publicar
- Posts com links externos (http/https): bloqueados no input
- Imagens passam por análise de conteúdo (texto visível na imagem é verificado para detectar números/links)
- Usuários podem denunciar posts (botão "Reportar" em cada post)
- 3 denúncias distintas → post oculto automaticamente + notificação interna para revisão
- Prestador com 2 posts removidos por violação → suspenso da Rede por 7 dias

## Interações Permitidas

- Curtir (👍) — visível para todos
- Comentar — mesmo tipo de campo estruturado do canal (sem textarea livre)
- Compartilhar para outro canal da Rede (não fora do app)

## Tela R1 — Feed da Rede

### Layout

- Selector de canal no topo (Indicações / Parceiros / Dicas)
- Feed cronológico reverso
- Card de post: avatar do prestador (verificado ✓) + campo estruturado + hora relativa + contador de curtidas
- Botão flutuante "+" para criar post no canal ativo

### Regras

- Apenas prestadores verificados veem e interagem com a Rede
- Clientes não têm acesso a esta seção
- Post próprio: botão "Excluir" disponível (sem edição — exclui e recria)
- Feed não tem busca no MVP
