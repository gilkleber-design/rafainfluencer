/**
 * Teste do processador com banco em memória e motor falso.
 * Simula: Gil pede roteiro -> Command Center registra tarefa e delega -> Produção entrega v1 ->
 * Command Center pede aprovação -> Gil pede alteração -> Produção entrega v2 -> nova aprovação.
 * Rodar: deno test -A supabase/functions/_testes/processar_test.ts
 */
import { assertEquals } from "jsr:@std/assert@1";
import { sincronizar, type Conversa } from "../_shared/processar.ts";
import type { EventoMotor, Motor } from "../_shared/motor.ts";

// ------------------------------------------------------------ banco em memória
type Linha = Record<string, unknown>;
const uuid = () => crypto.randomUUID();
function bancoFalso() {
  const t: Record<string, Linha[]> = { conversas: [], mensagens: [], tarefas: [], resultados: [], aprovacoes: [], eventos: [], chamadas: [], config: [] };
  let seq = 0;
  const pk: Record<string, string> = { eventos: "evento_id", chamadas: "evento_id", config: "chave" };
  function builder(nome: string) {
    let filtros: ((l: Linha) => boolean)[] = [];
    let op: "select" | "insert" | "update" | "upsert" = "select";
    let dados: Linha | Linha[] | null = null;
    let opts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
    let ordem: { col: string; asc: boolean } | null = null;
    let lim = Infinity;
    let modo: "lista" | "single" | "maybe" = "lista";
    const b: Record<string, unknown> = {
      select() { return b; },
      insert(d: Linha | Linha[]) { op = "insert"; dados = d; return b; },
      upsert(d: Linha | Linha[], o = {}) { op = "upsert"; dados = d; opts = o; return b; },
      update(d: Linha) { op = "update"; dados = d; return b; },
      eq(c: string, v: unknown) { filtros.push((l) => l[c] === v); return b; },
      in(c: string, vs: unknown[]) { filtros.push((l) => vs.includes(l[c])); return b; },
      order(c: string, o: { ascending: boolean }) { ordem = { col: c, asc: o.ascending }; return b; },
      limit(n: number) { lim = n; return b; },
      single() { modo = "single"; return b; },
      maybeSingle() { modo = "maybe"; return b; },
      then(ok: (r: unknown) => void) { ok(executar()); },
    };
    function preparar(l: Linha): Linha {
      const n = { ...l };
      if (!pk[nome] && !n.id) n.id = uuid();
      if (nome === "tarefas" && !n.codigo) n.codigo = `T-${String(++seq).padStart(4, "0")}`;
      if (nome === "tarefas" && !n.estado) n.estado = "pendente";
      if (nome === "resultados") { n.serie ??= uuid(); n.versao ??= 1; }
      if (nome === "aprovacoes") n.estado ??= "pendente";
      if (nome === "chamadas") n.estado ??= "pendente";
      if (nome === "eventos") n.processado ??= false;
      return n;
    }
    function executar() {
      const tab = t[nome];
      let afetadas: Linha[] = [];
      if (op === "insert" || op === "upsert") {
        const lista = Array.isArray(dados) ? dados : [dados!];
        for (const d of lista) {
          const chave = opts.onConflict ?? pk[nome] ?? "id";
          const existente = d[chave] !== undefined ? tab.find((l) => l[chave] === d[chave]) : undefined;
          if (existente) {
            if (op === "upsert" && !opts.ignoreDuplicates) Object.assign(existente, d);
            if (op === "insert") return { data: null, error: { message: "duplicado" } };
            continue;
          }
          const n = preparar(d);
          tab.push(n);
          afetadas.push(n);
        }
      } else {
        afetadas = tab.filter((l) => filtros.every((f) => f(l)));
        if (op === "update") afetadas.forEach((l) => Object.assign(l, dados));
      }
      if (ordem) { const o = ordem; afetadas = [...afetadas].sort((a, b) => (Number(a[o.col]) - Number(b[o.col])) * (o.asc ? 1 : -1)); }
      afetadas = afetadas.slice(0, lim);
      if (modo === "single") return afetadas.length ? { data: afetadas[0], error: null } : { data: null, error: { message: "nenhuma linha" } };
      if (modo === "maybe") return { data: afetadas[0] ?? null, error: null };
      return { data: afetadas, error: null };
    }
    return b;
  }
  return { t, db: { from: builder } };
}

// ------------------------------------------------------------ motor falso
function motorFalso(roteiro: EventoMotor[][]) {
  const eventos: EventoMotor[] = [];
  const respostas: Record<string, string> = {};
  const enviadas: string[] = [];
  let lote = 0;
  let relogio = 0;
  const motor: Motor = {
    nome: "falso",
    criarSessao: () => Promise.resolve("sesn_teste"),
    enviarMensagem: (_s, texto) => { enviadas.push(texto); return Promise.resolve(); },
    responderFerramenta: (_s, id, texto) => { respostas[id] = texto; return Promise.resolve(); },
    listarEventos: (_s, desde) => {
      if (lote < roteiro.length) {
        for (const e of roteiro[lote++]) eventos.push({ ...e, quando: new Date(1_700_000_000_000 + (relogio++) * 1000).toISOString() });
      }
      return Promise.resolve(eventos.filter((e) => !desde || e.quando >= desde));
    },
    custoCentavos: () => Promise.resolve(12),
  };
  return { motor, respostas, enviadas, proximo: () => lote };
}

