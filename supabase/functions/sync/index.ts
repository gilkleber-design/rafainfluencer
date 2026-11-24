/**
 * sync: chamado pelo pg_cron a cada minuto (header x-cron-segredo).
 * Busca eventos novos das conversas em andamento, responde ferramentas pendentes e atualiza custos.
 */
import { dbAdmin, segredoCron, json, segredoConfere } from "../_shared/db.ts";
import { coletarTodas } from "../_shared/conteudos.ts";
import { type Conversa, modoMotor, obterMotor, sincronizar } from "../_shared/processar.ts";

Deno.serve(async (req) => {
  const db = dbAdmin();
  if (!segredoConfere(req.headers.get("x-cron-segredo"), await segredoCron(db))) {
    return json({ erro: "acesso negado" }, 403);
  }
  // Coleta de métricas sob demanda (POST /sync?metricas=1). Não há rotina recorrente agendada.
  if (new URL(req.url).searchParams.get("metricas") === "1") return json({ ok: true, metricas: await coletarTodas(db) });

  // Modo fila: não há sessões na API para acompanhar.
  if (await modoMotor(db) === "fila") return json({ ok: true, modo: "fila" });
  const motor = await obterMotor(db);

  const { data: pendentes } = await db.from("chamadas").select("conversa_id").eq("estado", "pendente");
  const ids = new Set((pendentes ?? []).map((p) => p.conversa_id));
  const { data: conversas } = await db.from("conversas")
    .select("id, sessao_id, estado, cursor_evento, titulo")
    .or(`estado.eq.trabalhando${ids.size ? `,id.in.(${[...ids].join(",")})` : ""}`)
    .not("sessao_id", "is", null)
    .limit(20);

  const resultado: Record<string, string> = {};
  for (const c of conversas ?? []) {
    try {
      resultado[c.id] = await sincronizar(db, motor, c as Conversa);
      const custo = await motor.custoCentavos(c.sessao_id!).catch(() => null);
      if (custo !== null) await db.from("conversas").update({ custo_centavos: custo }).eq("id", c.id);
    } catch (e) {
      resultado[c.id] = `erro: ${(e as Error).message}`;
    }
  }
  return json({ ok: true, conversas: resultado });
});
