# Handoff — Sprint MVP Test Closed

**Data:** 2026-05-04  
**Branch:** `claude/fix-provider-profile-sync-DOXXR`  
**Contexto:** Sprint de fechamento do MVP para QA fechado com usuários reais

---

## O que estava quebrado (bugs corrigidos hoje)

### Bug 1 — `duplicate locating state` (bundling error)

**Sintoma:** Metro bundler falhava ao iniciar com erro de variável duplicada relacionada a estado de localização.

**Causa:** Declaração duplicada de variável de estado (provavelmente `const [locating, setLocating]`) em algum componente de mapa — possivelmente `MapReal.tsx` ou `index.tsx` após merge de branches.

**Correção:** Remoção da declaração duplicada. Manter apenas uma instância do estado de localização no componente pai.

**Arquivos afetados:** Componente de mapa (verificar `MapReal.tsx` e `index.tsx`).

---

### Bug 2 — `expo-notifications` crash no bundling

**Sintoma:** App não iniciava — erro de importação ou configuração do `expo-notifications` no ambiente de build.

**Causa:** Incompatibilidade de configuração ou import incorreto do módulo no contexto do Expo SDK 54.

**Correção:** Ajuste de importação/configuração do `expo-notifications` em `NotificationContext.tsx`.

**Atenção:** Expo Go tem limitações com `expo-notifications` em algumas versões. Se o bug reaparecer em QA, testar com build de desenvolvimento (`expo run:android` / `expo run:ios`) em vez de Expo Go.

---

### Bug 3 — `useAuth` chamado fora do AuthProvider

**Sintoma:** Erro em runtime: "useAuth must be used within an AuthProvider" ou equivalente React context error.

**Causa:** Algum componente ou hook chamando `useAuth()` fora da árvore do `AuthProvider`. Comum quando um componente é movido para fora da hierarquia de providers ou quando um hook de nível superior tenta acessar o contexto antes do provider ser montado.

**Correção:** Mover o componente/hook para dentro da árvore do provider, ou garantir que a ordem do provider tree está correta (ver seção "Provider Tree" no CLAUDE.md).

**Ordem obrigatória do provider tree:**
```
AuthProvider
  └─ PermissionsProvider
       └─ PortfolioProvider
            └─ RequestsProvider
                 └─ ServiceProvider
                      └─ NotificationProvider
                           └─ PaymentsProvider
                                └─ SupportProvider
                                     └─ AuthGate
                                          └─ PermissionGate
```

Qualquer hook de contexto só pode ser chamado dentro do provider correspondente ou de seus filhos.

---

## O que está sendo implementado nesta sprint

### 1. Providers reais (remoção do MOCK_PROVIDERS)

**O que era:** `constants/mockData.tsx` exportava `MOCK_PROVIDERS` — array estático com prestadores fictícios com dados inventados (nomes, coordenadas SVG, ratings fixos).

**O que vira:** Query direta na tabela `providers` do Supabase via `lib/providers.ts` (arquivo novo criado nesta sprint por agente separado).

**Query implementada:**
```sql
SELECT 
  providers.id,
  providers.active,
  providers.location_lat,
  providers.location_lng,
  providers.service_type,
  providers.rating_avg,
  providers.rating_count,
  profiles.name
FROM providers
JOIN profiles ON providers.id = profiles.id
WHERE providers.active = true
ORDER BY providers.rating_avg DESC
```

**Impacto:** Marketplace agora exibe apenas prestadores reais cadastrados no Supabase. Se não houver prestadores com `active = true` no banco, o mapa aparece vazio — isso é correto.

**Arquivos modificados:** `marketplace.tsx`, `index.tsx` (substituir referências a `MOCK_PROVIDERS` por chamadas ao `lib/providers.ts`).

---

### 2. Toggle online real

**O que era:** Toggle "Estou Online" no dashboard do prestador alterava estado local apenas (`useState`) — não persistia no banco.

**O que vira:** Ao ativar, faz `PATCH providers SET active = true WHERE id = user.id`. Ao desativar, `active = false`.

**Regra de negócio:** Prestador com serviço ativo não deve poder desligar o toggle enquanto o serviço não concluir. Validar no frontend e no backend.

---

### 3. Remoção de credenciais demo hardcoded

Qualquer string de e-mail, senha ou chave de API que estava hardcoded no código (ex.: `email: 'demo@ajudae.com', password: '123456'`) foi removida.

**Regra permanente:** Credenciais de teste não entram no código. Usar variáveis de ambiente (`.env.local`, não commitado) ou documentar credenciais de QA separadamente fora do repositório.

---

### 4. Métricas reais no dashboard do prestador

`providers.rating_avg` e `providers.rating_count` agora são lidos do banco. Antes eram valores hardcoded na tela.

---

## Contratos de API que o backend precisa implementar (push em background)

Para que push notifications funcionem com o app fechado, o servidor precisa:

### Contrato 1: Salvar push_token

O frontend já obtém o `ExpoPushToken` via `expo-notifications`. Falta persistir no banco.

**Tabela:** adicionar coluna `push_token TEXT` em `profiles`.

**Chamada do frontend (a implementar):**
```typescript
// Em NotificationContext.tsx, após obter o token:
await supabase
  .from('profiles')
  .update({ push_token: token.data })
  .eq('id', user.id);
```

**Quando invalidar:** se a API Expo retornar `DeviceNotRegistered`, fazer `UPDATE profiles SET push_token = NULL WHERE id = user.id`.

