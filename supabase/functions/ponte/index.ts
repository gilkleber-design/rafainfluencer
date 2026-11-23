/**
 * ponte: única porta do painel para os agentes.
 *  POST { acao: "mensagem", conversa_id?, texto, anexos? }  -> grava a mensagem e envia ao Command Center
 *  POST { acao: "decisao", aprovacao_id, estado: "aprovado"|"alteracao_pedida", comentario? }
 * Responde na hora; o acompanhamento dos eventos continua em segundo plano (EdgeRuntime.waitUntil)
 * e o cron `sync` cobre o que sobrar.
 */
import { cors, dbAdmin, json, lerConfig, membroDaRequisicao, segredoConfere, segredoCron } from "../_shared/db.ts";
import { acompanhar, gastoDoMes, type Limites, LIMITES_PADRAO, obterMotor } from "../_shared/processar.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const db = dbAdmin();
  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "JSON inválido" }, 400);
  }

  // Teste técnico pelo servidor (pg_net/cron): mesmo caminho do painel, autenticado pelo segredo do cron.
  const viaServidor = segredoConfere(req.headers.get("x-cron-segredo"), await segredoCron(db));
  const membro = viaServidor
    ? { email: "teste@servidor", nome: String(corpo.como ?? "Teste técnico").slice(0, 40) }
    : await membroDaRequisicao(db, req);
  if (!membro) return json({ erro: "acesso negado" }, 403);

  const limites = { ...LIMITES_PADRAO, ...(await lerConfig<Partial<Limites>>(db, "limites") ?? {}) };
  const gasto = await gastoDoMes(db);
  if (gasto >= limites.mensal_centavos) {
    return json({
      erro: `Orçamento do mês atingido (US$ ${(gasto / 100).toFixed(2)} de US$ ${(limites.mensal_centavos / 100).toFixed(2)}). Novas mensagens estão bloqueadas até o Gil aprovar um limite maior.`,
    }, 402);
  }

  const motor = await obterMotor(db);
  let conversaId = corpo.conversa_id ? String(corpo.conversa_id) : null;
  let texto: string;

  if (corpo.acao === "decisao") {
    const estado = String(corpo.estado);
    if (!["aprovado", "alteracao_pedida"].includes(estado)) return json({ erro: "estado inválido" }, 400);
    const comentario = corpo.comentario ? String(corpo.comentario).slice(0, 4000) : null;
    if (estado === "alteracao_pedida" && !comentario) return json({ erro: "descreva a alteração" }, 400);
    const { data: ap, error } = await db.from("aprovacoes")
      .update({ estado, comentario, decidido_por: membro.nome, decidido_em: new Date().toISOString() })
      .eq("id", String(corpo.aprovacao_id)).eq("estado", "pendente")
      .select("id, conversa_id, resultado_id, pergunta").single();
    if (error || !ap) return json({ erro: "aprovação não encontrada ou já decidida" }, 404);
    conversaId = ap.conversa_id;
    texto = estado === "aprovado"
      ? `[Aprovação ${ap.id}] aprovado por ${membro.nome}. Resultado ${ap.resultado_id}.`
      : `[Aprovação ${ap.id}] alteração pedida por ${membro.nome} para o resultado ${ap.resultado_id}: ${comentario}`;
    await db.from("mensagens").insert({
      conversa_id: conversaId, autor: "humano", autor_nome: membro.nome,
      texto: estado === "aprovado" ? "Aprovado." : `Alteração pedida: ${comentario}`, estado: "enviada",
    });
  } else {
    texto = String(corpo.texto ?? "").trim().slice(0, 20000);
    const anexos = Array.isArray(corpo.anexos) ? corpo.anexos.slice(0, 10) : [];
    if (!texto && !anexos.length) return json({ erro: "mensagem vazia" }, 400);

    if (!conversaId) {
      const { data: nova, error } = await db.from("conversas")
        .insert({ titulo: texto.slice(0, 60) || "Nova conversa", criado_por: membro.nome }).select("id").single();
      if (error) return json({ erro: error.message }, 500);
      conversaId = nova.id;
    }
    await db.from("mensagens").insert({
      conversa_id: conversaId, autor: "humano", autor_nome: membro.nome, texto, anexos, estado: "enviada",
    });
    if (anexos.length) {
      const lista = anexos.map((a: Record<string, unknown>) => `- ${a.nome} (${a.tipo}, ${a.tamanho} bytes, Storage: anexos/${a.caminho})`).join("\n");
      texto += `\n\nAnexos enviados pelo painel (ficam no Storage do Rafa Studio; a análise de arquivo pelo agente entra na próxima fase):\n${lista}`;
    }
  }

  const { data: conv } = await db.from("conversas").select("id, sessao_id, titulo, estado").eq("id", conversaId!).single();
  if (!conv) return json({ erro: "conversa não encontrada" }, 404);
  if (conv.estado === "pausada_orcamento") return json({ erro: "conversa pausada pelo teto de gasto; abra uma nova" }, 402);

  try {
    let sessao = conv.sessao_id as string | null;
    if (!sessao) {
      sessao = await motor.criarSessao({ titulo: `Rafa Studio: ${conv.titulo}`, orcamentoCentavos: limites.sessao_centavos });
      await db.from("conversas").update({ sessao_id: sessao, estado: "ativa" }).eq("id", conv.id);
    }
    await motor.enviarMensagem(sessao, `${membro.nome} escreveu:\n${texto}`);
    await db.from("conversas").update({ estado: "trabalhando", ultimo_erro: null }).eq("id", conv.id);
  } catch (err) {
    const msg = (err as Error).message.slice(0, 500);
    await db.from("conversas").update({ estado: "erro", ultimo_erro: msg }).eq("id", conv.id);
    return json({ erro: `falha ao falar com o Command Center: ${msg}`, conversa_id: conv.id }, 502);
  }

  EdgeRuntime.waitUntil(acompanhar(db, motor, conv.id).catch((e) => console.error("acompanhar", e)));
  return json({ ok: true, conversa_id: conv.id });
});
