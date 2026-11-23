"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Archive, ArchiveRestore, BarChart3, Check, ChevronLeft, Copy, Eye, FileText, GripVertical, History, Instagram,
  Library, Link2, MoreHorizontal, TrendingUp, Paperclip, PencilLine, Plus, RefreshCw, Search, Tag, Trash2, X,
} from "lucide-react";
import Md from "@/components/Md";
import { ponte } from "@/lib/supabase";
import { useTabela } from "@/lib/useTabela";
import type { Conteudo, Etapa, Historico, Metrica, Resultado } from "@/lib/tipos";
import { Aviso, Botao, CampoTexto, Cartao, Esqueleto, Selo, Vazio } from "@/components/ui";
import { Avatar, ETAPAS, type Padrao, TIPO_RESULTADO, forcaEvidencia, nomeConteudo, nomeEtapa, num, quando } from "@/components/identidade";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ modal */
export function Modal({ titulo, aberto, fechar, children }: { titulo: string; aberto: boolean; fechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, fechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={fechar} />
      <Cartao className="relative w-full sm:max-w-md rounded-b-none sm:rounded-2xl p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[24px] leading-tight">{titulo}</h2>
          <Botao variante="fantasma" tamanho="icone" aria-label="Fechar" onClick={fechar}><X className="size-4" /></Botao>
        </div>
        {children}
      </Cartao>
    </div>
  );
}

const campo = "h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60";

/* ------------------------------------------------------------- dados comuns */
function useDados() {
  const c = useTabela<Conteudo>("conteudos", { ordem: "ordem", limite: 500 });
  const r = useTabela<Resultado>("resultados", { ordem: "criado_em", limite: 500 });
  const m = useTabela<Metrica>("metricas", { ordem: "coletado_em", limite: 1000 });
  const p = useTabela<Padrao>("padroes", { ordem: "razao_vs_mediana", limite: 200 });
  const padroes = useMemo(() => new Map(p.linhas.map((x) => [x.id, x])), [p.linhas]);
  const versoes = useMemo(() => {
    const mapa = new Map<string, Resultado[]>();
    for (const x of r.linhas) mapa.set(x.serie, [...(mapa.get(x.serie) ?? []), x]);
    for (const v of mapa.values()) v.sort((a, b) => b.versao - a.versao);
    return mapa;
  }, [r.linhas]);
  const metricas = useMemo(() => {
    const mapa = new Map<string, Metrica[]>();
    for (const x of m.linhas) mapa.set(x.serie, [...(mapa.get(x.serie) ?? []), x]);
    for (const v of mapa.values()) v.sort((a, b) => a.coletado_em.localeCompare(b.coletado_em));
    return mapa;
  }, [m.linhas]);
  return { conteudos: c.linhas, carregando: c.carregando || r.carregando, versoes, metricas, padroes };
}

async function chamar(corpo: Record<string, unknown>, setErro: (e: string | null) => void) {
  setErro(null);
  const r = await ponte(corpo);
  if (r.erro) setErro(r.erro);
  return r;
}

