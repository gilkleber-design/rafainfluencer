-- Saldo estimado na Anthropic. A API não informa o saldo de créditos, então o gestor
-- informa o saldo que vê no Console e o painel desconta o custo real das conversas
-- (custo_centavos, vindo do list_cost das sessões) gasto depois desse momento.
create table if not exists public.credito_anthropic (
  id uuid primary key default gen_random_uuid(),
  saldo_centavos integer not null check (saldo_centavos >= 0),
  base_gasto_centavos integer not null,   -- soma de conversas.custo_centavos no momento do registro
  informado_em timestamptz not null default now(),
  informado_por text
);
alter table public.credito_anthropic enable row level security;
create policy leitura_credito on public.credito_anthropic for select to authenticated using (public.eh_membro());

create or replace function public.eh_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', '')) and m.papel = 'gestor'
  );
$$;

-- Registra o saldo atual (em dólares) informado pelo gestor.
create or replace function public.informar_saldo_anthropic(valor_usd numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_gestor() then raise exception 'apenas o gestor pode informar o saldo'; end if;
  if valor_usd is null or valor_usd < 0 or valor_usd > 100000 then raise exception 'valor inválido'; end if;
  insert into public.credito_anthropic (saldo_centavos, base_gasto_centavos, informado_por)
  values (round(valor_usd * 100)::int, (select coalesce(sum(custo_centavos), 0) from public.conversas), public.meu_nome());
end;
$$;
revoke all on function public.informar_saldo_anthropic(numeric) from public, anon;
grant execute on function public.informar_saldo_anthropic(numeric) to authenticated;

-- Saldo estimado, gasto desde o registro e gasto do mês (mesma conta do teto mensal).
create or replace function public.saldo_anthropic() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  c public.credito_anthropic;
  total int;
  mes int;
begin
  if not public.eh_membro() then raise exception 'acesso negado'; end if;
  select * into c from public.credito_anthropic order by informado_em desc limit 1;
  select coalesce(sum(custo_centavos), 0) into total from public.conversas;
  select coalesce(sum(custo_centavos), 0) into mes from public.conversas
    where atualizado_em >= date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  return json_build_object(
    'informado', c.id is not null,
    'saldo_informado_centavos', c.saldo_centavos,
    'informado_em', c.informado_em,
    'gasto_desde_centavos', case when c.id is null then null else greatest(total - c.base_gasto_centavos, 0) end,
    'saldo_estimado_centavos', case when c.id is null then null else c.saldo_centavos - greatest(total - c.base_gasto_centavos, 0) end,
    'gasto_mes_centavos', mes
  );
end;
$$;
revoke all on function public.saldo_anthropic() from public, anon;
grant execute on function public.saldo_anthropic() to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.credito_anthropic; exception when duplicate_object then null; end;
  end if;
end $$;
