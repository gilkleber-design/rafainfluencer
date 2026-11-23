/**
 * Traduz eventos do motor em linhas do banco (mensagens, tarefas, resultados, aprovações)
 * e responde as ferramentas que os agentes chamam. Idempotente: cada evento é gravado uma
 * única vez em `eventos`, então reprocessar é seguro.
 */
import type { Db } from "./db.ts";
import { lerConfig } from "./db.ts";
import type { EventoMotor, IdsMotor, Motor } from "./motor.ts";
import { motorManagedAgents } from "./motor.ts";

export interface Conversa {
  id: string;
  sessao_id: string | null;
  estado: string;
  cursor_evento: string | null;
  titulo: string;
}

export async function obterMotor(db: Db): Promise<Motor> {
  const ids = await lerConfig<IdsMotor>(db, "motor_ids");
  if (!ids) throw new Error("Agentes ainda não configurados: rode a função setup.");
  return motorManagedAgents(ids);
}

function textoDe(conteudo: unknown): string {
  if (!Array.isArray(conteudo)) return "";
  return conteudo
    .map((b: Record<string, unknown>) => (b?.type === "text" ? String(b.text ?? "") : ""))
    .filter(Boolean)
    .join("\n");
}

const NOMES_THREAD = new Map<string, string>();

// ---------------------------------------------------------------- ferramentas
async function executarFerramenta(db: Db, conversaId: string, nome: string, e: Record<string, unknown>, autor: string): Promise<string> {
  switch (nome) {
    case "registrar_tarefa": {
      const { data, error } = await db.from("tarefas").insert({
        conversa_id: conversaId,
        titulo: String(e.titulo ?? "Tarefa"),
        agente: String(e.agente ?? "Command Center"),
        detalhe: e.detalhe ? String(e.detalhe) : null,
        estado: "em_execucao",
      }).select("codigo").single();
      if (error) throw error;
      return JSON.stringify({ codigo: data.codigo });
    }
    case "atualizar_tarefa": {
      const patch: Record<string, unknown> = { estado: String(e.estado) };
      if (e.detalhe) patch.detalhe = String(e.detalhe);
      const { data, error } = await db.from("tarefas").update(patch).eq("codigo", String(e.codigo)).select("codigo, estado");
      if (error) throw error;
      if (!data?.length) return JSON.stringify({ erro: `tarefa ${e.codigo} não encontrada` });
      return JSON.stringify(data[0]);
    }
    case "entregar_resultado": {
      let serie: string | undefined;
      let versao = 1;
      let tarefaId: string | null = null;
      if (e.substitui_resultado_id) {
        const { data: ant } = await db.from("resultados").select("serie, tarefa_id")
          .eq("id", String(e.substitui_resultado_id)).maybeSingle();
        if (ant) {
          serie = ant.serie;
          tarefaId = ant.tarefa_id;
          const { data: ult } = await db.from("resultados").select("versao").eq("serie", ant.serie)
            .order("versao", { ascending: false }).limit(1).single();
          versao = (ult?.versao ?? 0) + 1;
        }
      }
      if (e.codigo_tarefa) {
        const { data: t } = await db.from("tarefas").select("id").eq("codigo", String(e.codigo_tarefa)).maybeSingle();
        if (t) tarefaId = t.id;
      }
      const linha: Record<string, unknown> = {
        conversa_id: conversaId,
        tarefa_id: tarefaId,
        versao,
        tipo: String(e.tipo ?? "outro"),
        titulo: String(e.titulo ?? "Resultado"),
        conteudo: String(e.conteudo ?? ""),
        autor,
      };
      if (serie) linha.serie = serie;
      const { data, error } = await db.from("resultados").insert(linha).select("id, versao").single();
      if (error) throw error;
      return JSON.stringify({ resultado_id: data.id, versao: data.versao });
    }
    case "pedir_aprovacao": {
      const { data, error } = await db.from("aprovacoes").insert({
        conversa_id: conversaId,
        resultado_id: String(e.resultado_id),
        pergunta: String(e.pergunta ?? "Aprovar?"),
      }).select("id").single();
      if (error) throw error;
      return JSON.stringify({ aprovacao_id: data.id, estado: "pendente" });
    }
    case "consultar_instagram": {
      const url = Deno.env.get("PESQUISA_URL");
      const token = Deno.env.get("PESQUISA_TOKEN");
      if (!url || !token) return JSON.stringify({ erro: "consulta ao Instagram ainda não configurada" });
      const perfil = String(e.perfil ?? "").replace(/^@/, "").trim();
      if (!/^[A-Za-z0-9._]{1,30}$/.test(perfil)) return JSON.stringify({ erro: "perfil inválido" });
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pub-token": token },
        body: JSON.stringify({ acao: "descobrir", usuario: perfil, limite: 25 }),
      });
      const corpo = await r.text();
      return JSON.stringify({ http_status: r.status, dados: corpo.slice(0, 20000) });
    }
    default:
      return JSON.stringify({ erro: `ferramenta desconhecida: ${nome}` });
  }
}

