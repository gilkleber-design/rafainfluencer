/**
 * Ciclo de vida dos conteúdos (quadro do painel) e coleta de métricas.
 * Não fala com o motor de agentes nem gasta orçamento de IA.
 */
import { lerConfig, type Db } from "./db.ts";

export const ETAPAS = ["ideia", "roteiro", "aprovado", "em_producao", "gravado", "editado", "publicado"] as const;
type Etapa = typeof ETAPAS[number];
const TIPOS = ["roteiro", "pauta", "pesquisa", "relatorio", "outro"];

type Membro = { nome: string };
type Resposta = { status: number; corpo: Record<string, unknown> };
const ok = (corpo: Record<string, unknown> = {}): Resposta => ({ status: 200, corpo: { ok: true, ...corpo } });
const falha = (erro: string, status = 400): Resposta => ({ status, corpo: { erro } });

export function shortcodeDe(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,})/i);
  return m ? m[1] : null;
}

async function conteudo(db: Db, serie: string) {
  const { data } = await db.from("conteudos").select("*").eq("serie", serie).maybeSingle();
  return data as Record<string, unknown> | null;
}

async function ultimaVersao(db: Db, serie: string) {
  const { data } = await db.from("resultados").select("*").eq("serie", serie).order("versao", { ascending: false }).limit(1).maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function acaoConteudo(db: Db, membro: Membro, corpo: Record<string, unknown>): Promise<Resposta> {
  const acao = String(corpo.acao);
  const serie = corpo.serie ? String(corpo.serie) : "";

  if (acao === "conteudo_criar") {
    const titulo = String(corpo.titulo ?? "").trim().slice(0, 200);
    if (!titulo) return falha("dê um título");
    const tipo = TIPOS.includes(String(corpo.tipo)) ? String(corpo.tipo) : "pauta";
    const texto = String(corpo.conteudo ?? "").slice(0, 100000) || `# ${titulo}\n\n`;
    const { data, error } = await db.from("resultados")
      .insert({ titulo, tipo, conteudo: texto, autor: membro.nome, versao: 1 }).select("id, serie").single();
    if (error) return falha(error.message, 500);
    const etapa = ETAPAS.includes(corpo.etapa as Etapa) ? String(corpo.etapa) : "ideia";
    const classe = corpo.classe === "documento" ? "documento" : "peca";
    await db.from("conteudos").update({ etapa, classe }).eq("serie", data.serie);
    await db.from("conteudo_historico").insert({ serie: data.serie, de: null, para: etapa, por: membro.nome });
    return ok({ serie: data.serie, resultado_id: data.id });
  }

  const c = serie ? await conteudo(db, serie) : null;
  if (!c) return falha("conteúdo não encontrado", 404);

  switch (acao) {
    case "conteudo_mover": {
      const para = String(corpo.etapa) as Etapa;
      if (!ETAPAS.includes(para)) return falha("etapa inválida");
      const patch: Record<string, unknown> = { etapa: para };
      if (typeof corpo.ordem === "number") patch.ordem = corpo.ordem;
      if (para === "publicado") {
        const url = String(corpo.url_publicacao ?? c.url_publicacao ?? "").trim();
        if (url && !shortcodeDe(url)) return falha("link do Instagram inválido (use o link do Reel)");
        if (url) patch.url_publicacao = url;
        if (!c.publicado_em) patch.publicado_em = new Date().toISOString();
      }
      const { error } = await db.from("conteudos").update(patch).eq("serie", serie);
      if (error) return falha(error.message, 500);
      if (c.etapa !== para) await db.from("conteudo_historico").insert({ serie, de: c.etapa, para, por: membro.nome });
      return ok();
    }
    case "conteudo_publicacao": {
      const url = String(corpo.url_publicacao ?? "").trim();
      if (url && !shortcodeDe(url)) return falha("link do Instagram inválido (use o link do Reel)");
      const perfil = String(corpo.perfil_instagram ?? "").replace(/^@/, "").trim();
      if (perfil && !/^[A-Za-z0-9._]{1,30}$/.test(perfil)) return falha("perfil inválido");
      await db.from("conteudos").update({ url_publicacao: url || null, perfil_instagram: perfil || null }).eq("serie", serie);
      return ok();
    }
    case "conteudo_arquivar":
      await db.from("conteudos").update({ arquivado_em: new Date().toISOString(), arquivado_por: membro.nome }).eq("serie", serie);
      await db.from("conteudo_historico").insert({ serie, de: c.etapa, para: "arquivado", por: membro.nome });
      return ok();
    case "conteudo_restaurar":
      await db.from("conteudos").update({ arquivado_em: null, arquivado_por: null }).eq("serie", serie);
      await db.from("conteudo_historico").insert({ serie, de: "arquivado", para: String(c.etapa), por: membro.nome });
      return ok();
    case "conteudo_editar": {
      const ult = await ultimaVersao(db, serie);
      if (!ult) return falha("sem versão anterior", 404);
      const titulo = String(corpo.titulo ?? ult.titulo).trim().slice(0, 200) || String(ult.titulo);
      const texto = String(corpo.conteudo ?? "").slice(0, 100000);
      if (!texto.trim()) return falha("o texto não pode ficar vazio");
      if (texto === ult.conteudo && titulo === ult.titulo) return falha("nada mudou");
      const { data, error } = await db.from("resultados").insert({
        conversa_id: ult.conversa_id, tarefa_id: ult.tarefa_id, serie, versao: Number(ult.versao) + 1,
        tipo: ult.tipo, titulo, conteudo: texto, autor: membro.nome,
      }).select("id, versao").single();
      if (error) return falha(error.message, 500);
      await db.from("conteudos").update({ titulo }).eq("serie", serie);
      return ok({ resultado_id: data.id, versao: data.versao });
    }
    case "conteudo_classe": {
      const classe = String(corpo.classe);
      if (!["peca", "documento"].includes(classe)) return falha("classe inválida");
      await db.from("conteudos").update({ classe }).eq("serie", serie);
      return ok();
    }
    case "conteudo_etiquetas": {
      const lista = Array.isArray(corpo.etiquetas) ? corpo.etiquetas : [];
      const etiquetas = [...new Set(lista.map((e) => String(e).trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 10);
      await db.from("conteudos").update({ etiquetas }).eq("serie", serie);
      return ok({ etiquetas });
    }
    case "conteudo_anexar": {
      const pai = corpo.anexo_de ? String(corpo.anexo_de) : null;
      if (pai === serie) return falha("um conteúdo não pode ser anexo dele mesmo");
      if (pai && !(await conteudo(db, pai))) return falha("conteúdo de destino não encontrado", 404);
      await db.from("conteudos").update({ anexo_de: pai }).eq("serie", serie);
      return ok();
    }
    case "metricas_coletar": {
      const r = await coletarMetricas(db, serie);
      return r.erro ? falha(r.erro, 502) : ok(r);
    }
    default:
      return falha("ação desconhecida");
  }
}

/** Procura, em qualquer profundidade do JSON, objetos de mídia com permalink. */
function midias(x: unknown, acc: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(x)) x.forEach((i) => midias(i, acc));
  else if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o.permalink === "string") acc.push(o);
    Object.values(o).forEach((v) => { if (v && typeof v === "object") midias(v, acc); });
  }
  return acc;
}