/* ================================================================ Conteúdos */
export function Conteudos({ abrirResultado, abrirSerie }: { abrirResultado?: string | null; abrirSerie?: string | null }) {
  const { conteudos, carregando, versoes, metricas, padroes } = useDados();
  const [aberto, setAberto] = useState<string | null>(abrirSerie ?? null);
  const [lixeira, setLixeira] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [publicar, setPublicar] = useState<Conteudo | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Etapa | null>(null);

  // Vindo de Aprovações: abre o conteúdo daquele resultado.
  useEffect(() => {
    if (!abrirResultado) return;
    for (const [serie, vs] of versoes) if (vs.some((v) => v.id === abrirResultado)) { setAberto(serie); break; }
  }, [abrirResultado, versoes]);

  const ativos = conteudos.filter((c) => !c.arquivado_em && c.classe !== "documento" && !c.anexo_de);
  const anexosDe = (serie: string) => conteudos.filter((x) => x.anexo_de === serie && !x.arquivado_em).length;
  const arquivados = conteudos.filter((c) => c.arquivado_em);

  async function mover(c: Conteudo, etapa: Etapa, extra: Record<string, unknown> = {}) {
    if (etapa === "publicado" && !c.url_publicacao && !extra.url_publicacao) { setPublicar({ ...c }); return; }
    await chamar({ acao: "conteudo_mover", serie: c.serie, etapa, ...extra }, setErro);
  }

  const sel = conteudos.find((c) => c.serie === aberto);
  if (sel) {
    return <Detalhe c={sel} todos={conteudos} versoes={versoes.get(sel.serie) ?? []} metricas={metricas.get(sel.serie) ?? []} voltar={() => setAberto(null)} abrir={setAberto} mover={mover} />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-6 pb-4 md:px-8">
        <div>
          <h1 className="font-display text-[34px] leading-[1.1]">Conteúdos</h1>
          <p className="mt-1 text-[14px] text-ink-2">Da ideia ao Reel publicado. Arraste os cartões entre as etapas.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-surface-2 p-0.5">
            <button onClick={() => setLixeira(false)} className={cn("rounded-[10px] px-3 py-1.5 text-[13px] font-medium cursor-pointer", !lixeira ? "bg-surface-3 text-ink shadow-sm" : "text-ink-2")}>Quadro</button>
            <button onClick={() => setLixeira(true)} className={cn("inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-medium cursor-pointer", lixeira ? "bg-surface-3 text-ink shadow-sm" : "text-ink-2")}>
              <Trash2 className="size-3.5" />Lixeira{arquivados.length > 0 && <span className="text-muted">({arquivados.length})</span>}
            </button>
          </div>
          <Botao variante="primario" tamanho="md" onClick={() => setNovo(true)}><Plus className="size-4" />Novo conteúdo</Botao>
        </div>
      </div>
      {erro && <div className="px-4 md:px-8"><Aviso className="mb-3">{erro}</Aviso></div>}

      {lixeira ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-8">
          {arquivados.length === 0 ? (
            <Cartao><Vazio icone={<Trash2 className="size-5" />} titulo="Lixeira vazia">O que você arquivar aparece aqui e pode ser restaurado a qualquer momento.</Vazio></Cartao>
          ) : (
            <Cartao className="divide-y divide-line max-w-3xl">
              {arquivados.map((c) => (
                <div key={c.serie} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{nomeConteudo(c)}</p>
                    <p className="text-[12px] text-muted">Estava em {nomeEtapa(c.etapa)} · arquivado por {c.arquivado_por ?? "—"} {c.arquivado_em && quando(c.arquivado_em)}</p>
                  </div>
                  <Botao tamanho="sm" onClick={() => chamar({ acao: "conteudo_restaurar", serie: c.serie }, setErro)}><ArchiveRestore className="size-3.5" />Restaurar</Botao>
                </div>
              ))}
            </Cartao>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-6 md:px-8 snap-x snap-mandatory">
          <div className="flex h-full gap-3 lg:gap-2">
            {ETAPAS.map((e) => {
              const itens = ativos.filter((c) => c.etapa === e.id).sort((a, b) => b.ordem - a.ordem);
              return (
                <div
                  key={e.id}
                  onDragOver={(ev) => { ev.preventDefault(); setAlvo(e.id); }}
                  onDragLeave={() => setAlvo((a) => (a === e.id ? null : a))}
                  onDrop={(ev) => {
                    ev.preventDefault(); setAlvo(null);
                    const c = conteudos.find((x) => x.serie === ev.dataTransfer.getData("text/plain"));
                    if (c && c.etapa !== e.id) mover(c, e.id, { ordem: Date.now() / 1000 });
                  }}
                  className={cn("flex h-full w-[264px] min-w-[240px] shrink-0 snap-start flex-col rounded-2xl border p-1.5 transition-colors lg:w-auto lg:min-w-[148px] lg:flex-1 lg:basis-0", e.cor,
                    alvo === e.id && arrastando ? "border-brand/50 bg-brand-soft" : "border-line/60 bg-surface/60")}
                >
                  <div className={cn("mb-2 flex items-center gap-1.5 rounded-xl px-3 py-2.5 etapa-faixa", e.cor)}>
                    <span className="truncate text-[13px] font-semibold">{e.nome}</span>
                    <span className="text-[13px] tabular-nums opacity-85">· {itens.length}</span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
                    {carregando && <Esqueleto className="h-20" />}
                    {!carregando && itens.length === 0 && <p className="px-2 py-6 text-center text-[12px] text-muted">Solte aqui</p>}
                    {itens.map((c) => (
                      <CartaoConteudo
                        key={c.serie} c={c} versoes={versoes.get(c.serie) ?? []} metricas={metricas.get(c.serie) ?? []} anexos={anexosDe(c.serie)}
                        padrao={c.padrao_id ? padroes.get(c.padrao_id) : null}
                        abrir={() => setAberto(c.serie)} mover={(et) => mover(c, et)}
                        arquivar={() => chamar({ acao: "conteudo_arquivar", serie: c.serie }, setErro)}
                        onDragStart={() => setArrastando(c.serie)} onDragEnd={() => { setArrastando(null); setAlvo(null); }}
                        fantasma={arrastando === c.serie}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <NovaIdeia aberto={novo} fechar={() => setNovo(false)} setErro={setErro} />
      <PedirLink c={publicar} fechar={() => setPublicar(null)} confirmar={async (url) => {
        if (publicar) await chamar({ acao: "conteudo_mover", serie: publicar.serie, etapa: "publicado", url_publicacao: url }, setErro);
        setPublicar(null);
      }} />
    </div>
  );
}

function CartaoConteudo({ c, versoes, metricas, anexos, padrao, abrir, mover, arquivar, onDragStart, onDragEnd, fantasma }: {
  c: Conteudo; versoes: Resultado[]; metricas: Metrica[]; anexos: number; padrao: Padrao | null | undefined; abrir: () => void; mover: (e: Etapa) => void; arquivar: () => void;
  onDragStart: () => void; onDragEnd: () => void; fantasma: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const ult = versoes[0];
  const m = metricas[metricas.length - 1];
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.serie); e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      className={cn("group relative cursor-grab active:cursor-grabbing", fantasma && "opacity-40")}
    >
      <Cartao className="p-3 space-y-2 bg-surface-2 shadow-none hover:border-brand/40 transition-colors">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium tracking-wide text-ink-2">{c.codigo ?? "Reel"}</span>
          {c.etiquetas?.map((t) => <Etiqueta key={t} nome={t} />)}
          <button onClick={(e) => { e.stopPropagation(); setMenu(!menu); }} aria-label="Ações" className="ml-auto grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink cursor-pointer">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
        <button onClick={abrir} title={`${nomeConteudo(c)} · atualizado ${quando(c.atualizado_em)}`} className="block w-full text-left cursor-pointer group/t">
          <span className="block text-[15px] font-semibold leading-snug text-ink group-hover/t:text-brand">{partes(c).formato}</span>
          {partes(c).tema && <span className="mt-1 block text-[13px] leading-snug text-ink-2">{partes(c).tema}</span>}
        </button>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {versoes.length > 0 && <span className="rounded-md border border-line px-1.5 text-[11px] leading-5 text-ink-2">v{ult?.versao}</span>}
          {anexos > 0 && <span title={`${anexos} anexo(s)`} className="inline-flex items-center gap-0.5 text-[11px] text-ink-2"><Paperclip className="size-3.5" />{anexos > 1 ? anexos : ""}</span>}
          {!c.etiquetas?.includes("teste") && <SeloEvidencia padrao={padrao} curto />}
        </div>
        {c.etapa === "publicado" && (
          <div className="flex items-center gap-3 rounded-lg bg-surface-2/70 px-2.5 py-1.5 text-[12px]">
            {c.url_publicacao ? <a href={c.url_publicacao} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-brand"><Instagram className="size-3.5" />Reel</a> : <span className="text-warn">Sem link</span>}
            {m && <span className="ml-auto text-muted">♥ {num(m.curtidas)} · 💬 {num(m.comentarios)}</span>}
          </div>
        )}
      </Cartao>
      {menu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
          <Cartao className="absolute right-1 top-9 z-30 w-52 p-1.5 shadow-lg">
            <p className="px-2.5 pt-1 pb-1.5 text-[11px] uppercase tracking-wide text-muted">Mover para</p>
            {ETAPAS.map((e) => (
              <button key={e.id} disabled={e.id === c.etapa} onClick={() => { setMenu(false); mover(e.id); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-2 disabled:opacity-40 cursor-pointer">
                <span className={cn("size-2 rounded-full etapa-ponto", e.cor)} />{e.nome}{e.id === c.etapa && <Check className="ml-auto size-3.5" />}
              </button>
            ))}
            <div className="my-1 border-t border-line" />
            <button onClick={() => { setMenu(false); abrir(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-surface-2 cursor-pointer"><Eye className="size-3.5" />Abrir</button>
            <button onClick={() => { setMenu(false); arquivar(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-bad hover:bg-bad-soft cursor-pointer"><Archive className="size-3.5" />Mover para a lixeira</button>
          </Cartao>
        </>
      )}
    </div>
  );
}

function NovaIdeia({ aberto, fechar, setErro }: { aberto: boolean; fechar: () => void; setErro: (e: string | null) => void }) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  return (
    <Modal titulo="Nova ideia" aberto={aberto} fechar={fechar}>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault(); setOcupado(true);
        const r = await chamar({ acao: "conteudo_criar", titulo, conteudo: texto ? `# ${titulo}\n\n${texto}` : "", tipo: "roteiro", etapa: "ideia" }, setErro);
        setOcupado(false);
        if (!r.erro) { setTitulo(""); setTexto(""); fechar(); }
      }}>
        <input autoFocus required placeholder="Título da ideia" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} />
        <CampoTexto rows={4} placeholder="Anotações (opcional)" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <p className="text-[12px] text-muted">Para virar roteiro, peça no Chat ou escreva você mesmo abrindo o cartão.</p>
        <div className="flex justify-end gap-2"><Botao type="button" variante="fantasma" onClick={fechar}>Cancelar</Botao><Botao variante="primario" disabled={ocupado || !titulo.trim()}>Criar</Botao></div>
      </form>
    </Modal>
  );
}

function PedirLink({ c, fechar, confirmar }: { c: Conteudo | null; fechar: () => void; confirmar: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <Modal titulo="Marcar como publicado" aberto={!!c} fechar={fechar}>
      <div className="space-y-3">
        <p className="text-[14px] text-muted">Cole o link do Reel para acompanhar curtidas e comentários. Dá para adicionar depois.</p>
        <input autoFocus placeholder="https://www.instagram.com/reel/…" value={url} onChange={(e) => setUrl(e.target.value)} className={campo} />
        <div className="flex justify-end gap-2">
          <Botao variante="fantasma" onClick={() => confirmar("")}>Sem link por enquanto</Botao>
          <Botao variante="primario" disabled={!url.trim()} onClick={() => confirmar(url.trim())}><Check className="size-4" />Publicado</Botao>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================ Detalhe */
function Detalhe({ c, todos, versoes, metricas, voltar, abrir, mover, rotuloVoltar = "Conteúdos" }: {
  c: Conteudo; todos: Conteudo[]; versoes: Resultado[]; metricas: Metrica[]; voltar: () => void; abrir: (serie: string) => void;
  mover: (c: Conteudo, e: Etapa, extra?: Record<string, unknown>) => Promise<void>; rotuloVoltar?: string;
}) {
  const documento = c.classe === "documento";
  const anexos = todos.filter((x) => x.anexo_de === c.serie && !x.arquivado_em);
  const pai = c.anexo_de ? todos.find((x) => x.serie === c.anexo_de) : undefined;
  const pecas = todos.filter((x) => x.classe !== "documento" && !x.arquivado_em && x.serie !== c.serie && !x.anexo_de);
  const { linhas: historico } = useTabela<Historico>("conteudo_historico", { ordem: "criado_em", filtro: { coluna: "serie", valor: c.serie }, limite: 50 });
  const { linhas: listaPadroes } = useTabela<Padrao>("padroes", { ordem: "razao_vs_mediana", limite: 200 });
  const padroes = useMemo(() => new Map(listaPadroes.map((x) => [x.id, x])), [listaPadroes]);
  const padrao = c.padrao_id ? padroes.get(c.padrao_id) : null;
  const [selId, setSelId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [url, setUrl] = useState(c.url_publicacao ?? "");
  const sel = versoes.find((v) => v.id === selId) ?? versoes[0];

  function editar() { setTitulo(sel?.titulo ?? c.titulo); setTexto(sel?.conteudo ?? ""); setPrevia(false); setEditando(true); }
  async function salvar() {
    setOcupado(true);
    const r = await chamar({ acao: "conteudo_editar", serie: c.serie, titulo, conteudo: texto }, setErro);
    setOcupado(false);
    if (!r.erro) { setEditando(false); setSelId(null); }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-line bg-surface/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-2 px-4 py-3 md:px-8">
          <Botao variante="fantasma" tamanho="sm" className="-ml-2" onClick={voltar}><ChevronLeft className="size-4" />{rotuloVoltar}</Botao>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!editando && sel && (
              <>
                <Botao tamanho="sm" onClick={async () => { await navigator.clipboard.writeText(sel.conteudo); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}>
                  {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copiado ? "Copiado" : "Copiar"}
                </Botao>
                <Botao tamanho="sm" onClick={editar}><PencilLine className="size-3.5" />Editar</Botao>
              </>
            )}
            {c.arquivado_em
              ? <Botao tamanho="sm" onClick={() => chamar({ acao: "conteudo_restaurar", serie: c.serie }, setErro)}><ArchiveRestore className="size-3.5" />Restaurar</Botao>
              : <Botao tamanho="sm" variante="perigo" onClick={async () => { const r = await chamar({ acao: "conteudo_arquivar", serie: c.serie }, setErro); if (!r.erro) voltar(); }}><Archive className="size-3.5" />Lixeira</Botao>}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1100px] gap-8 px-4 py-6 md:px-8 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            {!editando && (
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  {documento ? <Selo tom="info"><Library className="size-3" />Biblioteca</Selo> : <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium leading-5 etapa-suave", ETAPAS.find((e) => e.id === c.etapa)?.cor)}><span className="size-1.5 rounded-full etapa-ponto" />{nomeEtapa(c.etapa)}</span>}
                  {documento && <Selo>{TIPO_RESULTADO[c.tipo] ?? c.tipo}</Selo>}
                  {!documento && !c.etiquetas?.includes("teste") && <SeloEvidencia padrao={c.padrao_id ? padroes.get(c.padrao_id) : null} />}
                  {c.etiquetas?.map((t) => <Etiqueta key={t} nome={t} />)}
                  {c.arquivado_em && <Selo tom="erro">Na lixeira</Selo>}
                </div>
                {pai && (
                  <button onClick={() => abrir(pai.serie)} className="mt-2 inline-flex items-center gap-1 text-[13px] text-brand hover:underline cursor-pointer">
                    <Paperclip className="size-3.5" />Anexo de {nomeConteudo(pai)}
                  </button>
                )}
                <h1 className="mt-2 font-display text-[36px] leading-[1.08]">{nomeConteudo(c)}</h1>
              </div>
            )}
            {erro && <Aviso className="mb-4">{erro}</Aviso>}
            {editando ? (
              <div className="space-y-3">
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={cn(campo, "h-11 text-[16px] font-medium")} />
                <div className="flex rounded-xl bg-surface-2 p-0.5 w-fit">
                  <button onClick={() => setPrevia(false)} className={cn("rounded-[10px] px-3 py-1 text-[13px] font-medium cursor-pointer", !previa ? "bg-surface shadow-sm" : "text-muted")}>Escrever</button>
                  <button onClick={() => setPrevia(true)} className={cn("rounded-[10px] px-3 py-1 text-[13px] font-medium cursor-pointer", previa ? "bg-surface shadow-sm" : "text-muted")}>Pré-visualizar</button>
                </div>
                {previa
                  ? <Cartao className="p-5"><Md>{texto}</Md></Cartao>
                  : <CampoTexto value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-[60vh] resize-y font-mono text-[13px] leading-relaxed" />}
                <div className="flex items-center justify-end gap-2">
                  <span className="mr-auto text-[12px] text-muted">Salvar cria a v{(versoes[0]?.versao ?? 0) + 1}. As versões anteriores ficam guardadas.</span>
                  <Botao variante="fantasma" onClick={() => setEditando(false)}>Cancelar</Botao>
                  <Botao variante="primario" disabled={ocupado} onClick={salvar}><Check className="size-4" />{ocupado ? "Salvando…" : "Salvar nova versão"}</Botao>
                </div>
              </div>
            ) : sel ? (
              <>
                {versoes.length > 1 && (
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl bg-surface-2 p-0.5">
                      {versoes.slice().reverse().map((v) => (
                        <button key={v.id} onClick={() => setSelId(v.id)} className={cn("rounded-[10px] px-3 py-1 text-[13px] font-medium cursor-pointer", v.id === sel.id ? "bg-surface shadow-sm" : "text-muted hover:text-ink")}>v{v.versao}</button>
                      ))}
                    </div>
                    <span className="text-[12px] text-muted">por {sel.autor} · {quando(sel.criado_em)}</span>
                    {sel.id !== versoes[0].id && <Selo tom="alerta">Versão antiga</Selo>}
                  </div>
                )}
                <Md>{sel.conteudo}</Md>
              </>
            ) : <Vazio icone={<FileText className="size-5" />} titulo="Sem texto ainda" />}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {(padrao || (!documento && !c.etiquetas?.includes("teste"))) && (
            <Cartao className="p-4 space-y-2.5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Padrão do Radar</p>
              <SeloEvidencia padrao={padrao} />
              {padrao ? (
                <>
                  <p className="text-[14px] font-medium leading-snug">{padrao.nome}</p>
                  {padrao.mecanismo && <p className="text-[13px] text-muted leading-relaxed">{padrao.mecanismo}</p>}
                  <p className="text-[12px] text-muted">
                    {Number(padrao.razao_vs_mediana).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x a mediana de curtidas de @{padrao.perfil}
                    {padrao.razao_comentarios != null && <> · {Number(padrao.razao_comentarios).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x em comentários</>}
                  </p>
                  <a href={padrao.reel_origem} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-brand hover:underline"><Instagram className="size-3.5" />Ver o Reel de origem</a>
                  <p className="text-[11px] text-muted">Um Reel só; curtidas não são visualizações; a causa do desempenho é hipótese.</p>
                </>
              ) : (
                <p className="text-[13px] text-muted leading-relaxed">Nenhum padrão do Radar com 2x ou mais a mediana sustenta este Reel. Decida se grava assim, reescreve sobre um padrão ou descarta.</p>
              )}
            </Cartao>
            )}
            {!documento && !c.anexo_de && (
            <Cartao className="p-4 space-y-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Etapa</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ETAPAS.map((e) => (
                  <button key={e.id} onClick={() => e.id !== c.etapa && mover(c, e.id)}
                    className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] text-left cursor-pointer transition", e.cor,
                      e.id === c.etapa ? "etapa-suave font-semibold" : "border-line hover:bg-surface-2")}>
                    <span className={cn("size-2 rounded-full etapa-ponto", e.cor)} />{e.nome}
                  </button>
                ))}
              </div>
            </Cartao>
            )}

            {anexos.length > 0 && (
              <Cartao className="p-4">
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted"><Paperclip className="size-3.5" />Anexos</p>
                <ul className="space-y-1">
                  {anexos.map((a) => (
                    <li key={a.serie}>
                      <button onClick={() => abrir(a.serie)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-surface-2 cursor-pointer">
                        <FileText className="size-3.5 shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate">{nomeConteudo(a)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Cartao>
            )}

            <Organizar c={c} pecas={pecas} setErro={setErro} />

            {!documento && (c.etapa === "publicado" || c.url_publicacao) && (
              <Cartao className="p-4 space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Publicação</p>
                <div className="flex gap-2">
                  <input placeholder="Link do Reel" value={url} onChange={(e) => setUrl(e.target.value)} className={cn(campo, "h-9 text-[13px]")} />
                  <Botao tamanho="icone" title="Salvar link" disabled={url === (c.url_publicacao ?? "")} onClick={() => chamar({ acao: "conteudo_publicacao", serie: c.serie, url_publicacao: url, perfil_instagram: c.perfil_instagram }, setErro)}><Link2 className="size-4" /></Botao>
                </div>
                <ResumoMetricas c={c} metricas={metricas} setErro={setErro} />
              </Cartao>
            )}

            <Cartao className="p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted"><History className="size-3.5" />Histórico</p>
              <ol className="space-y-2.5">
                {historico.length === 0 && <li className="text-[13px] text-muted">Criado {quando(c.criado_em)}</li>}
                {historico.map((h) => (
                  <li key={h.id} className="text-[13px] leading-snug">
                    <span className="font-medium">{h.de ? `${nomeEtapa(h.de)} → ` : ""}{nomeEtapa(h.para)}</span>
                    <span className="block text-[12px] text-muted">{h.por ?? "—"} · {quando(h.criado_em)}</span>
                  </li>
                ))}
              </ol>
            </Cartao>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Etiqueta({ nome, remover }: { nome: string; remover?: () => void }) {
  const teste = nome === "teste";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", teste ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted")}>
      <Tag className="size-2.5" />{nome}
      {remover && <button onClick={remover} aria-label={`Tirar etiqueta ${nome}`} className="-mr-0.5 cursor-pointer hover:text-ink"><X className="size-3" /></button>}
    </span>
  );
}

/** Onde o conteúdo fica (quadro ou Biblioteca), de quem é anexo e suas etiquetas. */
function Organizar({ c, pecas, setErro }: { c: Conteudo; pecas: Conteudo[]; setErro: (e: string | null) => void }) {
  const [nova, setNova] = useState("");
  const etiquetas = c.etiquetas ?? [];
  const salvarEtiquetas = (lista: string[]) => chamar({ acao: "conteudo_etiquetas", serie: c.serie, etiquetas: lista }, setErro);
  return (
    <Cartao className="p-4 space-y-4">
      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Onde fica</p>
        <div className="flex rounded-xl bg-surface-2 p-0.5">
          {([["peca", "Quadro (peça)"], ["documento", "Biblioteca"]] as const).map(([v, nome]) => (
            <button key={v} onClick={() => c.classe !== v && chamar({ acao: "conteudo_classe", serie: c.serie, classe: v }, setErro)}
              className={cn("flex-1 rounded-[10px] px-2 py-1 text-[12px] font-medium cursor-pointer", c.classe === v ? "bg-surface shadow-sm" : "text-muted hover:text-ink")}>{nome}</button>
          ))}
        </div>
        <label className="block space-y-1">
          <span className="text-[12px] text-muted">Anexo de</span>
          <select value={c.anexo_de ?? ""} onChange={(e) => chamar({ acao: "conteudo_anexar", serie: c.serie, anexo_de: e.target.value || null }, setErro)}
            className={cn(campo, "h-9 text-[13px]")}>
            <option value="">Nenhum (item solto)</option>
            {pecas.map((p) => <option key={p.serie} value={p.serie}>{nomeConteudo(p)}</option>)}
          </select>
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Etiquetas</p>
        {etiquetas.length > 0 && <div className="flex flex-wrap gap-1.5">{etiquetas.map((t) => <Etiqueta key={t} nome={t} remover={() => salvarEtiquetas(etiquetas.filter((x) => x !== t))} />)}</div>}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (nova.trim()) { salvarEtiquetas([...etiquetas, nova]); setNova(""); } }}>
          <input placeholder="Nova etiqueta" value={nova} onChange={(e) => setNova(e.target.value)} className={cn(campo, "h-9 text-[13px]")} />
          <Botao tamanho="icone" title="Adicionar etiqueta" disabled={!nova.trim()}><Plus className="size-4" /></Botao>
        </form>
      </div>
    </Cartao>
  );
}

/* ================================================================ Biblioteca */
const FILTROS = [["", "Tudo"], ["pauta", "Pautas"], ["pesquisa", "Pesquisas"], ["relatorio", "Relatórios"], ["roteiro", "Roteiros"], ["outro", "Outros"]] as const;

export function Biblioteca() {
  const { conteudos, carregando, versoes, metricas } = useDados();
  const [aberto, setAberto] = useState<string | null>(null);
  const [tipo, setTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const docs = conteudos.filter((c) => c.classe === "documento" && !c.arquivado_em)
    .sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em));
  const contagem = (t: string) => docs.filter((d) => !t || d.tipo === t).length;
  const lista = docs.filter((d) => (!tipo || d.tipo === tipo) && (!busca || nomeConteudo(d).toLowerCase().includes(busca.toLowerCase())));

  async function mover(c: Conteudo, etapa: Etapa, extra: Record<string, unknown> = {}) {
    await chamar({ acao: "conteudo_mover", serie: c.serie, etapa, ...extra }, setErro);
  }

  const sel = conteudos.find((c) => c.serie === aberto);
  if (sel) return <Detalhe c={sel} todos={conteudos} versoes={versoes.get(sel.serie) ?? []} metricas={metricas.get(sel.serie) ?? []} voltar={() => setAberto(null)} abrir={setAberto} mover={mover} rotuloVoltar="Biblioteca" />;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1000px] px-4 pb-10 md:px-8">
        <div className="pt-6 pb-4">
          <h1 className="font-display text-[34px] leading-[1.1]">Biblioteca</h1>
          <p className="mt-1 text-[14px] text-ink-2">Pautas, pesquisas, relatórios e fichas de apoio. O que é peça de conteúdo fica no quadro.</p>
        </div>
        {erro && <Aviso className="mb-3">{erro}</Aviso>}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FILTROS.filter(([t]) => !t || contagem(t) > 0).map(([t, nome]) => (
              <button key={t} onClick={() => setTipo(t)} className={cn("rounded-full border px-3 py-1 text-[13px] font-medium cursor-pointer transition",
                tipo === t ? "border-brand/50 bg-brand-soft text-brand" : "border-line text-muted hover:text-ink")}>
                {nome} <span className="tabular-nums opacity-70">{contagem(t)}</span>
              </button>
            ))}
          </div>
          <label className="relative ml-auto w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input placeholder="Buscar pelo título" value={busca} onChange={(e) => setBusca(e.target.value)} className={cn(campo, "h-9 pl-9 text-[13px]")} />
          </label>
        </div>
        {carregando ? <Esqueleto className="h-40" /> : lista.length === 0 ? (
          <Cartao><Vazio icone={<Library className="size-5" />} titulo={docs.length ? "Nada com esse filtro" : "Biblioteca vazia"}>Pautas, pesquisas e relatórios que os agentes entregarem aparecem aqui.</Vazio></Cartao>
        ) : (
          <Cartao className="divide-y divide-line">
            {lista.map((d) => {
              const ult = versoes.get(d.serie)?.[0];
              const pai = d.anexo_de ? conteudos.find((x) => x.serie === d.anexo_de) : undefined;
              return (
                <button key={d.serie} onClick={() => setAberto(d.serie)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2/60 cursor-pointer md:px-5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><FileText className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{nomeConteudo(d)}</p>
                    <p className="truncate text-[12px] text-muted">
                      {TIPO_RESULTADO[d.tipo] ?? d.tipo}{ult && ` · v${ult.versao} · ${ult.autor}`} · {quando(d.atualizado_em)}
                    </p>
                    {pai && <p className="truncate text-[12px] text-brand"><Paperclip className="inline size-3" /> Anexo de {nomeConteudo(pai)}</p>}
                  </div>
                  {d.etiquetas?.map((t) => <Etiqueta key={t} nome={t} />)}
                </button>
              );
            })}
          </Cartao>
        )}
      </div>
    </div>
  );
}

export function ResumoMetricas({ c, metricas, setErro }: { c: Conteudo; metricas: Metrica[]; setErro: (e: string | null) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const ult = metricas[metricas.length - 1];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-surface-2/70 px-3 py-2"><p className="text-[11px] text-muted">Curtidas</p><p className="text-[18px] font-semibold tabular-nums">{num(ult?.curtidas)}</p></div>
        <div className="rounded-xl bg-surface-2/70 px-3 py-2"><p className="text-[11px] text-muted">Comentários</p><p className="text-[18px] font-semibold tabular-nums">{num(ult?.comentarios)}</p></div>
      </div>
      <Grafico metricas={metricas} />
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted flex-1">{ult ? `Atualizado ${quando(ult.coletado_em)}` : "Ainda sem leitura"}</span>
        <Botao tamanho="sm" disabled={ocupado || !c.url_publicacao} onClick={async () => { setOcupado(true); await chamar({ acao: "metricas_coletar", serie: c.serie }, setErro); setOcupado(false); }}>
          <RefreshCw className={cn("size-3.5", ocupado && "animate-spin")} />Atualizar
        </Botao>
      </div>
    </div>
  );
}

/** Linha simples de evolução (curtidas e comentários). */
export function Grafico({ metricas, altura = 64 }: { metricas: Metrica[]; altura?: number }) {
  if (metricas.length < 2) return <div className="grid h-12 place-items-center rounded-xl border border-dashed border-line text-[11px] text-muted"><span className="inline-flex items-center gap-1"><BarChart3 className="size-3.5" />A evolução aparece a partir da 2ª leitura</span></div>;
  const w = 280, h = altura, p = 4;
  const serie = (k: "curtidas" | "comentarios") => {
    const vs = metricas.map((m) => m[k] ?? 0);
    const max = Math.max(1, ...vs), min = Math.min(...vs);
    return vs.map((v, i) => `${p + (i * (w - 2 * p)) / (vs.length - 1)},${h - p - ((v - min) / Math.max(1, max - min)) * (h - 2 * p)}`).join(" ");
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Evolução de curtidas e comentários">
      <polyline points={serie("curtidas")} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={serie("comentarios")} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="3 3" strokeLinejoin="round" />
    </svg>
  );
}

export { useDados };

function SeloEvidencia({ padrao, curto }: { padrao: Padrao | null | undefined; curto?: boolean }) {
  const f = forcaEvidencia(padrao);
  const rotulo = curto ? f.rotulo.replace(/^Evidência /, "").replace(/x$/, "×") : f.rotulo;
  return <span className={cn("evid", f.classe, curto && "evid-cheio")} title={padrao ? `Evidência do Radar: ${padrao.nome} · @${padrao.perfil}` : "Sem padrão do Radar com evidência"}>{!curto && <TrendingUp className="size-3" />}{rotulo}</span>;
}

/** "Formato · Tema" vira título curto (formato) + subtítulo (tema), como no cartão do mockup. */
function partes(c: Conteudo): { formato: string; tema: string } {
  if (c.etiquetas?.includes("teste") || !c.codigo) return { formato: nomeConteudo(c), tema: "" };
  const [formato, ...resto] = c.titulo.split(" · ");
  return { formato, tema: resto.join(" · ") };
}
