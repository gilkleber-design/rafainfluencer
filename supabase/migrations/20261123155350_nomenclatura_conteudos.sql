-- Nomenclatura padrão: peças ganham código EP### sequencial (o painel monta "EP### · Formato · Tema");
-- testes aparecem como "TESTE · Tema"; documentos como "Tipo · Assunto · dd/mm".
alter table public.conteudos add column if not exists codigo text unique;
create sequence if not exists public.conteudos_ep_seq;

-- O título guardado é só "Formato · Tema" (ou o assunto): tira código, tipo e data que vierem no texto.
create or replace function public.normaliza_conteudo() returns trigger
language plpgsql set search_path = public as $$
begin
  new.titulo := regexp_replace(new.titulo, '^\s*(EP\s?\d{1,4}|TESTE|Pauta|Pesquisa|Relatório|Roteiro|Documento)\s*[·:—-]\s*', '', 'i');
  new.titulo := regexp_replace(new.titulo, '\s*·\s*\d{2}/\d{2}\s*$', '');
  -- insert que vai virar update (nova versão de uma série existente) não gasta número
  if tg_op = 'INSERT' and exists (select 1 from public.conteudos c where c.serie = new.serie) then return new; end if;
  if new.classe = 'peca' and new.codigo is null and not ('teste' = any(new.etiquetas)) then
    new.codigo := 'EP' || lpad(nextval('public.conteudos_ep_seq')::text, 3, '0');
  end if;
  return new;
end $$;
create or replace trigger conteudos_normaliza before insert or update of titulo, classe, etiquetas on public.conteudos
  for each row execute function public.normaliza_conteudo();
