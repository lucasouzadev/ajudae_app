# Documentação e pesquisa de produto para o app Ajudaê

## Contexto do produto e proposta de valor

A proposta do **Ajudaê** é operar como um **marketplace com duas pontas (cliente ↔ prestador)**, com UX inspirada em apps “de chamada” (tempo real + mapa) e “de catálogo” (busca + filtros), mas direcionado a **mudanças, fretes e pequenos serviços**. O caso de uso inicial mais forte é o “preciso de um frete/mudança agora e não conheço ninguém / não tenho contato disponível”, que exige **descoberta rápida, oferta local e execução com rastreio**.

Como referência de padrão mental do usuário, plataformas de mobilidade e delivery consolidaram a lógica de: (a) abrir o app, (b) ver opções próximas, (c) escolher, (d) acompanhar status e (e) pagar dentro da plataforma — por exemplo, o site do entity["company","iFood","brazil food delivery app"] se posiciona como forma fácil de pedir “delivery de comida e mercado”, com avaliações e entrega em casa. citeturn25search0turn25search3 A entity["company","99","brazil ride-hailing app"] se descreve no Google Play como app com opções de corridas e também “entregas e transporte de encomendas”. citeturn25search6 O entity["company","Uber","ride-hailing platform"] no Brasil comunica a mesma dualidade (viagens e entregas) e foco em flexibilidade. citeturn25search2turn25search8

No recorte específico de **itens grandes / carreto / mudanças**, a entity["company","Lalamove","on-demand delivery platform"] explicita um catálogo de veículos (ex.: hatch, sedan, utilitário, van, carreto) e posiciona “plataforma de entregas sob demanda”, inclusive com uso de carreto. citeturn13view3turn12search20 Isso é um forte sinal de que há demanda e que o padrão “on-demand + escolha de veículo” é compreensível também fora do contexto “carro para passageiro”.

## Panorama competitivo e aprendizados reaproveitáveis

O espaço de “serviços locais sob demanda” no Brasil tem, em geral, dois modelos predominantes:

O modelo **dispatch / chamada imediata**, em que o app encontra oferta próxima e tenta confirmar uma aceitação rápida, com rastreio e SLA de chegada. Exemplos do ecossistema de entregas sob demanda usualmente exibem **veículos/categorias** e deixam o prestador escolher aceitar pedidos na região (padrão descrito no FAQ da Lalamove: conectar entregadores autônomos a usuários e mostrar pedidos na região). citeturn12search3turn13view3

O modelo **orçamento / negociação guiada**, em que o usuário descreve o problema e recebe orçamentos, decide e então paga ou combina execução. A entity["company","Triider","brazil services marketplace"] exemplifica bem esse padrão: “receba orçamentos, converse … contrate e pague tudo em um único lugar”, além de destacar verificação de profissionais e suporte. citeturn14view0turn14view1

Há ainda um terceiro caminho, mais “classificados com leads”: a entity["company","GetNinjas","brazil services marketplace"] descreve um fluxo onde o cliente descreve o serviço e “até 4 profissionais” podem entrar em contato; do lado do profissional, ele recebe e escolhe pedidos e negocia diretamente, definindo seus próprios preços. citeturn13view2 (Esse modelo é útil como referência de **captação e liquidez**, mas tende a abrir mais espaço para negociação fora da plataforma, o que conflita com o seu objetivo de checkout/repasse controlado.)

**Aprendizados que encaixam diretamente no Ajudaê:**

- **Separação de experiência Cliente vs Prestador**: a Lalamove expõe explicitamente “apps para clientes” e “para entregadores”, o que reduz confusão de UX e permite fluxos e permissões diferentes (ex.: rastreio contínuo só no app do prestador durante corrida). citeturn13view3
- **Pagamento condicionado à conclusão (escrow/hold lógico)**: o Triider comunica “pague só depois do serviço realizado”, reforçando um padrão de confiança essencial quando o serviço é presencial. citeturn14view1
- **Verificação e segurança como proposta central**: o Triider diz realizar verificação de antecedentes e referências, e isso vira parte do valor percebido. citeturn14view1
- **Operação de disputas**: relatórios internacionais sobre marketplaces apontam que riscos como fraude e golpes são preocupações comuns e que marketplaces às vezes atuam na mediação de disputas entre consumidores e prestadores. citeturn23view0turn26view0

