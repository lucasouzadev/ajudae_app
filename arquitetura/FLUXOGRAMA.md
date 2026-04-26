# Fluxograma — Ajudaê

> **Gerado em:** 2026-03-18
> Mapeia a arquitetura completa de plataformas e todos os fluxos de usuário do sistema.

---

## 1. Arquitetura Geral do Sistema

Visão macro das três plataformas de frontend e sua relação com o backend, CDN e serviços externos.

```mermaid
graph TB
    CLI(["🛒 Cliente"])
    PRO(["🚛 Prestador"])
    ADM(["👤 Admin / COO"])

    subgraph FRONT["Plataformas de Frontend"]
        WEB["🌐 Web PWA\nNext.js 14\napps/web"]
        APP["📱 Mobile App\nExpo React Native\napps/mobile\n— Fase 2 —"]
        ELT["🖥️ Admin Desktop\nElectron\napps/desktop"]
    end

    subgraph BORDA["Borda / CDN"]
        CF["☁️ Cloudflare\nWAF · Rate 30 req/min · DNS · SSL"]
        VCL["▲ Vercel\nEdge Network · Deploy"]
    end

    subgraph SUPA["Supabase — sa-east-1 — São Paulo"]
        AUTH["🔐 Auth\nJWT + Roles"]
        DB["🗄️ PostgreSQL\n9 tabelas + RLS"]
        RT["⚡ Realtime\nWebSocket"]
        STOR["📦 Storage\navatars · media · docs"]
        EF1["EF: request_create"]
        EF2["EF: request_accept"]
        EF3["EF: request_update_status"]
        EF4["EF: request_complete_with_otp"]
        EF5["EF: ticket_open"]
        EF6["EF: provider_toggle_active"]
        EF7["EF: admin_verify_provider"]
    end

    subgraph EXT["Serviços Externos"]
        STR["💳 Stripe\nPagamento"]
        SEN["🚨 Sentry\nMonitoramento de Erros"]
        PH["📊 PostHog\nAnalytics · 7 eventos"]
        RES["✉️ Resend\nEmail Transacional"]
    end

    CLI --> WEB
    CLI --> APP
    PRO --> WEB
    PRO --> APP
    ADM --> ELT
    ADM --> WEB

    WEB --> CF
    CF --> VCL
    VCL --> AUTH
    APP --> AUTH
    ELT --> AUTH

    AUTH --> DB
    AUTH --> RT
    AUTH --> STOR
    AUTH --> EF1
    AUTH --> EF2
    AUTH --> EF3
    AUTH --> EF4
    AUTH --> EF5
    AUTH --> EF6
    AUTH --> EF7

    EF1 --> DB
    EF2 --> DB
    EF3 --> DB
    EF4 --> DB
    EF5 --> DB
    EF6 --> DB
    EF7 --> DB

    EF4 --> STR
    EF1 --> RES

    WEB --> SEN
    WEB --> PH
```

---

## 2. Máquina de Estados do Pedido

Todas as transições possíveis do campo `requests.status`. Toda mudança registra um evento em `request_events` (auditoria obrigatória).

```mermaid
stateDiagram-v2
    [*] --> requested : request_create\n(cliente cria pedido + recebe OTP)

    requested --> accepted : request_accept\n(prestador aceita)
    requested --> cancelled : request_update_status\n(cliente cancela)
    requested --> expired : Sistema automático\n(30 min sem aceite)

    accepted --> en_route : request_update_status\n(prestador a caminho)
    accepted --> cancelled : request_update_status\n(prestador ou cliente)

    en_route --> in_progress : PIN de Início validado pelo cliente\n(prestador gera 4 dígitos → cliente confirma)

    in_progress --> completed : request_complete_with_otp\n(PIN de Conclusão correto — máx 5 tentativas)
    in_progress --> disputed : ticket_open\n(problema reportado)

    completed --> [*]
    cancelled --> [*]
    expired --> [*]
    disputed --> [*]
```