// ---------------------------------------------------------------- eventos
async function aplicarEvento(db: Db, motor: Motor, conv: Conversa, ev: EventoMotor) {
  const b = ev.bruto;
  switch (ev.tipo) {
    case "agent.message": {
      if (ev.threadId) break; // mensagens internas dos subagentes ficam no log
      const texto = textoDe(b.content);
      if (texto) {
        await db.from("mensagens").upsert({
          conversa_id: conv.id, autor: "command_center", autor_nome: "Command Center", texto, evento_id: ev.id,
        }, { onConflict: "evento_id", ignoreDuplicates: true });
      }
      break;
    }
    case "session.thread_created": {
      if (b.session_thread_id && b.agent_name) NOMES_THREAD.set(String(b.session_thread_id), String(b.agent_name));
      break;
    }
    case "agent.thread_message_sent": {
      await db.from("mensagens").upsert({
        conversa_id: conv.id, autor: "sistema", autor_nome: "Command Center",
        texto: `Delegado a ${b.to_agent_name ?? "agente"}.`, evento_id: ev.id,
      }, { onConflict: "evento_id", ignoreDuplicates: true });
      break;
    }
    case "agent.thread_message_received": {
      const texto = textoDe(b.content);
      await db.from("mensagens").upsert({
        conversa_id: conv.id, autor: "agente", autor_nome: String(b.from_agent_name ?? "Agente"),
        texto: texto || "(resposta recebida)", evento_id: ev.id,
      }, { onConflict: "evento_id", ignoreDuplicates: true });
      break;
    }
    case "agent.custom_tool_use": {
      const autor = ev.threadId ? (NOMES_THREAD.get(ev.threadId) ?? "Produção") : "Command Center";
      const { data: ja } = await db.from("chamadas").select("estado").eq("evento_id", ev.id).maybeSingle();
      if (ja?.estado === "respondida") break;
      if (!ja) {
        await db.from("chamadas").insert({ evento_id: ev.id, conversa_id: conv.id, nome: String(b.name), entrada: b.input ?? {} });
      }
      let resposta: string;
      let erro = false;
      try {
        resposta = await executarFerramenta(db, conv.id, String(b.name), (b.input ?? {}) as Record<string, unknown>, autor);
      } catch (err) {
        resposta = `erro: ${(err as Error).message}`;
        erro = true;
      }
      await motor.responderFerramenta(conv.sessao_id!, ev.id, resposta, erro);
      await db.from("chamadas").update({ estado: erro ? "erro" : "respondida", resposta, respondida_em: new Date().toISOString() })
        .eq("evento_id", ev.id);
      break;
    }
    case "session.status_running":
      await db.from("conversas").update({ estado: "trabalhando" }).eq("id", conv.id);
      conv.estado = "trabalhando";
      break;
    case "session.status_idle": {
      const motivo = (b.stop_reason as { type?: string } | undefined)?.type;
      const estado = motivo === "requires_action" ? "trabalhando"
        : motivo === "budget_reached" ? "pausada_orcamento"
        : motivo === "retries_exhausted" ? "erro"
        : "aguardando";
      await db.from("conversas").update({ estado }).eq("id", conv.id);
      conv.estado = estado;
      if (motivo === "budget_reached") {
        await db.from("mensagens").upsert({
          conversa_id: conv.id, autor: "sistema", autor_nome: "Sistema", evento_id: ev.id + ":orc",
          texto: "Esta conversa atingiu o teto de gasto por sessão e foi pausada. Abra uma conversa nova ou aprove um teto maior.",
        }, { onConflict: "evento_id", ignoreDuplicates: true });
      }
      break;
    }
    case "session.status_terminated":
      await db.from("conversas").update({ estado: "encerrada" }).eq("id", conv.id);
      conv.estado = "encerrada";
      break;
    case "session.error": {
      const msg = JSON.stringify(b.error ?? b).slice(0, 500);
      await db.from("conversas").update({ ultimo_erro: msg }).eq("id", conv.id);
      break;
    }
    case "session.usage": {
      const amt = (b.list_cost as { amount?: string } | undefined)?.amount;
      if (amt) await db.from("conversas").update({ custo_centavos: Number.parseInt(amt, 10) }).eq("id", conv.id);
      break;
    }
  }
}

