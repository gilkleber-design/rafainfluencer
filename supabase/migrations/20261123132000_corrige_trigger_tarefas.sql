-- tarefas usa `atualizada_em`; o gatilho genérico gravava `atualizado_em` e quebrava atualizar_tarefa.
create or replace function public.toca_atualizada() returns trigger language plpgsql as $$
begin new.atualizada_em := now(); return new; end $$;
drop trigger if exists tarefas_toca on public.tarefas;
create trigger tarefas_toca before update on public.tarefas for each row execute function public.toca_atualizada();
