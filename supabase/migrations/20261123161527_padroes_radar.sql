-- Biblioteca de padrões do Radar Beauty: todo roteiro/pauta de Reel parte de um padrão com evidência.
create table if not exists public.padroes (
  id text primary key,
  nome text not null,
  reel_origem text not null,
  perfil text not null,
  razao_vs_mediana numeric not null,
  razao_comentarios numeric,
  categoria_produto text,
  tipo_gancho text,
  estrutura text,
  texto_fixo_resumo text,
  tem_fala boolean,
  n_cortes int,
  duracao_s numeric,
  evidencia text,
  formato_rafa int,
  mecanismo text,
  nao_copiar text,
  coletado_em date not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.reels_referencia (
  url text primary key,
  criadora text not null,
  seguidores int,
  data date,
  idade_dias int,
  curtidas int,
  comentarios int,
  x_mediana_curtidas numeric,
  x_mediana_comentarios numeric,
  sinais text[] not null default '{}',
  legenda text,
  padrao_id text references public.padroes(id),
  coletado_em date not null
);

alter table public.resultados add column if not exists padrao_id text references public.padroes(id);
alter table public.conteudos add column if not exists padrao_id text references public.padroes(id);

alter table public.padroes enable row level security;
alter table public.reels_referencia enable row level security;
do $$ begin
  create policy leitura_padroes on public.padroes for select to authenticated using (public.eh_membro());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy leitura_reels_referencia on public.reels_referencia for select to authenticated using (public.eh_membro());
exception when duplicate_object then null; end $$;

-- O padrão do resultado passa para o cartão do conteúdo.
create or replace function public.resultado_para_conteudo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.conteudos (serie, titulo, tipo, etapa, classe, padrao_id)
  values (new.serie, new.titulo, new.tipo,
          case when new.tipo = 'pauta' then 'ideia' else 'roteiro' end,
          case when new.tipo = 'roteiro' then 'peca' else 'documento' end,
          new.padrao_id)
  on conflict (serie) do update set titulo = excluded.titulo,
    padrao_id = coalesce(excluded.padrao_id, public.conteudos.padrao_id);
  return new;
end $$;