> **Sistema Dual-PIN — atualizado 2026-04-26 (aprovado CPO):**
> O fluxo anterior usava um único OTP de 6 dígitos gerado na criação do pedido e digitado pelo prestador na conclusão.
> O novo sistema usa **dois PINs independentes de 4 dígitos**, garantindo proteção simétrica:
>
> | PIN | Gerado por | Digitado por | Momento | Bloqueia |
> |---|---|---|---|---|
> | **PIN de Início** | Prestador (ao chegar) | Cliente | `en_route → in_progress` | Prestador não inicia sem presença do cliente |
> | **PIN de Conclusão** | Sistema (na criação do pedido) | Prestador | `in_progress → completed` | Prestador não conclui sem autorização do cliente |
>
> - PIN de Início: válido por 10 minutos, máximo 3 gerações/hora por prestador
> - PIN de Conclusão: exibido UMA única vez ao cliente no Modal OTP (Tela 4B), não recuperável
> - Após 5 tentativas erradas em qualquer PIN: status → `disputed` automaticamente
> - Todos os erros registrados em `request_events` para auditoria

---

## 3. Fluxo do Cliente — Web PWA e Mobile App

```mermaid
flowchart TD
    START(["Cliente abre o app"])

    AUTH_CHECK{"Autenticado?"}
    ONBOARD["Onboarding\nNome · Telefone · Permissão GPS"]
    HOME["Tela Principal\nGrid de categorias\n+ Banner de pedido ativo"]

    SEL["Seleciona categoria\nFrete · Mudança · Carreto"]
    LIST["Lista de Prestadores\nOrdenados por distância e rating\nApenas verificados + online"]
    CREATE["Formulário do Pedido\nEndereço · Descrição\nFotos — máx 5 × 5MB\nPrecisa de ajudante?"]

    EF_CREATE["Edge Function: request_create\n→ Cria pedido com status: requested\n→ Gera PIN de Conclusão (4 dígitos)"]
    OTP_MODAL["Modal PIN de Conclusão\n🔑 PIN exibido UMA ÚNICA VEZ\nSem botão fechar — cliente deve guardar\nUsado no final para liberar conclusão"]

    TRACK["Tela de Acompanhamento\nBarra de status em tempo real\nvia Realtime WebSocket\nInfo do prestador + Telefone"]

    W_ACCEPT{"Prestador\naceitou?"}
    EXPIRE["Pedido expirou\n30 min sem aceite"]

    W_SERVE{"Serviço\nconcluído?"}
    PROBLEM["Problema durante o serviço"]
    TICKET["Abrir Chamado\nticket_open\n→ Status: disputed\nAdmim media a disputa"]
    RATE["Avaliar Serviço\n1 a 5 estrelas\nComentário opcional\nImutável após envio"]

    CANCEL["Cancelar Pedido\nrequest_update_status\nMotivo obrigatório se aceito"]

    END_OK(["✅ Pedido concluído"])
    END_CANCEL(["❌ Pedido cancelado / expirado"])
    END_DISP(["⚠️ Disputa aberta"])

    START --> AUTH_CHECK
    AUTH_CHECK -- "Não" --> ONBOARD --> HOME
    AUTH_CHECK -- "Sim" --> HOME
    HOME --> SEL --> LIST --> CREATE
    CREATE --> EF_CREATE --> OTP_MODAL --> TRACK

    TRACK --> W_ACCEPT
    W_ACCEPT -- "Não / Expirou" --> EXPIRE --> END_CANCEL
    W_ACCEPT -- "Sim" --> TRACK
    TRACK --> CANCEL --> END_CANCEL

    TRACK --> W_SERVE
    W_SERVE -- "Sim" --> RATE --> END_OK
    W_SERVE -- "Problema" --> PROBLEM --> TICKET --> END_DISP
```

---

## 4. Fluxo do Prestador — Web PWA e Mobile App

