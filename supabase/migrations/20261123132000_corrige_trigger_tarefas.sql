-- tarefas usa `atualizada_em`; o gatilho genérico gravava `atualizado_em` e quebrava atualizar_tarefa.
-- Aplicado em 23/11 13:22Z via SQL (sem DROP), por isso não aparece em schema_migrations.
create or replace function public.toca_atualizado() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'tarefas' then new.atualizada_em := now(); else new.atualizado_em := now(); end if;
  return new;
end $$;