---

### Contrato 2: Função de envio de push no servidor

```typescript
// Edge Function: send_push_notification
// Entrada:
{
  user_id: string,       // destinatário
  event: string,         // ex: 'service_accepted', 'new_message'
  vars: Record<string, string>  // variáveis para montar título/corpo
}

// O servidor:
// 1. Busca push_token em profiles WHERE id = user_id
// 2. Se push_token null, ignora (usuário não tem device registrado)
// 3. Chama Expo Push API:
POST https://exp.host/--/api/v2/push/send
{
  "to": push_token,
  "title": "...",        // montado a partir do event + vars
  "body": "...",
  "data": {
    "screen": "/track",  // tela para navegar ao tocar
    "service_id": "..."
  },
  "channelId": "ajudae-service"  // Android channel
}
```

---

### Contrato 3: Trigger no Supabase para disparar push

Adicionar database trigger em `services` que chama `send_push_notification` ao mudar `status`:

```sql
-- Pseudo-código — implementar como Supabase Function
CREATE OR REPLACE FUNCTION notify_service_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando serviço é aceito, notificar cliente
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM send_push_notification(NEW.client_id, 'service_accepted', ...);
  END IF;
  
  -- Quando serviço é concluído, notificar ambos
  IF NEW.status = 'completed' THEN
    PERFORM send_push_notification(NEW.client_id, 'service_completed', ...);
    PERFORM send_push_notification(NEW.provider_id, 'job_completed', ...);
  END IF;
  
  -- Continuar para outros estados...
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_status_change
AFTER UPDATE OF status ON services
FOR EACH ROW EXECUTE FUNCTION notify_service_status_change();
```

**Nota:** Os 22 eventos do `NotificationContext` (foreground) servem de mapa para o que o backend precisa implementar. Cada evento do catálogo tem um destinatário implícito (cliente, prestador ou ambos).

---

## Como testar com 2 celulares (QA manual)

### Pré-requisitos

- 2 smartphones (iOS ou Android, qualquer combinação)
- Expo Go instalado em ambos
- 2 contas criadas no Supabase do projeto (1 cliente, 1 prestador)
- Rede Wi-Fi comum (ou dados móveis)
- `npx expo start` rodando na máquina de desenvolvimento

### Passo a passo

**Celular A — Prestador:**
1. Abre Expo Go → escaneia QR do `npx expo start`
2. Loga com conta de prestador
3. Completa onboarding se necessário
4. Na tela inicial, ativa "Estou Online"
5. Confirma que aparece online (ícone verde no dashboard)

**Celular B — Cliente:**
1. Abre Expo Go → escaneia mesmo QR
2. Loga com conta de cliente
3. Abre o mapa — o prestador do Celular A deve aparecer como pin
4. Toca no prestador → vê perfil
5. Clica em "Solicitar Serviço"
6. Preenche endereço, tipo de serviço, detalhes → envia

**Celular A — Prestador recebe pedido:**
7. Deve receber push notification com o pedido (se app aberto)
8. Vai para tela do pedido → aceita

**Celular B — Cliente vê aceitação:**
9. Status muda para "Aceito" — deve aparecer em `track.tsx`
10. Push notification chega informando que prestador aceitou

**Início do serviço (presencial — ambos os celulares juntos):**
11. Prestador (Celular A): tela `start-pin.tsx` mostra PIN de 4 dígitos
12. Cliente (Celular B): digita os 4 dígitos em `confirm-start-pin.tsx`
13. Se correto: status muda para "Em andamento"
14. Se incorreto: tenta de novo (máx 5 vezes)

**Conclusão do serviço:**
15. Cliente (Celular B): tela `otp-modal.tsx` mostra PIN de 6 dígitos
16. Prestador (Celular A): digita os 6 dígitos em `job-otp.tsx`
17. Se correto: serviço concluído, ambos desbloqueados

**Avaliação:**
18. Cliente (Celular B): tela `rate.tsx` aparece automaticamente
19. Avalia 1–5 estrelas → confirma
20. Verificar no Supabase: `SELECT * FROM ratings ORDER BY created_at DESC LIMIT 1`

### Cenários de teste adicionais

| Cenário | Como testar |
|---------|-------------|
| PIN incorreto 5 vezes | Digitar PIN errado repetidamente — deve entrar em `disputed` |
| Prestador vai offline durante serviço | Desativar toggle — serviço não deve ser afetado |
| Push com app fechado | Fechar app, outro celular muda status — verificar se push chega (só após Fase 1.5) |
| LGPD: revogar permissões | Settings do device → revogar localização → abrir app → verificar PermissionGate |

---

## Dívida técnica criada nesta sprint

| Item | Origem | Severidade | Observação |
|------|--------|-----------|-----------|
| `lib/providers.ts` sem cache | Criado nesta sprint | Média | Query ao Supabase a cada render do marketplace — adicionar cache local (ex: SWR ou React Query) antes de beta |
| Prestador offline durante serviço ativo | Regra de negócio não implementada | Média | Frontend não impede desligar toggle com serviço ativo — backend também não valida |
| `push_token` não persistido no banco | Pré-existente, agora documentado | Alta | Notificações em background não funcionam sem isso |
| Sem tratamento de `DeviceNotRegistered` da API Expo | Novo risco com push background | Média | Implementar ao integrar push servidor |

---

_Handoff gerado em 2026-05-04. Próximo handoff após QA fechado._
