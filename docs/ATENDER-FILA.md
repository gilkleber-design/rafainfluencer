# Atender a fila do Rafa Studio (modo sem API)

Com `config.motor_modo = 'fila'`, o painel não chama a API da Anthropic. Cada mensagem ou pedido de alteração da Rafa
marca a conversa com `conversas.na_fila_desde` e mostra "Na fila". Quem atende é o projeto do Claude (assinatura do Gil).

## Ciclo

1. A Rafa abre um pedido no chat ("roteiro sobre rímel"). A conversa entra na fila.
2. O projeto lê a fila, cria a tarefa, escreve o roteiro v1 (seguindo as regras dos agentes em `supabase/functions/_shared/agentes.ts`
   e a Regra do Radar: roteiro só com `padrao_id` ≥ 2x a mediana), entrega e abre a aprovação.
3. Na aba Aprovações a Rafa aprova ou pede alteração. Pedir alteração devolve a conversa para a fila.
4. O projeto lê o comentário, entrega a v2 com `substitui_resultado_id` e abre nova aprovação. Repete até aprovar.
   Aprovado: a peça segue o fluxo normal do quadro.

## 1. Ler a fila (Supabase MCP, projeto uehzffxfxljiskfczhwk)

```sql
select c.id, c.titulo, c.na_fila_desde,
  (select json_agg(json_build_object('autor', m.autor_nome, 'texto', m.texto, 'quando', m.criado_em) order by m.criado_em)
     from mensagens m where m.conversa_id = c.id) as mensagens
from conversas c where c.na_fila_desde is not null order by c.na_fila_desde;
```

Padrões do Radar disponíveis: `select id, nome, perfil, razao_vs_mediana, formato_rafa, mecanismo, nao_copiar from padroes where ativo and razao_vs_mediana >= 2 order by razao_vs_mediana desc;`

## 2. Responder (mesmas ferramentas dos agentes, pela ponte)

```sql
select net.http_post(
  url := 'https://uehzffxfxljiskfczhwk.supabase.co/functions/v1/ponte',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-segredo',(select valor #>> '{}' from config where chave='cron_segredo')),
  body := jsonb_build_object(
    'acao','fila_responder', 'conversa_id','<id>', 'concluir', true,
    'mensagem','Roteiro v1 pronto para aprovação.',
    'ferramentas', jsonb_build_array(
      jsonb_build_object('nome','registrar_tarefa','entrada',jsonb_build_object('titulo','Roteiro: rímel','agente','Produção'))
    )
  ));
-- resposta: select status_code, content from net._http_response order by id desc limit 1;
```

Ferramentas: `registrar_tarefa`, `atualizar_tarefa`, `entregar_resultado` (tipo, titulo, conteudo, padrao_id,
codigo_tarefa, substitui_resultado_id), `pedir_aprovacao` (resultado_id, pergunta), `ler_resultado`, `consultar_padroes`.
Como `pedir_aprovacao` precisa do `resultado_id`, faça em duas chamadas: entregar (sem concluir), depois aprovar com `concluir: true`.

## Ligar e desligar

- Ligar a fila: `insert into config (chave, valor) values ('motor_modo', '"fila"') on conflict (chave) do update set valor = excluded.valor;`
- Voltar à API: `delete from config where chave = 'motor_modo';`
- Com a fila ligada, o cron `sync` responde na hora sem chamar a API. A chave da Anthropic pode ser apagada no console.
