# PIN_SYSTEM.md — Sistema de PIN Complementar (Dual-PIN)

> Especificação técnica completa do sistema de autenticação mútua por PIN utilizado no Ajudaê.
> **Owner:** Tech Lead (Sócio 1) — atualizar a cada mudança no algoritmo ou no fluxo operacional.

---

## Visão Geral

O sistema de PIN Complementar substitui o modelo de PIN único sequencial. Ele garante autenticação
mútua entre cliente e prestador em dois momentos críticos do serviço — chegada e conclusão — sem
depender de conectividade de rede em nenhum desses momentos.

**Dois PINs, dois sentidos:**

| PIN | Dígitos | Posse | Usado em | Direção |
|-----|---------|-------|----------|---------|
| `pin_start` | 4 | Prestador | Chegada ao local | Prestador mostra → Cliente digita |
| `pin_conclusion` | 6 | Cliente | Conclusão do serviço | Cliente mostra → Prestador digita |

**Commitment:** uma impressão digital criptográfica do par de PINs e do ID do serviço, armazenada
em ambos os dispositivos e no servidor. Permite verificação local sem rede.

---

## Ciclo de Vida do PIN

### 1. Criação (requer rede)

Quando o cliente confirma o pedido, a Edge Function `request_create` executa:

1. Gera `pin_start` — 4 dígitos aleatórios (entropia criptográfica)
2. Gera `pin_conclusion` — 6 dígitos aleatórios (entropia criptográfica)
3. Calcula `commitment = djb2_hash(serviceId + "|" + pin_start + "|" + pin_conclusion)`
4. Armazena `commitment` na tabela `requests` (coluna `commitment`)
5. **Não armazena os PINs brutos no servidor**
6. Retorna `pin_conclusion` ao cliente (exibido no modal Tela 4B — uma única vez)
7. Armazena `pin_start` + `commitment` para entrega ao prestador no momento da aceitação

### 2. Distribuição (requer rede)

- **Cliente:** recebe `pin_conclusion` no modal 4B no momento da criação. Também recebe o
  `commitment` que fica sincronizado no armazenamento local do dispositivo.
- **Prestador:** ao aceitar o pedido (`request_accept`), recebe `pin_start` + `commitment`.
  O `pin_start` é exibido na Tela P3/P4 com instrução de uso.

Após esse ponto, nenhum PIN bruto circula pela plataforma.

### 3. Verificação na chegada (offline OK)

```
Estado: en_route → in_progress

1. Prestador exibe pin_start na tela do seu dispositivo
2. Cliente digita os 4 dígitos no seu dispositivo
3. App do cliente recomputa localmente:
   computed = djb2_hash(serviceId + "|" + digitado + "|" + pin_conclusion_local)
4. Compara computed com commitment armazenado localmente
5. Match → avança para in_progress (sincroniza quando houver rede)
   No match → registra tentativa falha em fila local; exibe erro genérico
```

### 4. Verificação na conclusão (offline OK)

```
Estado: in_progress → completed

1. Cliente exibe pin_conclusion na tela do seu dispositivo
2. Prestador digita os 6 dígitos no seu dispositivo
3. App do prestador recomputa localmente:
   computed = djb2_hash(serviceId + "|" + pin_start_local + "|" + digitado)
4. Compara computed com commitment armazenado localmente
5. Match → avança para completed (sincroniza quando houver rede)
   No match → registra tentativa falha em fila local; exibe erro genérico
```

### 5. Sincronização pós-verificação

Quando a rede for restaurada, o app envia o resultado da verificação offline para o backend:
- Transição de status validada pelo servidor (via commitment armazenado server-side)
- Tentativas falhas registradas em `request_events`
- Se tentativas offline acumuladas ≥ 5 antes da sincronização → status vai para `disputed`

---

## Algoritmo de Commitment

### djb2 (MVP)

```typescript
/**
 * djb2 hash — rápido, determinístico, sem dependência de crypto nativa.
 * Adequado para MVP offline. Ver seção "Futuro" para migração a HMAC-SHA256.
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 XOR char
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // força uint32 sem sinal
  }
  return hash;
}

/**
 * Calcula o commitment para um serviço.
 * @param serviceId  UUID do pedido (ex: "b3f1a2c4-...")
 * @param pinStart   4 dígitos do prestador (ex: "7382")
 * @param pinConclusion  6 dígitos do cliente (ex: "492817")
 */
function computeCommitment(
  serviceId: string,
  pinStart: string,
  pinConclusion: string
): string {
  const input = `${serviceId}|${pinStart}|${pinConclusion}`;
  return djb2Hash(input).toString(16).padStart(8, '0');
}

// Verificação na chegada (dispositivo do cliente)
function verifyPinStart(
  serviceId: string,
  inputPin: string,
  pinConclusionLocal: string,
  storedCommitment: string
): boolean {
  return computeCommitment(serviceId, inputPin, pinConclusionLocal) === storedCommitment;
}

// Verificação na conclusão (dispositivo do prestador)
function verifyPinConclusion(
  serviceId: string,
  pinStartLocal: string,
  inputPin: string,
  storedCommitment: string
): boolean {
  return computeCommitment(serviceId, pinStartLocal, inputPin) === storedCommitment;
}
```

**Separador `|`:** impede que a concatenação de serviceId e PIN produza colisões
(ex: serviceId=`"abc"` + pin=`"123"` != serviceId=`"ab"` + pin=`"c123"`).

---

## Máquina de Estados