Isso converge com a sua regra de negócio de “ticket em caso de cancelamento/problema” e “stand-by para análise do time”.

## Requisitos funcionais e fluxos do aplicativo

O produto, pela sua descrição, é um “híbrido” de mapa (descoberta imediata) com busca estilo catálogo (descoberta por filtros). Abaixo está a documentação funcional no formato de requisitos + estados do serviço.

### Papéis e perfis

Cliente (usuário final) cria solicitações, acompanha, paga, confirma conclusão, avalia.

Prestador (motorista/profissional) recebe propostas, aceita/recusa, cumpre SLA de chegada, executa serviço, registra etapas e confirma conclusão (com validação de co-localização).

Equipe do app (operação) trata tickets, disputas, fraudes, reembolsos/ajustes e qualidade (verificação de prestadores, auditoria de cancelamentos).

Esse desenho é compatível com padrões observados em plataformas que têm “cliente vs profissional” como experiências diferentes (ex.: Lalamove; Triider). citeturn13view3turn14view0turn14view1

### Jornada do cliente

Autenticação e onboarding:

- Login/cadastro.
- Onboarding de perfil (nome, telefone, método de pagamento; eventualmente endereço “favorito” e preferências).
- Permissão de GPS (para mapa e cálculo de distância/ETA).
- Permissão de câmera (para envio de fotos de itens, documentos do serviço, evidências em disputa, etc.).

A necessidade de transparência e minimização de dados, especialmente para recursos sensíveis como localização e câmera, é fortemente enfatizada em políticas de plataforma: a documentação da entity["company","Apple","consumer electronics company"] sobre purpose strings descreve que essas mensagens ajudam as pessoas a entenderem por que o app precisa acessar recursos protegidos (ex.: câmera, localização) e o que fará com esses dados. citeturn9view0

Tela inicial (Mapa de serviços):

- Mapa com “pontos”/ofertas próximas (por categoria) e uma alternativa de lista.
- Header com barra de busca rápida (lupa).
- Bottom-nav: Início | Serviços | Perfil (conforme seu escopo).

Página de busca:

- Resultados por categoria (Mudança, Frete/Carreto, Entrega e busca, etc.), com filtros por: tipo (pessoa/empresa), distância, preço, avaliação, disponibilidade “agora”, tipo de veículo e capacidade.
- Ordenação padrão: “mais próximo + disponível + melhor custo/benefício” (com preferências do usuário).

A ideia de combinar catálogo por categoria e acompanhamento do pedido existe claramente em marketplaces de serviços (Triider) e em catálogos com escolha rápida (iFood). citeturn14view0turn25search0turn25search3

Solicitação (criação da proposta):

- Definir serviço: **Mudança/Frete** (MVP).
- Definir origem/destino (no mapa ou por busca).
- Escolher veículo (ex.: carro, utilitário, van, caminhão; no MVP pode ser “carro/van/caminhão” e evoluir — padrão de escolher veículo é comum em logística sob demanda). citeturn13view3turn12search20
- Informar carga: quantidade de itens, itens frágeis, necessidade de ajudante, escadas/elevador, janela de horário (agora ou agendado).
- Adicionar fotos e observações.
- Ver “estimativa” (preço/tempo) + termos.

Confirmação e acompanhamento:

- Ao enviar, status do pedido muda para “solicitado”.
- Quando um prestador aceita, muda para “aceito / a caminho”, com ETA.
- Dashboard do serviço: tempo, características, preferências, valores, cláusulas.

Finalização:

