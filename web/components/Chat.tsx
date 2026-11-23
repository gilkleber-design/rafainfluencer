"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, MessageSquarePlus, MessagesSquare, Paperclip, Sparkles, X, CircleCheck } from "lucide-react";
import Md from "@/components/Md";
import { ponte, supabase } from "@/lib/supabase";
import { useTabela } from "@/lib/useTabela";
import type { Conversa, Mensagem } from "@/lib/tipos";
import { Aviso, Botao, Esqueleto, Selo } from "@/components/ui";
import { Avatar, ESTADO_CONVERSA, hora, infoAgente, quando } from "@/components/identidade";
import { cn } from "@/lib/cn";

const SUGESTOES = [
  "Crie o roteiro de um Reels de maquiagem rápida para o dia a dia",
  "Quais tarefas estão em andamento?",
  "Sugira 5 pautas para a próxima semana",
];

export default function Chat({ conversaId, setConversaId }: { conversaId: string | null; setConversaId: (id: string | null) => void }) {
  const { linhas: conversas, carregando: carregandoLista } = useTabela<Conversa>("conversas", { ordem: "atualizado_em", limite: 50 });
  const { linhas: mensagens, carregando: carregandoMsgs } = useTabela<Mensagem>("mensagens", {
    ordem: "criado_em", asc: true, filtro: { coluna: "conversa_id", valor: conversaId ?? "00000000-0000-0000-0000-000000000000" }, limite: 500,
  });
  const atual = conversas.find((c) => c.id === conversaId) ?? null;
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [listaAberta, setListaAberta] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [mensagens.length, atual?.estado]);
  useEffect(() => {
    const c = campo.current; if (!c) return;
    c.style.height = "auto"; c.style.height = Math.min(c.scrollHeight, 200) + "px";
  }, [texto]);

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!texto.trim() && !arquivos.length) return;
    setEnviando(true);
    setErro(null);
    try {
      const anexos = [];
      for (const f of arquivos) {
        const caminho = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase().storage.from("anexos").upload(caminho, f, { contentType: f.type || undefined });
        if (error) throw new Error(`Falha ao enviar ${f.name}: ${error.message}`);
        anexos.push({ nome: f.name, caminho, tipo: f.type || "arquivo", tamanho: f.size });
      }
      const r = await ponte({ acao: "mensagem", conversa_id: conversaId, texto, anexos });
      if (r.erro) throw new Error(r.erro);
      if (r.conversa_id && r.conversa_id !== conversaId) setConversaId(r.conversa_id);
      setTexto("");
      setArquivos([]);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const escolher = (id: string | null) => { setConversaId(id); setListaAberta(false); };
  const estado = atual ? ESTADO_CONVERSA[atual.estado] ?? { nome: atual.estado, tom: "neutro" as const } : null;
  const pausada = atual?.estado === "pausada_orcamento";

  const lista = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="font-display text-[24px] leading-tight">Conversas</h2>
        <Botao variante="suave" tamanho="sm" onClick={() => escolher(null)}><MessageSquarePlus className="size-4" />Nova</Botao>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {carregandoLista && [0, 1, 2].map((i) => <Esqueleto key={i} className="mx-2 my-2 h-12" />)}
        {!carregandoLista && conversas.length === 0 && <p className="px-3 py-6 text-sm text-muted">Nenhuma conversa ainda. Comece uma ao lado.</p>}
        {conversas.map((c) => {
          const e = ESTADO_CONVERSA[c.estado];
          return (
            <button
              key={c.id}
              onClick={() => escolher(c.id)}
              className={cn("w-full rounded-xl px-3 py-2.5 text-left transition cursor-pointer", c.id === conversaId ? "bg-brand-soft" : "hover:bg-surface-2")}
            >
              <div className="flex items-center gap-2">
                <span className={cn("truncate text-[14px] font-medium flex-1", c.id === conversaId && "text-brand")}>{c.titulo}</span>
                {c.estado === "trabalhando" && <span className="size-2 rounded-full bg-info animate-pulse" />}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                <span>{quando(c.atualizado_em)}</span><span>·</span><span>{e?.nome ?? c.estado}</span><span>·</span><span>US$ {(c.custo_centavos / 100).toFixed(2)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden md:block w-[290px] shrink-0 border-r border-line bg-surface/60">{lista}</aside>

      {listaAberta && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setListaAberta(false)} />
          <div className="relative w-[86%] max-w-xs bg-surface shadow-xl">
            <Botao variante="fantasma" tamanho="icone" className="absolute right-2 top-3" aria-label="Fechar" onClick={() => setListaAberta(false)}><X className="size-4" /></Botao>
            {lista}
          </div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface/70 px-4 py-3 backdrop-blur md:px-6">
          <Botao variante="fantasma" tamanho="icone" className="md:hidden -ml-2" aria-label="Conversas" onClick={() => setListaAberta(true)}><ChevronLeft className="size-5" /></Botao>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[22px] leading-tight">{atual?.titulo ?? "Nova conversa"}</h1>
            <p className="text-[12px] text-muted">Command Center · delega para Produção</p>
          </div>
          {estado && <Selo tom={estado.tom} ponto>{estado.nome}</Selo>}
          {atual && <span className="hidden sm:inline text-[12px] text-muted tabular-nums">US$ {(atual.custo_centavos / 100).toFixed(2)}</span>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 md:px-6">
            {!conversaId && (
              <div className="flex flex-col items-center pt-[8vh] text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-brand text-brand-ink"><Sparkles className="size-6" /></div>
                <h2 className="mt-4 font-display text-[34px] leading-[1.1]">O que vamos criar hoje?</h2>
                <p className="mt-1.5 max-w-md text-[15px] text-muted">O Command Center registra a tarefa, delega à Produção e traz o resultado para você aprovar.</p>
                <div className="mt-6 grid w-full max-w-lg gap-2">
                  {SUGESTOES.map((s) => (
                    <button key={s} onClick={() => { setTexto(s); campo.current?.focus(); }} className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-[14px] hover:border-brand/40 hover:bg-brand-soft/40 transition cursor-pointer">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {conversaId && carregandoMsgs && [0, 1].map((i) => <Esqueleto key={i} className={cn("h-16 w-2/3", i % 2 === 0 && "self-end")} />)}

            {mensagens.map((m) => <Bolha key={m.id} m={m} />)}

            {atual?.estado === "trabalhando" && (
              <div className="flex items-center gap-3">
                <Avatar nome="Command Center" tipo="command_center" />
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-sm text-muted">
                  <span className="pontinhos flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 rounded-full bg-muted" />)}</span>
                  Trabalhando na sua solicitação
                </div>
              </div>
            )}
            {atual?.estado === "erro" && atual.ultimo_erro && <Aviso>Algo deu errado: {atual.ultimo_erro}</Aviso>}
            {pausada && <Aviso className="bg-warn-soft text-warn">Esta conversa atingiu o teto de gasto por sessão. Comece uma nova conversa para continuar.</Aviso>}
            <div ref={fim} />
          </div>
        </div>

        <form onSubmit={enviar} className="border-t border-line bg-surface/70 px-4 py-3 backdrop-blur md:px-6">
          <div className="mx-auto max-w-3xl">
            {erro && <Aviso className="mb-2">{erro}</Aviso>}
            {arquivos.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {arquivos.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-[12px]">
                    <Paperclip className="size-3" />{f.name}
                    <button type="button" aria-label="Remover" className="cursor-pointer text-muted hover:text-ink" onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))}><X className="size-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-1.5 pl-2 shadow-sm focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand/50">
              <label className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink" title="Anexar arquivo ou vídeo">
                <Paperclip className="size-[18px]" />
                <input type="file" multiple hidden onChange={(e) => setArquivos([...arquivos, ...(e.target.files ?? [])])} />
              </label>
              <textarea
                ref={campo}
                value={texto}
                rows={1}
                disabled={pausada}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={pausada ? "Conversa pausada" : "Escreva para o Command Center…"}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(); } }}
                className="max-h-[200px] min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] placeholder:text-muted/80 focus:outline-none"
              />
              <Botao variante="primario" tamanho="icone" aria-label="Enviar" disabled={enviando || pausada || (!texto.trim() && !arquivos.length)}>
                <ArrowUp className="size-[18px]" />
              </Botao>
            </div>
            <p className="mt-1.5 hidden text-center text-[11px] text-muted sm:block">Enter envia · Shift+Enter quebra a linha</p>
          </div>
        </form>
      </section>
    </div>
  );
}

function Bolha({ m }: { m: Mensagem }) {
  if (m.autor === "sistema") {
    return (
      <div className="flex justify-center">
        <div role="status" className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
          <CircleCheck className="size-5 shrink-0 text-ok" aria-hidden />
          <span className="min-w-0 flex-1 text-[13px] font-medium text-ink">{m.texto}</span>
          <span className="text-[11px] text-muted tabular-nums">{hora(m.criado_em)}</span>
        </div>
      </div>
    );
  }
  if (m.autor === "humano") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand px-4 py-2.5 text-brand-ink shadow-sm">
          <Md className="md md-compacto md-invertido">{limparAutor(m.texto)}</Md>
          {m.anexos?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.anexos.map((a) => <span key={a.caminho} className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[12px]"><Paperclip className="size-3" />{a.nome}</span>)}
            </div>
          )}
        </div>
        <span className="text-[11px] text-muted">{m.autor_nome ?? "Você"} · {hora(m.criado_em)}</span>
      </div>
    );
  }
  const nome = m.autor === "command_center" ? "Command Center" : m.autor_nome ?? "Agente";
  const papel = infoAgente(m.autor === "command_center" ? "command center" : m.autor_nome).papel;
  return (
    <div className="flex gap-3">
      <Avatar nome={m.autor_nome} tipo={m.autor} />
      <div className="min-w-0 max-w-[88%]">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">{nome}</span>
          <span className="text-[11px] text-muted">{papel} · {hora(m.criado_em)}</span>
        </div>
        <div className={cn("rounded-2xl rounded-tl-md border px-4 py-3", m.autor === "agente" ? "border-dashed border-line bg-surface-2/50" : "border-line bg-surface")}>
          <Md className="md md-compacto">{m.texto}</Md>
        </div>
      </div>
    </div>
  );
}

/** A ponte prefixa "Fulano escreveu:" para o agente; no painel isso é redundante. */
function limparAutor(t: string) {
  return t.replace(/^[^\n]{1,60} escreveu:\n/, "");
}
