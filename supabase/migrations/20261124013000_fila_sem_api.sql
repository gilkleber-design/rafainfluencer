-- Modo fila: o chat do painel deixa de chamar a API da Anthropic.
-- na_fila_desde preenchido = pedido esperando o projeto do Claude. Só adiciona coluna; nada é removido.
alter table public.conversas add column if not exists na_fila_desde timestamptz;
create index if not exists conversas_na_fila_idx on public.conversas (na_fila_desde) where na_fila_desde is not null;