```
                    ┌──────────────────────────────┐
                    │           requested           │
                    └──────┬───────────────┬────────┘
                           │               │
                    aceitar│        cancelar│ (cliente)
                           │               │
                    ┌──────▼────────┐      ▼
                    │   accepted    │   cancelled
                    └──────┬────────┘
                           │
               "a caminho" │ (prestador)
                           │
                    ┌──────▼────────┐
                    │   en_route    │
                    └──────┬────────┘
                           │
         validar pin_start │ (cliente digita → app verifica commitment)
                           │
                    ┌──────▼────────┐
                    │  in_progress  │
                    └──────┬────────┘
                           │
     validar pin_conclusion│ (prestador digita → app verifica commitment)
                           │
                    ┌──────▼────────┐
                    │   completed   │
                    └───────────────┘

A qualquer momento:
  → disputed  (ticket aberto pelo cliente/admin, ou 5 tentativas erradas em qualquer PIN)
  accepted → cancelled  (com aviso de taxa de deslocamento)
```

### Transições válidas (tabela)

| De           | Para         | Quem autoriza | Requer PIN         |
|--------------|--------------|---------------|--------------------|
| `requested`  | `accepted`   | Prestador     | Não                |
| `accepted`   | `en_route`   | Prestador     | Não                |
| `en_route`   | `in_progress`| Cliente       | `pin_start` (4 dig)|
| `in_progress`| `completed`  | Prestador     | `pin_conclusion` (6 dig)|
| `requested`  | `cancelled`  | Cliente       | Não                |
| `accepted`   | `cancelled`  | Cliente/Admin | Não (aviso de taxa)|
| qualquer     | `disputed`   | Qualquer/Auto | Não                |

Toda transição não listada é **bloqueada** na Edge Function `request_update_status`.

---

## Análise de Segurança

### Ataques prevenidos

| Vetor de ataque | Mitigação |
|---|---|
| Prestador conclui serviço sem estar presente | Precisa do `pin_conclusion` que só o cliente tem |
| Cliente nega que o prestador chegou | Prestador tem `pin_start`; cliente foi obrigado a digitar para avançar |
| Interceptação do PIN em trânsito | PINs não trafegam após distribuição inicial |
| Força bruta do `pin_conclusion` | 1.000.000 combinações + lockout em 5 tentativas |
| Força bruta do `pin_start` | 10.000 combinações + lockout em 5 tentativas |
| Replay de commitment | Commitment inclui `serviceId` único — inválido em outro serviço |
| Adulteração do commitment local | Servidor valida o mesmo commitment na sincronização |
| Collisão de hash intencional | Separador `|` previne colisões por concatenação |

### Propriedades formais

- **Autenticação mútua:** ambas as partes precisam provar presença física (posse de PIN)
- **Zero-knowledge parcial:** nenhuma parte conhece o PIN da outra antes do momento de uso
- **Offline-first:** verificação é `O(n)` no comprimento da string — sem I/O
- **Auditabilidade:** todas as tentativas (com ou sem rede) são registradas em `request_events`

---

## Notas Operacionais

### PIN perdido pelo cliente (`pin_conclusion`)

1. Cliente abre ticket (Tela 8) informando que perdeu o código
2. Admin, via Tela A4, aciona "Regenerar PINs"
3. Sistema gera novos `pin_start`, `pin_conclusion` e `commitment`
4. Novos valores são sincronizados em ambos os dispositivos na próxima conexão
5. PINs antigos são invalidados imediatamente no servidor
6. Evento registrado em `request_events` com `actor = admin`

**Nota:** o Admin regenera **ambos** os PINs. Não é possível regenerar apenas um — isso
garantiria que o commitment antigo não fosse reutilizável.

### Prestador com múltiplas tentativas erradas

Se o prestador errar o `pin_conclusion` 5 vezes, o pedido vai para `disputed` automaticamente.
O Admin analisa `request_events` para determinar se foi erro genuíno (cliente deu PIN errado)
ou tentativa de fraude.

### Pedido em `disputed` por PIN

O Admin pode:
- Regenerar PINs e retornar o pedido para `in_progress` (se confirmada boa-fé)
- Manter `disputed` e iniciar processo de reembolso
- Bloquear prestador se padrão de fraude identificado

---

## Futuro: Migração para HMAC-SHA256

O djb2 é adequado para MVP offline, mas não oferece resistência criptográfica formal.
Para produção com volume maior:

```typescript
// Substituição server-side (Supabase Edge Function)
// Usa chave secreta — nunca exposta ao cliente
async function computeCommitmentHMAC(
  serviceId: string,
  pinStart: string,
  pinConclusion: string,
  secretKey: CryptoKey
): Promise<string> {
  const input = `${serviceId}|${pinStart}|${pinConclusion}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const signature = await crypto.subtle.sign('HMAC', secretKey, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

**Impacto da migração:**
- Commitment gerado exclusivamente server-side (não replicável offline sem a chave)
- Verificação offline passa a exigir token de verificação pré-gerado em vez de recomputo local
- Requer redesign do protocolo de sincronização offline
- Recomendado para Fase 2, após validação do MVP

---

## Referências

- PRD — Tela 4B, Tela P3, Tela P5, Seção "Sistema de PIN Complementar"
- ARCHITECTURE.md — ADR-006
- Edge Functions: `request_create`, `request_accept`, `request_update_status`, `request_complete_with_otp`
- Tabela: `requests` (colunas: `commitment`, `pin_attempt_count`)
- Tabela: `request_events` (auditoria de tentativas)