```mermaid
flowchart TD
    START(["Prestador abre o app"])

    AUTH_CHECK{"Autenticado\ne verificado?"}
    ONBOARD["Onboarding\nFoto · Bio · Categorias\nVeículo · Placa · Raio 1–20km"]
    AWAIT_VERIFY["Aguardando aprovação\ndo Admin / COO"]

    HOME["Tela Principal\nToggle Online / Offline"]

    VERIFIED{"Verificado\npelo Admin?"}
    TOGGLE_ON["provider_toggle_active\nStatus: online"]
    WAIT["Aguardando pedidos\nFila ao vivo via Realtime"]

    REQ_CARD["Card do Pedido recebido\nCategoria · Endereço · Distância\nFotos · Descrição\n⏱️ Timer: 30 segundos"]

    ACCEPT_DEC{"Aceitar\npedido?"}
    REJECT["Recusar\nPedido retorna à fila"]
    ACCEPT["request_accept\n→ Status: accepted"]

    EN_ROUTE["A Caminho\nrequest_update_status\n→ Status: en_route"]
    GEN_PIN["Gerar PIN de Início\n4 dígitos — mostrar ao cliente\nVálido por 10 min"]
    CLIENT_PIN["Cliente digita\nPIN de Início no app"]
    IN_PROG["PIN validado\nrequest_update_status\n→ Status: in_progress"]

    OTP_INPUT["Digitar PIN de Conclusão\n4 dígitos fornecidos pelo cliente\n(gerado na criação do pedido)"]
    OTP_VALID{"OTP\ncorreto?"}
    OTP_FAIL["Tentativa registrada\nem request_events.meta"]
    MAX_FAIL{"5 falhas\natribuídas?"}

    DISPUTED["ticket_open\n→ Status: disputed\nAdmin decide a disputa"]
    COMPLETED["request_complete_with_otp\n→ Status: completed\n💰 Comissão: 15% calculada"]

    END_OK(["✅ Serviço concluído\nAvaliação liberada"])
    END_DISP(["⚠️ Disputa aberta"])

    START --> AUTH_CHECK
    AUTH_CHECK -- "Não cadastrado" --> ONBOARD --> AWAIT_VERIFY
    AWAIT_VERIFY --> VERIFIED
    VERIFIED -- "Não" --> AWAIT_VERIFY
    VERIFIED -- "Sim" --> HOME
    AUTH_CHECK -- "Sim" --> HOME

    HOME --> TOGGLE_ON --> WAIT --> REQ_CARD
    REQ_CARD --> ACCEPT_DEC
    ACCEPT_DEC -- "Não" --> REJECT --> WAIT
    ACCEPT_DEC -- "Sim" --> ACCEPT --> EN_ROUTE --> GEN_PIN --> CLIENT_PIN --> IN_PROG --> OTP_INPUT

    OTP_INPUT --> OTP_VALID
    OTP_VALID -- "Sim" --> COMPLETED --> END_OK
    OTP_VALID -- "Não" --> OTP_FAIL --> MAX_FAIL
    MAX_FAIL -- "Não" --> OTP_INPUT
    MAX_FAIL -- "Sim" --> DISPUTED --> END_DISP
```

---

## 5. Fluxo do Admin — Electron Desktop e Web

```mermaid
flowchart TD
    START(["Admin faz login\nconta com role: admin"])
    DASH["Dashboard\nMétricas em tempo real\nPedidos criados · aceitos · concluídos\nTickets abertos · Alertas"]

    subgraph VERIFICACAO["Verificação de Prestadores"]
        PROV_QUEUE["Fila de Prestadores\nverified = false\nOrdenados por data de cadastro"]
        PROV_DOC["Análise de Documentos\nFotos · CNH · Veículo · Placa"]
        APPROVE_DEC{"Aprovar?"}
        APPROVE["admin_verify_provider\n→ verified = true\nPrestador pode ir online"]
        REJECT_P["admin_verify_provider\n→ verified = false\nMotivo obrigatório"]
    end

    subgraph PEDIDOS["Gestão de Pedidos"]
        ORD_LIST["Lista de Pedidos\nFiltros: status · categoria · data\nPaginado"]
        ORD_DETAIL["Detalhe do Pedido\nTimeline de request_events\nHistórico completo de transições"]
        ORD_ACTION["Ações do Admin\nAlterar status manualmente\nGerar OTP substituto\nBloquear usuário"]
    end

    subgraph DISPUTAS["Fila de Tickets / Disputas"]
        TKT_LIST["Fila de Tickets\nAbertos · Em Revisão · Resolvidos\nOrdenados por idade"]
        TKT_DETAIL["Detalhe do Chamado\nEvidências · Histórico · Partes"]
        TKT_MED["Mediação\nDecisão com base em evidências"]
        TKT_RESOLVE["Resolver Disputa\nResolução + Notas internas"]
    end

    START --> DASH

    DASH --> PROV_QUEUE
    PROV_QUEUE --> PROV_DOC --> APPROVE_DEC
    APPROVE_DEC -- "Sim" --> APPROVE
    APPROVE_DEC -- "Não" --> REJECT_P

    DASH --> ORD_LIST
    ORD_LIST --> ORD_DETAIL --> ORD_ACTION

    DASH --> TKT_LIST
    TKT_LIST --> TKT_DETAIL --> TKT_MED --> TKT_RESOLVE
```