- Check-out (captura/confirmação final do pagamento conforme o modelo escolhido).
- Repasse (split/transferência para prestador).
- Avaliação mútua.

O padrão de rastreio e estados (pedido aceito, acompanhamento em tempo real) é central no discurso de apps de delivery e marketplace; por exemplo, o próprio iFood no Google Play destaca acompanhar etapas de preparação/entrega. citeturn25search3

### Jornada do prestador

Onboarding do prestador (MVP com foco em mudança/frete):

- Cadastro do perfil (pessoa física e/ou empresa).
- Documentos e verificação (CNH quando aplicável, documento do veículo, comprovante, etc.).
- Definir “categorias atendidas”, raio de atuação e disponibilidade.
- Configuração de conta para recebimento (dentro do PSP escolhido).

A proposta de “profissionais verificados” aparece como promessa explícita no Triider e tende a ser decisiva em serviços presenciais. citeturn14view1

Recebimento e análise da proposta:

- Prestador visualiza: tipo de serviço, distância, origem/destino, itens/carga, valor, regras, perfil do cliente com **dados não sensíveis**.
- Aceita ou recusa; se aceita, inicia SLA de chegada.

Execução com etapas:

- “A caminho” (tracking).
- “Cheguei” (check-in).
- “Iniciando carregamento” (opcional).
- “Em rota”.
- “Finalizando” (check-out/confirmação).
- “Concluído”.

Separar a experiência “cliente vs prestador” em apps distintos é coerente com o que a Lalamove comunica (apps diferentes) e reduz risco de permissões desnecessárias no app do cliente (ex.: rastreio contínuo). citeturn13view3

### Regra de confirmação por co-localização (anti-fraude e integridade do fluxo)

Seu requisito “ambos precisam estar presentes e nada deve ser finalizado no meio do processo ou logo no início” pode ser documentado como **política de conclusão**:

Condição mínima para “concluído”:

- Cliente e prestador executam ação de “Finalizar” dentro de uma janela de tempo (ex.: 10 min).
- Ambos devem estar dentro de um raio geográfico configurável (ex.: 50–150 m) do ponto de conclusão (destino) — com tolerância para erros de GPS.
- O app pode exigir um segundo fator simples (OTP de 4–6 dígitos, QR code no celular do cliente, ou PIN exibido para o prestador).

Do ponto de vista de compliance e boas práticas, “dados locacionais” são tratados com rigor no Brasil: o Decreto 8.771/2016 (regulamentando o Marco Civil) define dado pessoal incluindo “dados locacionais” quando relacionados a uma pessoa e exige padrões de segurança (controle estrito de acesso, inventário de acessos, criptografia, etc.). citeturn18view0

### Cancelamentos, tickets e “stand-by”

Regras sugeridas (documentação de operação):

- Cancelamento pelo cliente _antes_ de aceitar: encerra sem penalidade (MVP).
- Cancelamento pelo cliente _depois_ de aceitar: abre ticket e pode gerar taxa (opcional, depende de estratégia).
- Cancelamento pelo prestador: abre ticket quando houver indícios de abuso (ex.: aceite e não comparecimento recorrente).
- Estado “stand-by”: pagamento não é repassado até decisão operacional; coleta-se evidência (chat, localização, fotos).

A literatura sobre marketplaces ressalta fraude/golpes como preocupações comuns e cita que algumas plataformas chegam a **mediar disputas** entre consumidores e terceiros. citeturn23view0turn26view0 Isso valida seu desenho de ticket + análise interna como componente “core”, não só acessório.

## Confiança, segurança, privacidade e conformidade no Brasil

Esta seção organiza requisitos que, na prática, precisam estar no PRD porque afetam arquitetura, UX e operação.

### LGPD e governança de dados (papéis, princípios e base legal)

A LGPD define **dado pessoal** como informação relacionada a pessoa natural identificada ou identificável. citeturn2view0 Em um app com GPS/câmera, isso cobre (no mínimo) identificação do usuário, histórico de solicitações e dados de localização associados ao perfil.

