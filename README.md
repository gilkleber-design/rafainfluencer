# Rafa Studio

Painel privado da operação Rafa Influencer. O Gil e a Rafa conversam com o **Command Center** (Claude Managed Agents), que delega ao agente de **Produção**; tarefas, roteiros e aprovações aparecem no painel em tempo real.

## Arquitetura

```
navegador (Next.js) ──▶ Supabase rafa-studio ──▶ Managed Agents (Command Center + Produção)
        ▲   Realtime        │  Edge Functions: ponte, sync, setup       │
        └───────────────────┴───────── eventos e ferramentas ◀──────────┘
```

- `web/`: painel Next.js (chat, tarefas, resultados com versões, aprovações).
- `supabase/migrations/`: tabelas, RLS, Storage `anexos`, cron do `sync`.
- `supabase/functions/ponte`: única porta do painel para os agentes (mensagem e decisão de aprovação).
- `supabase/functions/sync`: cron de 1 min; busca eventos, responde ferramentas pendentes, atualiza custo.
- `supabase/functions/setup`: cria/atualiza ambiente e agentes no Managed Agents e guarda os ids em `config`.
- `supabase/functions/_shared/motor.ts`: **única camada que conhece o Managed Agents**. Para trocar de motor, implemente a interface `Motor` aqui.

O IA com Prosa não é alterado. A função `pesquisa` é só chamada por HTTP (leitura), com o token guardado como secret no servidor.

## Limites de gasto (em código, não só alertas)

| Limite | Padrão | Onde |
| --- | --- | --- |
| Teto por conversa | US$ 3,00 | `budget` da sessão no Managed Agents: a sessão pausa ao atingir |
| Teto mensal | US$ 45,00 | `ponte` recusa novas mensagens quando a soma do mês atinge |
| Workflows de muitos agentes | desligados | definição do Command Center |

Para mudar: `insert into config (chave, valor) values ('limites', '{"mensal_centavos": 4500, "sessao_centavos": 300}') on conflict (chave) do update set valor = excluded.valor;`

## Instalação

1. Secrets das Edge Functions: `ANTHROPIC_API_KEY`, `CRON_SEGREDO` (texto aleatório longo), `PESQUISA_URL` e `PESQUISA_TOKEN` (opcionais, para `consultar_instagram`).
2. Aplicar as migrações e publicar as funções (`supabase db push` e `supabase functions deploy`, ou a integração GitHub do Supabase).
3. Vault: `select vault.create_secret('https://uehzffxfxljiskfczhwk.supabase.co', 'rafa_url_projeto'); select vault.create_secret('<CRON_SEGREDO>', 'rafa_cron_segredo');`
4. Membros: `insert into membros (email, nome, papel) values ('<email do Gil>', 'Gil', 'gestor'), ('<email da Rafa>', 'Rafa', 'criadora');`
5. Rodar o setup uma vez: `POST /functions/v1/setup` com header `x-cron-segredo`.
6. Painel: `cd web && cp .env.example .env.local` (preencher a chave pública) e `npm install && npm run dev`.

## Testes

- `deno test -A supabase/functions/_testes/` simula o fluxo pedido → roteiro v1 → alteração → v2 com motor falso.
- As migrações foram testadas em Postgres 16 local com RLS (não membro não vê nada; navegador não grava em mensagens, config nem conversas).