---

## 6. Fluxo de Segurança — Camadas por Requisição

Toda requisição passa por 5 camadas antes de tocar no banco de dados.

```mermaid
flowchart LR
    REQ(["Requisição\ndo Frontend"])

    CF["1️⃣ Cloudflare WAF\nRate limit: 30 req/min/IP\nBloqueio sem header Authorization\nSSL terminado aqui"]
    BLOCK1(["403 Bloqueado"])

    SAUTH["2️⃣ Supabase Auth\nValidação do JWT\nExtração de auth.uid()"]
    BLOCK2(["401 Não autorizado"])

    RLS["3️⃣ Row Level Security\nAcesso apenas aos\npróprios dados do usuário"]
    BLOCK3(["403 Sem permissão"])

    EF["4️⃣ Edge Function\nValidação de negócio\nRole via profiles.role — nunca JWT\nservice_role bypass intencional"]
    BLOCK4(["400/403 Regra violada"])

    LOG["5️⃣ request_events\nAuditoria append-only\nToda mudança de status registrada"]
    DB[("🗄️ PostgreSQL\nFonte de verdade")]

    REQ --> CF
    CF -- "Bloqueado" --> BLOCK1
    CF -- "Permitido" --> SAUTH
    SAUTH -- "JWT inválido" --> BLOCK2
    SAUTH -- "JWT válido" --> RLS
    RLS -- "Sem acesso" --> BLOCK3
    RLS -- "Com acesso" --> EF
    EF -- "Regra violada" --> BLOCK4
    EF -- "Operação válida" --> LOG --> DB
```

---

## 7. Visão Comparativa das Plataformas

| Plataforma        | Stack                   | Usuários                    | Fase      | Deploy                 |
| ----------------- | ----------------------- | --------------------------- | --------- | ---------------------- |
| **Web PWA**       | Next.js 14 · App Router | Cliente · Prestador · Admin | ✅ Fase 1 | Vercel                 |
| **Mobile App**    | Expo React Native       | Cliente · Prestador         | ⏳ Fase 2 | App Store · Play Store |
| **Admin Desktop** | Electron                | Admin · COO                 | ⏳ Fase 2 | Distribuição interna   |

### Funcionalidades por plataforma

| Funcionalidade                  | Web PWA         | Mobile    | Electron |
| ------------------------------- | --------------- | --------- | -------- |
| Criar pedido                    | ✅              | ✅ Fase 2 | ❌       |
| Acompanhar pedido em tempo real | ✅              | ✅ Fase 2 | ❌       |
| Fila de prestadores (Realtime)  | ✅              | ✅ Fase 2 | ❌       |
| Completar com OTP               | ✅              | ✅ Fase 2 | ❌       |
| Toggle Online/Offline           | ✅              | ✅ Fase 2 | ❌       |
| Dashboard de métricas           | ✅ limitado     | ❌        | ✅       |
| Verificar prestadores           | ✅              | ❌        | ✅       |
| Resolver disputas               | ✅              | ❌        | ✅       |
| Push notifications              | ❌ PWA limitado | ✅ Expo   | ❌       |
| GPS nativo                      | ❌ browser      | ✅        | ❌       |

---

_Ajudaê — FLUXOGRAMA.md_
_Atualizar sempre que: um novo fluxo for implementado, uma plataforma mudar de fase, ou a máquina de estados evoluir._
