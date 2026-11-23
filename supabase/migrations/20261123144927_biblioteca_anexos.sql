-- Quadro só com peças de conteúdo; pautas, relatórios e pesquisas vão para a Biblioteca.
alter table public.conteudos add column if not exists classe text not null default 'peca';
alter table public.conteudos add column if not exists etiquetas text[] not null default '{}';
alter table public.conteudos add column if not exists anexo_de uuid references public.conteudos(serie) on delete set null;
do $$ begin
  alter table public.conteudos add constraint conteudos_classe_check check (classe in ('peca', 'documento'));
exception when duplicate_object then null; end $$;
create index if not exists conteudos_anexo_de_idx on public.conteudos (anexo_de);

-- Classificação automática: roteiro vira peça no quadro; o resto vai para a Biblioteca.
create or replace function public.resultado_para_conteudo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.conteudos (serie, titulo, tipo, etapa, classe)
  values (new.serie, new.titulo, new.tipo,
          case when new.tipo = 'pauta' then 'ideia' else 'roteiro' end,
          case when new.tipo = 'roteiro' then 'peca' else 'documento' end)
  on conflict (serie) do update set titulo = excluded.titulo;
  return new;
end $$;

update public.conteudos set classe = 'documento' where tipo <> 'roteiro' and classe = 'peca'
  and not exists (select 1 from public.conteudo_historico h where h.serie = conteudos.serie and h.de is null);
