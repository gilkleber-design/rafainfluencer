"use client";
import { useMemo, useState } from "react";
import { Bot, Check, CheckCheck, ChevronLeft, Copy, ExternalLink, FileText, PencilLine } from "lucide-react";
import Md from "@/components/Md";
import { ponte } from "@/lib/supabase";
import { useTabela } from "@/lib/useTabela";
import type { Aprovacao, Conteudo, Resultado, Tarefa } from "@/lib/tipos";
import { Aviso, Botao, CampoTexto, Cartao, Esqueleto, Selo, Vazio } from "@/components/ui";
import { Avatar, ESTADO_TAREFA, TIPO_RESULTADO, nomeConteudo, quando } from "@/components/identidade";
import { cn } from "@/lib/cn";

function Cabecalho({ titulo, sub, children }: { titulo: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-6 pb-4 md:px-8">
      <div>
        <h1 className="font-display text-[34px] leading-[1.1]">{titulo}</h1>
        {sub && <p className="mt-1 text-[14px] text-ink-2">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------- Atividade dos agentes */

export function Tarefas() {
  const { linhas, carregando } = useTabela<Tarefa>("tarefas", { ordem: "atualizada_em" });
  const { linhas: resultados } = useTabela<Resultado>("resultados", { ordem: "criado_em", limite: 500 });
  const { linhas: conteudos } = useTabela<Conteudo>("conteudos", { ordem: "ordem", limite: 500 });
  const reelDe = useMemo(() => {
    const porSerie = new Map(conteudos.map((c) => [c.serie, c]));
    const mapa = new Map<string, Conteudo>();
    for (const r of resultados) {
      const c = r.tarefa_id ? porSerie.get(r.serie) : undefined;
      if (c && r.tarefa_id && !mapa.has(r.tarefa_id)) mapa.set(r.tarefa_id, c);
    }
    return mapa;
  }, [resultados, conteudos]);
  const visiveis = linhas.filter((t) => !t.arquivada_em).sort((a, b) => b.atualizada_em.localeCompare(a.atualizada_em));
  const atencao = visiveis.filter((t) => t.estado === "aguardando_aprovacao" || t.estado === "falhou").length;
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Cabecalho titulo="Atividade dos agentes" sub={carregando ? "Carregando…" : atencao ? `${atencao} precisa${atencao > 1 ? "m" : ""} de você` : "O que cada agente fez, do mais recente para o mais antigo"} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 md:px-8">
        {carregando ? <Esqueleto className="h-24" /> : visiveis.length === 0 ? (
          <Vazio icone={<Bot className="size-5" />} titulo="Nenhuma atividade por enquanto">Quando você pedir algo no Chat, cada passo dos agentes aparece aqui.</Vazio>
        ) : (
          <Cartao className="mx-auto max-w-[860px] divide-y divide-line overflow-hidden">
            {visiveis.map((t) => {
              const reel = reelDe.get(t.id);
              const destaque = t.estado === "aguardando_aprovacao" ? "alerta" : t.estado === "falhou" ? "erro" : null;
              return (
                <div key={t.id} className={cn("flex gap-3 px-4 py-3.5", destaque === "alerta" && "bg-warn-soft/60", destaque === "erro" && "bg-bad-soft/60")}>
                  <Avatar nome={t.agente} tipo="agente" tamanho={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[13px] font-semibold">{t.agente}</span>
                      {reel && <span className="text-[12px] text-brand">{nomeConteudo(reel)}</span>}
                      {destaque && <Selo tom={destaque} ponto className="ml-auto">{destaque === "alerta" ? "Aguardando você" : "Falhou"}</Selo>}
                    </div>
                    <p className="mt-0.5 text-[14px] leading-snug">{t.titulo}</p>
                    {t.detalhe && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{t.detalhe}</p>}
                    <p className="mt-1 text-[11px] text-muted">{quando(t.atualizada_em)}{!destaque && ` · ${ESTADO_TAREFA[t.estado]?.nome ?? t.estado}`}</p>
                  </div>
                </div>
              );
            })}
          </Cartao>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Resultados */

export function Resultados({ abrirId }: { abrirId?: string | null }) {
  const { linhas, carregando } = useTabela<Resultado>("resultados", { ordem: "criado_em" });
  const { linhas: aprovacoes } = useTabela<Aprovacao>("aprovacoes", { ordem: "criado_em" });
  const [selId, setSelId] = useState<string | null>(abrirId ?? null);
  const [leitura, setLeitura] = useState(!!abrirId);
  const [copiado, setCopiado] = useState(false);

  const series = useMemo(() => {
    const m = new Map<string, Resultado[]>();
    for (const r of linhas) m.set(r.serie, [...(m.get(r.serie) ?? []), r].sort((a, b) => b.versao - a.versao));
    return [...m.values()].sort((a, b) => b[0].criado_em.localeCompare(a[0].criado_em));
  }, [linhas]);
  const sel = linhas.find((r) => r.id === selId) ?? series[0]?.[0] ?? null;
  const versoes = sel ? series.find((s) => s[0].serie === sel.serie) ?? [] : [];
  const situacao = (id: string) => {
    const a = aprovacoes.find((x) => x.resultado_id === id);
    if (!a) return null;
    return a.estado === "pendente" ? { nome: "Aguardando você", tom: "alerta" as const }
      : a.estado === "aprovado" ? { nome: "Aprovado", tom: "ok" as const }
      : a.estado === "alteracao_pedida" ? { nome: "Alteração pedida", tom: "marca" as const } : null;
  };

  async function copiar() {
    if (!sel) return;
    await navigator.clipboard.writeText(sel.conteudo);
    setCopiado(true); setTimeout(() => setCopiado(false), 1600);
  }

  if (!carregando && series.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <Cabecalho titulo="Resultados" />
        <Vazio icone={<FileText className="size-5" />} titulo="Nenhum resultado ainda">Roteiros, pautas e relatórios entregues pelos agentes aparecem aqui, com todas as versões.</Vazio>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className={cn("w-full md:w-[320px] shrink-0 flex-col border-r border-line bg-surface/60", leitura ? "hidden md:flex" : "flex")}>
        <div className="px-4 pt-6 pb-3">
          <h1 className="font-display text-[28px] leading-[1.1]">Resultados</h1>
          <p className="text-[13px] text-muted">{series.length} documento{series.length === 1 ? "" : "s"}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {carregando && [0, 1, 2].map((i) => <Esqueleto key={i} className="mx-2 my-2 h-16" />)}
          {series.map((s) => {
            const r = s[0];
            const st = situacao(r.id);
            const ativo = sel?.serie === r.serie;
            return (
              <button
                key={r.serie}
                onClick={() => { setSelId(r.id); setLeitura(true); }}
                className={cn("w-full rounded-xl px-3 py-3 text-left transition cursor-pointer", ativo ? "bg-brand-soft" : "hover:bg-surface-2")}
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted">
                  <span>{TIPO_RESULTADO[r.tipo] ?? r.tipo}</span><span>·</span><span>v{r.versao}</span>
                  <span className="ml-auto normal-case tracking-normal">{quando(r.criado_em)}</span>
                </div>
                <p className={cn("mt-1 line-clamp-2 text-[14px] font-medium leading-snug", ativo && "text-brand")}>{r.titulo}</p>
                {st && <Selo tom={st.tom} ponto className="mt-2">{st.nome}</Selo>}
              </button>
            );
          })}
        </div>
      </aside>

      {sel && (
        <article className={cn("min-w-0 flex-1 overflow-y-auto", !leitura && "hidden md:block")}>
          <div className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
            <div className="mx-auto flex max-w-[980px] flex-wrap items-center gap-3 px-4 py-3 md:px-10">
              <Botao variante="fantasma" tamanho="icone" className="md:hidden -ml-2" aria-label="Voltar" onClick={() => setLeitura(false)}><ChevronLeft className="size-5" /></Botao>
              <div className="flex rounded-xl bg-surface-2 p-0.5">
                {versoes.slice().reverse().map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelId(v.id)}
                    className={cn("rounded-[10px] px-3 py-1 text-[13px] font-medium transition cursor-pointer", v.id === sel.id ? "bg-surface shadow-sm text-ink" : "text-muted hover:text-ink")}
                  >v{v.versao}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-muted">
                <Avatar nome={sel.autor} tipo="agente" tamanho={22} />
                <span>{sel.autor} · {quando(sel.criado_em)}</span>
              </div>
              <Botao variante="contorno" tamanho="sm" className="ml-auto" onClick={copiar}>
                {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copiado ? "Copiado" : "Copiar texto"}
              </Botao>
            </div>
          </div>
          <div className="mx-auto max-w-[980px] px-4 py-8 md:px-10">
            {versoes.length > 1 && sel.versao !== versoes[0].versao && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-warn-soft px-4 py-2.5 text-[13px] text-warn">
                Você está vendo uma versão antiga.
                <button className="font-semibold underline underline-offset-2 cursor-pointer" onClick={() => setSelId(versoes[0].id)}>Ver a v{versoes[0].versao}</button>
              </div>
            )}
            <Md>{sel.conteudo}</Md>
          </div>
        </article>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Aprovações */

export function Aprovacoes({ verResultado }: { verResultado: (id: string) => void }) {
  const { linhas, carregando } = useTabela<Aprovacao>("aprovacoes", { ordem: "criado_em" });
  const { linhas: resultados } = useTabela<Resultado>("resultados", { ordem: "criado_em" });
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [pedindo, setPedindo] = useState<Record<string, boolean>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pendentes = linhas.filter((a) => a.estado === "pendente");
  const decididas = linhas.filter((a) => a.estado !== "pendente").slice(0, 20);
  const res = (id: string | null) => resultados.find((r) => r.id === id);
  const { linhas: conteudos } = useTabela<Conteudo>("conteudos", { ordem: "ordem", limite: 500 });
  const nome = (r: Resultado) => { const c = conteudos.find((x) => x.serie === r.serie); return c ? nomeConteudo(c) : r.titulo; };

  async function decidir(a: Aprovacao, estado: "aprovado" | "alteracao_pedida") {
    setOcupado(a.id);
    setErro(null);
    const r = await ponte({ acao: "decisao", aprovacao_id: a.id, estado, comentario: comentarios[a.id] ?? null });
    if (r.erro) setErro(r.erro);
    setOcupado(null);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[920px] pb-10">
        <Cabecalho titulo="Aprovações" sub={pendentes.length ? `${pendentes.length} esperando sua decisão` : "Tudo em dia"} />
        <div className="space-y-4 px-4 md:px-8">
          {erro && <Aviso>{erro}</Aviso>}
          {carregando && <Esqueleto className="h-48" />}
          {!carregando && pendentes.length === 0 && (
            <Cartao><Vazio icone={<CheckCheck className="size-5" />} titulo="Nada esperando você">Quando um agente entregar algo para aprovar, aparece aqui.</Vazio></Cartao>
          )}

          {pendentes.map((a) => {
            const r = res(a.resultado_id);
            const comentario = comentarios[a.id] ?? "";
            const modoAlteracao = pedindo[a.id];
            return (
              <Cartao key={a.id} className="overflow-hidden">
                <div className="flex items-start gap-3 border-b border-line p-5">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-warn-soft text-warn"><FileText className="size-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Selo tom="alerta" ponto>Aguardando você</Selo>
                      <span className="text-[12px] text-muted">{quando(a.criado_em)}</span>
                    </div>
                    <h2 className="mt-1.5 text-[17px] font-semibold leading-snug">{a.pergunta}</h2>
                    {r && <p className="mt-0.5 text-[13px] text-muted">{nome(r)} · v{r.versao} · por {r.autor}</p>}
                  </div>
                </div>

                {r && (
                  <div className="relative">
                    <div className="max-h-[340px] overflow-hidden px-5 py-4"><Md className="md md-compacto">{r.conteudo}</Md></div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
                    <div className="absolute inset-x-0 bottom-3 flex justify-center">
                      <Botao tamanho="sm" variante="contorno" className="shadow-sm" onClick={() => verResultado(r.id)}><ExternalLink className="size-3.5" />Ler completo</Botao>
                    </div>
                  </div>
                )}

                <div className="space-y-3 border-t border-line bg-surface-2/40 p-4">
                  {modoAlteracao && (
                    <CampoTexto
                      autoFocus rows={3} value={comentario}
                      placeholder="O que precisa mudar? Seja específico: trecho, tom, duração…"
                      onChange={(e) => setComentarios({ ...comentarios, [a.id]: e.target.value })}
                    />
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {modoAlteracao ? (
                      <>
                        <Botao variante="fantasma" onClick={() => setPedindo({ ...pedindo, [a.id]: false })}>Cancelar</Botao>
                        <Botao variante="primario" disabled={ocupado === a.id || !comentario.trim()} onClick={() => decidir(a, "alteracao_pedida")}>
                          <PencilLine className="size-4" />{ocupado === a.id ? "Enviando…" : "Enviar pedido de alteração"}
                        </Botao>
                      </>
                    ) : (
                      <>
                        <Botao variante="contorno" disabled={ocupado === a.id} onClick={() => setPedindo({ ...pedindo, [a.id]: true })}><PencilLine className="size-4" />Pedir alteração</Botao>
                        <Botao variante="primario" disabled={ocupado === a.id} onClick={() => decidir(a, "aprovado")} className="min-w-[132px]">
                          <Check className="size-4" />{ocupado === a.id ? "Enviando…" : "Aprovar"}
                        </Botao>
                      </>
                    )}
                  </div>
                </div>
              </Cartao>
            );
          })}

          {decididas.length > 0 && (
            <>
              <h3 className="pt-6 text-[13px] font-semibold uppercase tracking-wide text-muted">Histórico</h3>
              <Cartao className="divide-y divide-line">
                {decididas.map((a) => {
                  const r = res(a.resultado_id);
                  const ok = a.estado === "aprovado";
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-5 py-4">
                      <div className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", ok ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand")}>
                        {ok ? <Check className="size-3.5" /> : <PencilLine className="size-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium">{a.pergunta}</p>
                        <p className="text-[12px] text-muted">{ok ? "Aprovado" : a.estado === "alteracao_pedida" ? "Alteração pedida" : a.estado} por {a.decidido_por ?? "—"}{a.decidido_em && ` · ${quando(a.decidido_em)}`}{r && ` · v${r.versao}`}</p>
                        {a.comentario && <p className="mt-1.5 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">“{a.comentario}”</p>}
                      </div>
                      {r && <Botao variante="fantasma" tamanho="sm" onClick={() => verResultado(r.id)}>Abrir</Botao>}
                    </div>
                  );
                })}
              </Cartao>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
