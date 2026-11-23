-- Ciclo de vida dos conteúdos: etapas, lixeira (arquivar), versões manuais e métricas.
-- Nada é apagado: "excluir" no painel só arquiva e pode ser restaurado.

-- Ideias e versões manuais podem existir sem conversa com o agente.
alter table public.resultados alter column conversa_id drop not null;

-- Um conteúdo = uma série de versões em `resultados`.
create table if not exists public.conteudos (
  serie uuid primary key,
  id uuid not null default gen_random_uuid() unique,  -- chave usada pelo painel (tempo real)
  titulo text not null,
  tipo text not null default 'roteiro',
  etapa text not null default 'roteiro'
    check (etapa in ('ideia', 'roteiro', 'aprovado', 'em_producao', 'gravado', 'editado', 'publicado')),
  ordem double precision not null default extract(epoch from now()),
  arquivado_em timestamptz,
  arquivado_por text,
  url_publicacao text,
  publicado_em timestamptz,
  perfil_instagram text,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists conteudos_etapa on public.conteudos (etapa, ordem desc);

-- Histórico de etapas (quem moveu, quando).
create table if not exists public.conteudo_historico (
  id uuid primary key default gen_random_uuid(),
  serie uuid not null references public.conteudos(serie) on delete cascade,
  de text,
  para text not null,
  por text,
  criado_em timestamptz not null default now()
);
create index if not exists conteudo_historico_serie on public.conteudo_historico (serie, criado_em desc);

-- Métricas coletadas de um conteúdo publicado (uma linha por coleta).
create table if not exists public.metricas (
  id uuid primary key default gen_random_uuid(),
  serie uuid not null references public.conteudos(serie) on delete cascade,
  coletado_em timestamptz not null default now(),
  curtidas integer,
  comentarios integer,
  visualizacoes integer,
  alcance integer,
  salvamentos integer,
  compartilhamentos integer,
  fonte text not null default 'business_discovery',
  bruto jsonb
);
create index if not exists metricas_serie on public.metricas (serie, coletado_em);

create or replace function public.toca_conteudo() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;
create or replace trigger conteudos_toca before update on public.conteudos for each row execute function public.toca_conteudo();

-- Toda série nova em `resultados` vira um conteúdo (etapa inicial conforme o tipo).
create or replace function public.resultado_para_conteudo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.conteudos (serie, titulo, tipo, etapa)
  values (new.serie, new.titulo, new.tipo, case when new.tipo = 'pauta' then 'ideia' else 'roteiro' end)
  on conflict (serie) do update set titulo = excluded.titulo;
  return new;
end $$;
create or replace trigger resultados_conteudo after insert on public.resultados for each row execute function public.resultado_para_conteudo();

-- Aprovar no painel leva o conteúdo para "Aprovado" (se ainda estava antes disso).
create or replace function public.aprovacao_para_etapa() returns trigger
language plpgsql security definer set search_path = public as $$
declare s uuid; e text;
begin
  if new.estado = 'aprovado' and old.estado is distinct from 'aprovado' and new.resultado_id is not null then
    select serie into s from public.resultados where id = new.resultado_id;
    select etapa into e from public.conteudos where serie = s;
    if e in ('ideia', 'roteiro') then
      update public.conteudos set etapa = 'aprovado' where serie = s;
      insert into public.conteudo_historico (serie, de, para, por) values (s, e, 'aprovado', new.decidido_por);
    end if;
  end if;
  return new;
end $$;
create or replace trigger aprovacoes_etapa after update on public.aprovacoes for each row execute function public.aprovacao_para_etapa();

-- Conteúdos que já existem.
insert into public.conteudos (serie, titulo, tipo, etapa, criado_em)
select distinct on (r.serie) r.serie, r.titulo, r.tipo,
  case when exists (select 1 from public.aprovacoes a join public.resultados r2 on r2.id = a.resultado_id
                    where r2.serie = r.serie and a.estado = 'aprovado') then 'aprovado'
       when r.tipo = 'pauta' then 'ideia' else 'roteiro' end,
  r.criado_em
from public.resultados r
order by r.serie, r.versao desc
on conflict (serie) do nothing;

-- Acesso: membros leem tudo; escrevem só pela função `ponte` (service role).
alter table public.conteudos enable row level security;
alter table public.conteudo_historico enable row level security;
alter table public.metricas enable row level security;
create policy leitura_conteudos on public.conteudos for select to authenticated using (public.eh_membro());
create policy leitura_conteudo_historico on public.conteudo_historico for select to authenticated using (public.eh_membro());
create policy leitura_metricas on public.metricas for select to authenticated using (public.eh_membro());
revoke insert, update, delete on public.conteudos, public.conteudo_historico, public.metricas from anon, authenticated;
revoke all on public.conteudos, public.conteudo_historico, public.metricas from anon;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.conteudos; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.metricas; exception when duplicate_object then null; end;
  end if;
end $$;