A LGPD também define papéis como controlador/operador/encarregado e o que é “tratamento” (coleta, armazenamento, transmissão, etc.). citeturn2view0turn2view3 Para um marketplace como Comissionados, é comum a plataforma ser **controladora** de parte significativa dos dados (match, cobrança, prevenção a fraude, suporte), e prestadores serem controladores/autônomos de partes específicas (ex.: emissão de nota, dados para execução local) — isso precisa ser validado com jurídico.

A entity["organization","ANPD","brazil data protection authority"] publicou guia orientativo sobre agentes de tratamento (controlador, operador e encarregado), com diretrizes não vinculantes e exemplos, reforçando a importância de definir esses papéis e responsabilidades. citeturn21view0turn19view0

Para uma operação com risco de fraude e necessidade de auditoria, é comum considerar “legítimo interesse” e/ou “prevenção à fraude e segurança” dependendo do caso. A ANPD, em guia específico, explica que legítimo interesse exige análise criteriosa e fundamentada, e busca dar previsibilidade à aplicação dessa base legal. citeturn21view1turn19view1

### Marco Civil da Internet e Decreto 8.771/2016 (logs, segurança e minimização)

Como “provedor de aplicações de internet” com atividade econômica, o Ajudaê tende a cair em obrigações do Marco Civil, incluindo:

- Definição de “registros de acesso a aplicações” (data e hora de uso a partir de um IP). citeturn6view0
- Guarda de registros de acesso por **6 meses** (Art. 15), em sigilo e ambiente controlado e seguro. citeturn6view0

O Decreto 8.771/2016 detalha padrões de segurança e sigilo, listando diretrizes como controle estrito de acesso, autenticação (inclusive com exemplo de dupla autenticação), inventário de acessos e uso de criptografia ou medidas equivalentes. citeturn18view0 Ele também explicita o princípio de **reter a menor quantidade possível** de dados pessoais e excluir tão logo atingida a finalidade ou encerrado o prazo legal. citeturn18view0

Isso impacta diretamente decisões de produto, como:

- Não manter histórico de localização “raw” sem justificativa (ex.: reter somente o necessário para suporte, antifraude e obrigações legais).
- Definir política clara de retenção (ex.: tickets e logs por X meses; rota detalhada por Y dias; anonimização depois).
- Isolar “dados para execução” vs “dados para marketing/analytics” (minimização). citeturn18view0turn2view3

### Relação de consumo e deveres com cliente

O Código de Defesa do Consumidor define consumidor e fornecedor e caracteriza “serviço” como atividade fornecida no mercado mediante remuneração (com exceções específicas). citeturn13view1 Na prática, isso sugere tratar o app como parte relevante da relação de consumo (mesmo sendo intermediador) — o que reforça necessidade de:

- Termos claros (preços, cancelamento, responsabilidade).
- Suporte e mecanismo de reclamação/ticket.
- Transparência no que é “plataforma” vs “prestador”. citeturn13view1turn26view0

### Requisitos de loja e transparência de dados

Em iOS, a Apple enfatiza que o usuário precisa entender por que o app pede acesso a recursos (câmera/localização) e que as “purpose strings” devem ser claras e específicas sobre o uso. citeturn9view0

No Android, a entity["company","Google","technology company"] exige preenchimento da seção de **Data safety** no Google Play: os desenvolvedores devem declarar como coletam e tratam dados, incluir dados coletados por SDKs de terceiros, e são responsáveis por declarações completas e corretas. citeturn9view1turn9view2 Isso pressiona o desenho técnico a:

- Mapear dados por finalidade (funcionalidade, segurança, analytics).
- Inventariar SDKs (crash, analytics, push, ads) e o que coletam. citeturn9view1turn9view3

### Pagamentos, repasse e padrão de segurança

