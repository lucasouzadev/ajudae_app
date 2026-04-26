# README_OPERACAO.md — Comissionados

> Manual do dia a dia para o COO (Sócio 3) e equipe de operações.
> Este documento responde: "o que eu faço quando X acontece?"
> **Regra:** Qualquer situação não coberta aqui vira um novo item neste arquivo após resolvida.

---

## Acesso ao Painel Admin

- **URL:** (preencher após deploy)
- **Login:** Use sua conta com role `admin`
- **Supabase Dashboard:** https://app.supabase.com (Tech Lead fornece acesso)

---

## Rotina Diária (checklist)

Execute isso toda manhã antes de começar o dia:

```
[ ] Abrir painel admin → verificar alertas no Dashboard (Tela A1)
[ ] Checar tickets abertos há mais de 4h → priorizar resolução
[ ] Verificar prestadores pendentes de aprovação → aprovar/reprovar em até 24h
[ ] Checar se há pedidos travados em status antigo (ver seção "Pedido Travado")
[ ] Responder mensagens no WhatsApp Business
```

---

## Situação 1 — Prestador solicitou cadastro

**Onde ver:** Painel Admin → Tela A2 (Prestadores Pendentes)

**O que fazer:**

1. Verificar se os dados estão completos (foto, categorias, veículo)
2. Se incompleto: reprovar com motivo "Complete seu perfil para aprovação" e orientar via WhatsApp
3. Se completo: ligar ou mandar mensagem para o prestador confirmando identidade
4. Aprovar ou reprovar na Tela A2
5. Se aprovado: enviar mensagem de boas-vindas com instruções de como usar o app

**Meta de resposta:** até 24h após o cadastro.

---

## Situação 2 — Pedido travado (status não avançou)

**Sintomas:** Cliente reclama que o prestador "sumiu", ou pedido está em `accepted` há mais de 2h sem mudança.

**Como investigar:**

1. Painel Admin → Tela A3 → filtrar por status
2. Clicar no pedido → ver Timeline de Eventos (Tela A4)
3. Verificar quando foi a última mudança de status

**O que fazer:**

- Se prestador não respondeu e não atualizou status:
  1. Tentar contato com o prestador (telefone do perfil)
  2. Se não atender: mudar status para `cancelled` com motivo "no_show" via painel admin
  3. Registrar nota no ticket (se houver) ou criar ticket manual
  4. Considerar advertência ou bloqueio temporário do prestador (se reincidente)

- Se o cliente não está acessível para fornecer OTP:
  1. Entrar em contato com o cliente
  2. Se necessário: gerar novo OTP via painel admin (Tela A4 → "Gerar novo OTP")
  3. Registrar o incidente

---

## Situação 3 — Prestador não apareceu (no-show)

**O que fazer:**

1. Verificar timeline do pedido: ele aceitou mas não atualizou para `en_route`?
2. Tentar contato com o prestador
3. Cancelar o pedido via admin com motivo `no_show`
4. Contatar o cliente para pedir desculpas e orientar a criar novo pedido
5. Se for a primeira ocorrência do prestador: advertência (registrar no campo notes_admin)
6. Se for reincidente (2+): bloquear o prestador (`active = false` via painel)
7. Registrar o incidente em `INCIDENTS.md`

---

## Situação 4 — Cliente reclamou do serviço

**O que fazer:**

1. Ouvir o cliente com atenção (WhatsApp ou telefone)
2. Verificar se há ticket aberto no painel
3. Se não há ticket: orientar o cliente a abrir via app, ou abrir manualmente no painel
4. Verificar a timeline de eventos e fotos de evidência
5. Tomar uma das decisões:
   - Serviço foi realizado adequadamente: explicar ao cliente, fechar ticket como `resolved`
   - Serviço foi ruim ou incompleto: definir compensação (desconto no próximo, reembolso parcial)
   - Houve dano material: escalar para Tech Lead + advogado

**Meta de resposta ao cliente:** até 4h em dias úteis.

---

## Situação 5 — Cliente quer cancelar após aceite

**O que fazer:**