/** Busca e aplica os eventos novos de uma conversa. Retorna o estado final. */
export async function sincronizar(db: Db, motor: Motor, conv: Conversa): Promise<string> {
  if (!conv.sessao_id) return conv.estado;
  const eventos = await motor.listarEventos(conv.sessao_id, conv.cursor_evento);
  if (!eventos.length) return conv.estado;

  const ids = eventos.map((e) => e.id);
  const { data: vistos } = await db.from("eventos").select("evento_id, processado").in("evento_id", ids);
  const processados = new Set((vistos ?? []).filter((v) => v.processado).map((v) => v.evento_id));

  // Nomes de threads precisam ser conhecidos antes das chamadas de ferramenta.
  for (const ev of eventos) {
    if (ev.tipo === "session.thread_created" && ev.bruto.session_thread_id) {
      NOMES_THREAD.set(String(ev.bruto.session_thread_id), String(ev.bruto.agent_name ?? "Agente"));
    }
  }

  for (const ev of eventos) {
    if (processados.has(ev.id)) continue;
    await db.from("eventos").upsert({
      evento_id: ev.id, conversa_id: conv.id, tipo: ev.tipo, thread_id: ev.threadId, payload: ev.bruto, criado_em: ev.quando,
    }, { onConflict: "evento_id", ignoreDuplicates: true });
    await aplicarEvento(db, motor, conv, ev);
    await db.from("eventos").update({ processado: true }).eq("evento_id", ev.id);
  }

  const cursor = eventos[eventos.length - 1].quando;
  await db.from("conversas").update({ cursor_evento: cursor }).eq("id", conv.id);
  conv.cursor_evento = cursor;
  return conv.estado;
}

/** Acompanha a conversa por até `ms`, para a resposta chegar ao painel em segundos. */
export async function acompanhar(db: Db, motor: Motor, conversaId: string, ms = 140_000) {
  const fim = Date.now() + ms;
  let ociosoSeguido = 0;
  while (Date.now() < fim) {
    const { data: conv } = await db.from("conversas")
      .select("id, sessao_id, estado, cursor_evento, titulo").eq("id", conversaId).single();
    if (!conv) return;
    const estado = await sincronizar(db, motor, conv as Conversa);
    if (estado !== "trabalhando") {
      ociosoSeguido++;
      if (ociosoSeguido >= 2) break; // confirma o idle duas vezes antes de sair
    } else {
      ociosoSeguido = 0;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  if (motor && conversaId) {
    const { data: c } = await db.from("conversas").select("sessao_id").eq("id", conversaId).single();
    if (c?.sessao_id) {
      const custo = await motor.custoCentavos(c.sessao_id).catch(() => null);
      if (custo !== null) await db.from("conversas").update({ custo_centavos: custo }).eq("id", conversaId);
    }
  }
}

// ---------------------------------------------------------------- orçamento
export interface Limites {
  mensal_centavos: number;    // bloqueia novas mensagens ao atingir
  sessao_centavos: number;    // teto rígido por conversa (budget do Managed Agents)
}

export const LIMITES_PADRAO: Limites = { mensal_centavos: 4500, sessao_centavos: 300 };

export async function gastoDoMes(db: Db): Promise<number> {
  const inicio = new Date();
  inicio.setUTCDate(1);
  inicio.setUTCHours(0, 0, 0, 0);
  const { data } = await db.from("conversas").select("custo_centavos").gte("atualizado_em", inicio.toISOString());
  return (data ?? []).reduce((s, c) => s + (c.custo_centavos ?? 0), 0);
}
