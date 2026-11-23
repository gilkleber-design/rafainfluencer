-- Storage: membros enviam e leem anexos no bucket privado `anexos`.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute $p$create policy anexos_membros_leem on storage.objects for select to authenticated
      using (bucket_id = 'anexos' and public.eh_membro())$p$;
    execute $p$create policy anexos_membros_enviam on storage.objects for insert to authenticated
      with check (bucket_id = 'anexos' and public.eh_membro())$p$;
  end if;
end $$;

-- Cron: a cada minuto chama a Edge Function `sync`, que busca eventos novos do motor,
-- responde ferramentas pendentes e atualiza estados. Garante a volta mesmo se o
-- processamento imediato da `ponte` for interrompido.
-- Requer os segredos no Vault: rafa_url_projeto (https://<ref>.supabase.co) e rafa_cron_segredo.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.disparar_sync() returns void
language plpgsql security definer set search_path = public as $$
declare
  url text := (select decrypted_secret from vault.decrypted_secrets where name = 'rafa_url_projeto');
  seg text := (select decrypted_secret from vault.decrypted_secrets where name = 'rafa_cron_segredo');
begin
  if url is null or seg is null then return; end if;
  -- Só chama quando há conversa em andamento ou ferramenta pendente (evita custo à toa).
  if not exists (select 1 from public.conversas where estado in ('trabalhando'))
     and not exists (select 1 from public.chamadas where estado = 'pendente') then
    return;
  end if;
  perform net.http_post(
    url := url || '/functions/v1/sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-segredo', seg),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
end $$;
revoke all on function public.disparar_sync() from public, anon, authenticated;

select cron.schedule('rafa-studio-sync', '* * * * *', $$select public.disparar_sync()$$);
