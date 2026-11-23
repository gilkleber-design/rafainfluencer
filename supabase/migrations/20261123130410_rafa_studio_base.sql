-- Rafa Studio: esquema base (conversas, mensagens, tarefas, resultados, aprovações, eventos)
-- Fonte única de verdade entre o painel e os agentes. O navegador só lê e grava o que a RLS permite;
-- as Edge Functions usam a service role.

create extension if not exists pgcrypto;

-- Quem pode entrar no painel ---------------------------------------------------
create table public.membros (
  email text primary key,
  nome text not null,
  papel text not null default 'gestor' check (papel in ('gestor', 'criadora')),
  criado_em timestamptz not null default now()
);

create or replace function public.eh_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.meu_nome() returns text
language sql stable security definer set search_path = public as $$
  select m.nome from public.membros m
  where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- Configuração interna (ids de agentes, limites). Sem acesso pelo navegador. ----------
create table public.config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- Conversas = uma sessão do Command Center -----------------------------------------
create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Nova conversa',
  motor text not null default 'managed_agents',
  sessao_id text unique,                -- id da sessão no motor (ex.: sesn_...)
  estado text not null default 'nova'
    check (estado in ('nova', 'ativa', 'trabalhando', 'aguardando', 'pausada_orcamento', 'erro', 'encerrada')),
  cursor_evento text,                   -- último evento do motor já processado
  custo_centavos integer not null default 0,
  ultimo_erro text,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Mensagens do chat --------------------------------------------------------------
create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  autor text not null check (autor in ('humano', 'command_center', 'agente', 'sistema')),
  autor_nome text,                      -- Gil, Rafa, Command Center, Produção...
  texto text not null default '',
  anexos jsonb not null default '[]'::jsonb,   -- [{caminho, nome, tipo, tamanho}]
  estado text not null default 'ok' check (estado in ('pendente', 'enviada', 'ok', 'erro')),
  evento_id text unique,                -- id do evento no motor (idempotência)
  criado_em timestamptz not null default now()
);
create index on public.mensagens (conversa_id, criado_em);

-- Tarefas delegadas -------------------------------------------------------------
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  codigo text,                          -- código curto (T-0001)
  titulo text not null,
  agente text not null default 'Command Center',
  estado text not null default 'pendente'
    check (estado in ('pendente', 'em_execucao', 'aguardando_aprovacao', 'concluida', 'falhou', 'cancelada')),
  detalhe text,
  thread_id text,                       -- thread do subagente no motor
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index on public.tarefas (estado, atualizada_em desc);
create sequence public.tarefa_seq;
create or replace function public.tarefa_codigo() returns trigger language plpgsql as $$
begin
  if new.codigo is null then
    new.codigo := 'T-' || lpad(nextval('public.tarefa_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger tarefas_codigo before insert on public.tarefas
  for each row execute function public.tarefa_codigo();

-- Resultados (roteiros, pautas...), versionados ----------------------------------
create table public.resultados (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  tarefa_id uuid references public.tarefas(id) on delete set null,
  serie uuid not null default gen_random_uuid(),   -- mesma série = versões do mesmo entregável
  versao integer not null default 1,
  tipo text not null default 'roteiro' check (tipo in ('roteiro', 'pauta', 'pesquisa', 'relatorio', 'outro')),
  titulo text not null,
  conteudo text not null,               -- markdown
  autor text not null default 'Produção',
  criado_em timestamptz not null default now(),
  unique (serie, versao)
);
create index on public.resultados (criado_em desc);

-- Aprovações -------------------------------------------------------------------
create table public.aprovacoes (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  resultado_id uuid references public.resultados(id) on delete set null,
  pergunta text not null,
  estado text not null default 'pendente' check (estado in ('pendente', 'aprovado', 'alteracao_pedida', 'cancelada')),
  comentario text,
  decidido_por text,
  decidido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on public.aprovacoes (estado, criado_em desc);

-- Log bruto de eventos do motor (auditoria + idempotência) ---------------------------
create table public.eventos (
  evento_id text primary key,
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  tipo text not null,
  thread_id text,
  payload jsonb not null,
  processado boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.eventos (conversa_id, criado_em);

-- Chamadas de ferramenta dos agentes que o servidor precisa responder -------------------
create table public.chamadas (
  evento_id text primary key,
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  nome text not null,
  entrada jsonb not null,
  estado text not null default 'pendente' check (estado in ('pendente', 'respondida', 'erro')),
  resposta text,
  criado_em timestamptz not null default now(),
  respondida_em timestamptz
);

-- Consumo mensal (controle de orçamento) ----------------------------------------
create or replace view public.consumo_mensal with (security_invoker = true) as
  select date_trunc('month', atualizado_em) as mes, sum(custo_centavos)::int as centavos, count(*) as conversas
  from public.conversas group by 1;

-- atualizado_em automático ----------------------------------------------------
create or replace function public.toca_atualizado() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;
create trigger conversas_toca before update on public.conversas for each row execute function public.toca_atualizado();
create trigger tarefas_toca before update on public.tarefas for each row execute function public.toca_atualizado();

-- RLS -------------------------------------------------------------------------
alter table public.membros enable row level security;
alter table public.config enable row level security;
alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;
alter table public.tarefas enable row level security;
alter table public.resultados enable row level security;
alter table public.aprovacoes enable row level security;
alter table public.eventos enable row level security;
alter table public.chamadas enable row level security;

-- Leitura: só membros.
create policy membros_leem_membros on public.membros for select to authenticated using (public.eh_membro());
create policy leitura_conversas on public.conversas for select to authenticated using (public.eh_membro());
create policy leitura_mensagens on public.mensagens for select to authenticated using (public.eh_membro());
create policy leitura_tarefas on public.tarefas for select to authenticated using (public.eh_membro());
create policy leitura_resultados on public.resultados for select to authenticated using (public.eh_membro());
create policy leitura_aprovacoes on public.aprovacoes for select to authenticated using (public.eh_membro());

-- Escrita pelo navegador: só o mínimo. Mensagens e conversas novas passam pela Edge Function
-- `ponte` (que valida o usuário); o navegador só decide aprovações e renomeia conversas.
create policy decidir_aprovacao on public.aprovacoes for update to authenticated
  using (public.eh_membro() and estado = 'pendente')
  with check (public.eh_membro());
create policy renomear_conversa on public.conversas for update to authenticated
  using (public.eh_membro()) with check (public.eh_membro());

-- config, eventos e chamadas: nenhuma política = nenhum acesso fora da service role.

-- Colunas que o navegador pode alterar (o resto fica travado mesmo com a política acima).
revoke update on public.aprovacoes from authenticated;
grant update (estado, comentario, decidido_por, decidido_em) on public.aprovacoes to authenticated;
revoke update on public.conversas from authenticated;
grant update (titulo) on public.conversas to authenticated;
revoke insert, delete on public.conversas, public.mensagens, public.tarefas, public.resultados, public.aprovacoes from authenticated;
revoke all on public.config, public.eventos, public.chamadas from anon, authenticated;

-- Realtime: o painel recebe mudanças ao vivo.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.conversas, public.mensagens, public.tarefas, public.resultados, public.aprovacoes;
  end if;
end $$;

-- Storage: bucket privado para anexos e vídeos ------------------------------------
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('anexos', 'anexos', false, 52428800)
    on conflict (id) do nothing;
  end if;
end $$;