const ev = (id: string, tipo: string, extra: Record<string, unknown> = {}, threadId: string | null = null): EventoMotor =>
  ({ id, tipo, quando: "", threadId, bruto: { id, type: tipo, session_thread_id: threadId, ...extra } });

Deno.test("fluxo completo: pedido, roteiro v1, alteração, roteiro v2", async () => {
  const { t, db } = bancoFalso();
  const conv: Conversa = { id: "c1", sessao_id: "sesn_teste", estado: "trabalhando", cursor_evento: null, titulo: "teste" };
  t.conversas.push({ ...conv, custo_centavos: 0 });

  // Respostas de ferramenta dependem de ids gerados; o roteiro usa funções preguiçosas via referência.
  const rot: EventoMotor[][] = [
    [
      ev("e1", "session.status_running"),
      ev("e2", "agent.custom_tool_use", { name: "registrar_tarefa", input: { titulo: "Roteiro blush", agente: "Produção" } }),
    ],
    [
      ev("e3", "agent.thread_message_sent", { to_agent_name: "Produção", content: [{ type: "text", text: "briefing" }] }),
      ev("e4", "session.thread_created", { session_thread_id: "th1", agent_name: "Produção" }),
      ev("e5", "agent.custom_tool_use", { name: "entregar_resultado", input: { titulo: "EP 2", tipo: "roteiro", conteudo: "# v1", codigo_tarefa: "T-0001" } }, "th1"),
    ],
  ];
  const { motor, respostas } = motorFalso(rot);

  await sincronizar(db as never, motor, conv);
  assertEquals(JSON.parse(respostas.e2).codigo, "T-0001");
  assertEquals(t.tarefas[0].estado, "em_execucao");

  await sincronizar(db as never, motor, conv);
  const r1 = JSON.parse(respostas.e5);
  assertEquals(r1.versao, 1);
  assertEquals(t.resultados[0].autor, "Produção");
  assertEquals(t.resultados[0].tarefa_id, t.tarefas[0].id);
  assertEquals(t.mensagens.some((m) => m.texto === "Delegado a Produção."), true);

  // Command Center pede aprovação e fecha o turno.
  rot.push([
    ev("e6", "agent.thread_message_received", { from_agent_name: "Produção", content: [{ type: "text", text: `salvo ${r1.resultado_id} v1` }] }),
    ev("e7", "agent.custom_tool_use", { name: "pedir_aprovacao", input: { resultado_id: r1.resultado_id, pergunta: "Aprovar v1?" } }),
    ev("e8", "agent.message", { content: [{ type: "text", text: "Roteiro pronto, em Aprovações." }] }),
    ev("e9", "session.usage", { list_cost: { amount: "37", currency: "USD" } }),
    ev("e10", "session.status_idle", { stop_reason: { type: "end_turn" } }),
  ]);
  const estado = await sincronizar(db as never, motor, conv);
  assertEquals(estado, "aguardando");
  assertEquals(t.aprovacoes.length, 1);
  assertEquals(t.conversas[0].custo_centavos, 37);
  assertEquals(t.mensagens.filter((m) => m.autor === "command_center").length, 1);

  // Revisão: Produção entrega v2 substituindo v1.
  rot.push([
    ev("e11", "session.status_running"),
    ev("e12", "agent.custom_tool_use", { name: "entregar_resultado", input: { titulo: "EP 2", tipo: "roteiro", conteudo: "# v2", substitui_resultado_id: r1.resultado_id } }, "th1"),
    ev("e13", "session.status_idle", { stop_reason: { type: "end_turn" } }),
  ]);
  await sincronizar(db as never, motor, conv);
  const r2 = JSON.parse(respostas.e12);
  assertEquals(r2.versao, 2);
  assertEquals(t.resultados[1].serie, t.resultados[0].serie);

  // Reprocessar não duplica nada.
  const antes = JSON.stringify(t);
  conv.cursor_evento = null;
  await sincronizar(db as never, motor, conv);
  const depois = JSON.parse(JSON.stringify(t));
  depois.conversas[0].cursor_evento = JSON.parse(antes).conversas[0].cursor_evento;
  assertEquals(t.resultados.length, 2);
  assertEquals(t.aprovacoes.length, 1);
  assertEquals(t.mensagens.length, JSON.parse(antes).mensagens.length);
});

Deno.test("teto da sessão pausa a conversa e avisa", async () => {
  const { t, db } = bancoFalso();
  const conv: Conversa = { id: "c2", sessao_id: "s", estado: "trabalhando", cursor_evento: null, titulo: "x" };
  t.conversas.push({ ...conv });
  const { motor } = motorFalso([[ev("b1", "session.status_idle", { stop_reason: { type: "budget_reached" } })]]);
  const estado = await sincronizar(db as never, motor, conv);
  assertEquals(estado, "pausada_orcamento");
  assertEquals(t.mensagens.length, 1);
});