1. Verificar se o prestador já está a caminho
2. Se prestador ainda não saiu: cancelar via painel (motivo `client_gave_up`)
3. Se prestador já está a caminho: entrar em contato com o prestador para avisar
4. Registrar o cancelamento
5. Se aplicável: cobrar taxa de cancelamento (Fase 2 — quando pagamento estiver integrado)

---

## Situação 6 — Prestador quer ser desativado temporariamente

**O que fazer:**

1. Confirmar pelo WhatsApp
2. No painel: Providers → Editar prestador → `active = false`
3. Confirmar ao prestador que está offline
4. Quando quiser voltar: o próprio prestador ativa no app (toggle online/offline)

---

## Situação 7 — Conflito entre cliente e prestador (disputa séria)

**O que fazer:**

1. Ouvir ambas as partes separadamente
2. Coletar evidências: fotos, timeline de eventos, mensagens rápidas
3. Documentar tudo no ticket (notes_admin)
4. Tomar decisão dentro de 24h
5. Comunicar ambas as partes com clareza e educação
6. Se envolver dinheiro: consultar Tech Lead antes de qualquer reembolso
7. Registrar o caso em `INCIDENTS.md` para aprendizado

---

## Situação 8 — OTP inválido (prestador não consegue concluir)

**Sintomas:** Prestador diz que o PIN está errado ou expirado.

**O que fazer:**

1. Verificar no painel se o pedido está em `in_progress`
2. Verificar se `otp_expires_at` ainda está no futuro
3. Se expirado: gerar novo OTP via painel (Tela A4 → "Gerar novo OTP") e passar ao cliente
4. Se prestador errou 5x: pedido foi para `disputed`. Investigar se é tentativa de fraude
5. Registrar a ocorrência

---

## Situação 9 — Suspeita de fraude

**Sinais de alerta:**

- Prestador conclui serviços sem OTP (status mudando de forma suspeita)
- Cliente abre ticket em todos os pedidos sem justificativa clara
- Mesmo IP cadastrando múltiplas contas
- Prestador com muitos cancelamentos pós-aceite

**O que fazer:**

1. Suspender conta suspeita imediatamente (`active = false` ou `is_active = false`)
2. Coletar evidências (timeline, logs)
3. Consultar Tech Lead para análise técnica
4. Se confirmado: banimento permanente e registro em `INCIDENTS.md`
5. Se envolver dinheiro: consultar advogado

---

## Aprovação de Prestadores — Critérios

Para aprovar um prestador, verifique:

```
[ ] Foto de perfil real (não avatar, não logo)
[ ] Nome completo preenchido
[ ] Telefone válido
[ ] Pelo menos 1 categoria selecionada
[ ] Veículo compatível com as categorias (frete/mudança exige van/caminhão)
[ ] Verificação de identidade básica (ligação ou troca de mensagem confirmando)
```

Para reprovar, use um destes motivos:

- "Foto de perfil inválida — use uma foto real sua"
- "Complete todas as informações do perfil"
- "Veículo não compatível com as categorias selecionadas"
- "Não foi possível confirmar identidade"

---

## Métricas para Acompanhar Semanalmente

Acesse o PostHog e verifique:

| Métrica                   | Meta MVP             | Onde ver                 |
| ------------------------- | -------------------- | ------------------------ |
| Pedidos criados na semana | Crescimento positivo | PostHog → Events         |
| Taxa de conclusão         | > 85%                | PostHog → Funnel         |
| Tickets por 100 pedidos   | < 8                  | PostHog → Events         |
| Tempo médio até aceite    | < 5 min              | Supabase → requests      |
| Prestadores ativos        | > 10                 | Painel Admin → Dashboard |

---

## Contatos de Emergência

| Situação              | Contato                        |
| --------------------- | ------------------------------ |
| Bug crítico no app    | Tech Lead (Sócio 1) — WhatsApp |
| Problema de pagamento | Tech Lead + PSP (suporte)      |
| Problema jurídico     | Advogado parceiro              |
| Banco de dados fora   | Tech Lead imediatamente        |