Se o app processa cartão diretamente, precisa considerar PCI DSS (escopo e compliance). O entity["organization","PCI Security Standards Council","pci standards body"] descreve o PCI DSS como baseline de requisitos técnicos e operacionais para proteger dados de conta de pagamento e indica que se aplica a entidades que armazenam, processam ou transmitem dados de cartão. citeturn15view0

Para reduzir escopo e acelerar MVP, é típico usar PSPs com split/marketplace:

- A entity["company","Stripe","payments company"] descreve o uso do Connect para fluxos complexos como “splitting a transaction between sellers/platforms/service providers”. citeturn11search0turn11search4
- O entity["company","PagBank","payments platform brazil"] promove “Split de Pagamentos” como automação de divisão entre recebedores e detalha que o split distribui valores automaticamente e pode mitigar erros manuais (além de mencionar antifraude). citeturn11search2turn11search18turn11search6
- O Mercado Pago também posiciona “Split de pagamentos” para modelos de marketplace (PSP para vendedores), embora a documentação completa possa exigir acesso específico. citeturn11search1

No Brasil, Pix é um caminho de pagamento muito relevante para MVP; o Banco Central descreve Pix como sistema de pagamento instantâneo, com transferências em segundos a qualquer hora e dia. citeturn11search7turn11search3  
(Do ponto de vista de produto, Pix é útil para reduzir atrito e custo, mas não elimina a necessidade de governança de reembolso/estorno e trilha de auditoria.)

## Arquitetura técnica e decisões de engenharia

A documentação técnica abaixo foca em um MVP “bem arquitetado” para evoluir para real-time e escala, sem supercomplexidade.

### Visão de alto nível

Clientes:

- App Cliente (Android/iOS): login, mapa, busca, solicitação, acompanhamento, pagamento, avaliação.
- App Prestador (Android/iOS): disponibilidade, recebimento de propostas, navegação/rota, chat, confirmação de etapas, ganhos.

A separação em dois aplicativos é uma decisão de produto/engenharia apoiada por exemplos do mercado (apps separados para clientes e entregadores). citeturn13view3turn14view1

Backend (camadas):

- API Gateway + Auth.
- Serviço de Catálogo/Serviços (categorias, capacidades, preços base).
- Serviço de Solicitações (criação, estados, regras).
- Serviço de Matching/Dispatch (seleção de prestadores por distância/capacidade).
- Serviço de Localização em tempo real (tracking, geofencing, histórico mínimo).
- Serviço de Pagamentos/Repasse (integração PSP + split + conciliação).
- Serviço de Tickets/Disputas (evidências, workflow interno).
- Notificações (push) e comunicação (chat/voz, se aplicável).
- Observabilidade e auditoria (logs, trilhas de decisão).

### Matching e ETA: o que precisa existir já no MVP

Mesmo que o MVP tenha “matching simples”, o problema tende a crescer rápido. A entity["company","Uber","ride-hailing platform"] (engenharia) descreve a importância de ETA e roteamento eficiente e menciona sistemas capazes de lidar com centenas de milhares de requisições de ETA por segundo, com baixa latência, porque o cálculo acontece antes do dispatch. citeturn24view0 A engenharia da Lyft descreve o dispatch como um problema de matching em tempo real com espaço de decisão massivo (milhões de decisões por segundo) e necessidade de otimização. citeturn24view1

Tradução disso para o Ajudaê (mudança/frete):

- **Capacidade importa tanto quanto distância** (veículo + itens + ajudante).
- ETA “bom o suficiente” no MVP pode ser: distância/tempo do provedor até origem + buffer de preparação.
- O matching MVP pode ser baseado em:
  - raio (ex.: 3–8 km), filtrando por categoria/veículo;
  - ranking por (distância, avaliação, taxa de cancelamento, disponibilidade);
  - envio para “top N” prestadores com janela de aceitação (ex.: 30–60s cada) até fechar.

### Dados principais e estado da solicitação

Um modelo mínimo de domínio para o MVP:

- Usuário: id, telefone, nome, rating, flags (fraude), meios de pagamento.
- Prestador: id, tipo (PF/PJ), categorias, docs verificados, veículo (tipo/capacidade), disponibilidade, rating.
- Solicitação: id, categoria, origem/destino, itens/carga, preço, status, timestamps, IDs das partes.
- Evento: log de transição de status (auditoria).
- Ticket: id, solicitação id, motivo, evidências (chat, fotos), status (aberto/em análise/decidido).

A preocupação com auditoria e inventário de acesso não é só “boa prática”: o Decreto 8.771/2016 cita inventário detalhado de acessos a registros e medidas de inviolabilidade como criptografia. citeturn18view0

### Segurança e retenção desde o início

Requisitos técnicos diretamente derivados de Marco Civil/Decreto:

- Logs de acesso: retenção e sigilo conforme obrigação (Marco Civil Art. 15). citeturn6view0
- Segurança: controle de acesso, autenticação, inventário de acessos, criptografia/medidas equivalentes (Decreto 8.771/2016). citeturn18view0
- Política de retenção: “menor quantidade possível” e exclusão quando finalidade atingida (Decreto 8.771/2016). citeturn18view0

E requisitos “de loja”:

- iOS: purpose strings claras para GPS/câmera (Apple). citeturn9view0
- Android: Data safety completo e compatível com o comportamento real e com SDKs (Google Play). citeturn9view1turn9view2

## MVP recomendado, monetização e métricas de validação

### MVP de primeira versão

Escopo sugerido para lançar com controle operacional:

- Categorias: **Mudança / Frete / Carreto** (apenas).
- Região: uma cidade/área com densidade (para garantir liquidez).
- Matching: imediato + opção de agendar (janela curta).
- Pagamento: Pix + cartão (via PSP com split), com política de repasse condicionada à conclusão.

Para “pagar depois do serviço”, há precedente explícito em marketplace de serviços no Brasil (Triider). citeturn14view1 Para “escolher veículo/carreto”, há precedente em plataforma de logística sob demanda (Lalamove). citeturn13view3turn12search20

### Estratégias de monetização coerentes com “Ajudaê”

Comissão por transação (alinhada ao nome do app):

- Plataforma retém % do valor (taxa de serviço).
- Transparência no checkout e no extrato do prestador.
- Exige bom mecanismo de disputa, porque a plataforma vira “parte forte” da experiência. citeturn26view0turn13view1

Taxa fixa por corrida/serviço + taxa por km/minuto (especialmente para frete):

- Pode reduzir complexidade inicial, mas precisa calibragem.

Modelo “pay-per-lead” (mais GetNinjas):

- Profissional paga para desbloquear oportunidades/contato, e negocia fora. O GetNinjas descreve negociação direta e definição de preço pelo profissional. citeturn13view2
- Esse modelo conflita com seu requisito de “checkout, pagamento e repasse” dentro do app e reduz controle sobre experiência e disputa.

Na prática, se o objetivo é “Uber/iFood-like” com repasse e confirmação, **comissão por transação + split** tende a ser o caminho mais consistente. citeturn11search0turn11search2turn11search18

### Métricas essenciais

Liquidez e tempo real:

- Tempo até match (p50/p90).
- Taxa de aceitação por prestador.
- Cancelamento antes/depois de aceitar.

Qualidade e confiança:

- Taxa de tickets por 100 serviços.
- Percentual de tickets resolvidos com evidência suficiente (foto/chat/localização).
- Reincidência de prestadores/usuários em disputa.

Eficiência financeira:

- Take rate (receita/GMV).
- Chargebacks/estornos (cartão) e reembolsos (Pix).
- Tempo de repasse médio.

A conexão entre fraude, necessidade de dados de reclamação e mediação de disputas é discutida em análises sobre marketplaces e proteção ao consumidor, reforçando que o “sistema de ticket” não é periférico. citeturn23view0turn26view0