/**
 * Lê curtidas e comentários do Reel publicado pela função `pesquisa` (IA com Prosa, só leitura,
 * business_discovery). Visualizações e alcance só virão com a conta da Rafa conectada (Insights).
 */
export async function coletarMetricas(db: Db, serie: string): Promise<{ erro?: string; curtidas?: number | null; comentarios?: number | null }> {
  const url = Deno.env.get("PESQUISA_URL");
  const token = Deno.env.get("PESQUISA_TOKEN");
  if (!url || !token) return { erro: "consulta ao Instagram ainda não configurada (PESQUISA_URL/PESQUISA_TOKEN)" };
  const c = await conteudo(db, serie);
  if (!c?.url_publicacao) return { erro: "informe o link do Reel publicado" };
  const codigo = shortcodeDe(String(c.url_publicacao));
  if (!codigo) return { erro: "link do Reel inválido" };
  const perfil = String(c.perfil_instagram ?? (await lerConfig<string>(db, "perfil_instagram")) ?? "").replace(/^@/, "");
  if (!perfil) return { erro: "perfil do Instagram não configurado" };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-pub-token": token },
    body: JSON.stringify({ acao: "descobrir", usuario: perfil, limite: 50 }),
  });
  const texto = await r.text();
  if (!r.ok) return { erro: `pesquisa respondeu ${r.status}: ${texto.slice(0, 300)}` };
  let dados: unknown;
  try { dados = JSON.parse(texto); } catch { return { erro: "resposta da pesquisa não é JSON" }; }
  const m = midias(dados).find((x) => shortcodeDe(String(x.permalink)) === codigo);
  if (!m) return { erro: `Reel ${codigo} não encontrado nos últimos 50 posts de @${perfil}` };
  const num = (v: unknown) => (typeof v === "number" ? v : v == null ? null : Number(v) || null);
  const linha = { serie, curtidas: num(m.like_count), comentarios: num(m.comments_count), fonte: "business_discovery", bruto: m };
  const { error } = await db.from("metricas").insert(linha);
  if (error) return { erro: error.message };
  return { curtidas: linha.curtidas, comentarios: linha.comentarios };
}

/** Coleta de todos os publicados (rodada diária pelo cron, via `sync?metricas=1`). */
export async function coletarTodas(db: Db) {
  const { data } = await db.from("conteudos").select("serie").eq("etapa", "publicado").is("arquivado_em", null).not("url_publicacao", "is", null);
  const res: Record<string, unknown> = {};
  for (const c of data ?? []) res[c.serie] = await coletarMetricas(db, c.serie);
  return res;
}
