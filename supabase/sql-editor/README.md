# SQL Editor Workflow

Use este diretÃ³rio se for aplicar o schema manualmente pelo SQL Editor do Supabase.

## Ordem

1. Rode `010_apply_initial_schema.sql`.
2. Se a execuÃ§Ã£o terminar sem erro, rode `020_verify_initial_schema.sql`.
3. Confirme no resultado que:
   - as 9 tabelas existem;
   - os 5 enums existem;
   - os Ã­ndices principais foram criados;
   - as categorias `Frete`, `MudanÃ§a` e `Carreto` foram inseridas.

## ObservaÃ§Ãµes

- `request_events.actor_id` aceita `NULL` apenas para transiÃ§Ãµes automÃ¡ticas do sistema, como `expired`.
- Este pacote cobre somente o schema base do CTO-04.
- RLS, helpers SQL e policies entram no CTO-06.
- Pagamentos nÃ£o entram aqui. Stripe / Link exige migration nova depois.
