"use client";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { ponte, supabase } from "@/lib/supabase";
import { useTabela } from "@/lib/useTabela";
import type { Conversa, Mensagem } from "@/lib/tipos";

const ESTADO: Record<string, string> = {
  nova: "nova", ativa: "pronta", trabalhando: "trabalhando…", aguardando: "pronta",
  pausada_orcamento: "pausada (teto de gasto)", erro: "erro", encerrada: "encerrada",
};

export default function Chat({ conversaId, setConversaId }: { conversaId: string | null; setConversaId: (id: string | null) => void }) {
  const { linhas: conversas } = useTabela<Conversa>("conversas", { ordem: "atualizado_em", limite: 50 });
  const { linhas: mensagens } = useTabela<Mensagem>("mensagens", {
    ordem: "criado_em", asc: true, filtro: conversaId ? { coluna: "conversa_id", valor: conversaId } : { coluna: "conversa_id", valor: "00000000-0000-0000-0000-000000000000" }, limite: 500,
  });
  const atual = conversas.find((c) => c.id === conversaId) ?? null;
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens.length, atual?.estado]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div className="chat">
      <aside className="conversas">
        <button className="botao primario" onClick={() => setConversaId(null)}>Nova conversa</button>
        <ul>
          {conversas.map((c) => (
            <li key={c.id}>
              <button className={c.id === conversaId ? "ativa" : ""} onClick={() => setConversaId(c.id)}>
                <span className="titulo">{c.titulo}</span>
                <span className="meta">{ESTADO[c.estado] ?? c.estado} · US$ {(c.custo_centavos / 100).toFixed(2)}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="conversa">
        <div className="mensagens">
          {!conversaId && (
            <div className="vazio">
              <h2>Fale com o Command Center</h2>
              <p>Peça um roteiro, uma pauta ou o andamento de uma tarefa. Ele delega aos agentes e o resultado aparece aqui e em Resultados.</p>
            </div>
          )}
          {mensagens.map((m) => (
            <div key={m.id} className={`msg ${m.autor}`}>
              <div className="autor">{m.autor_nome ?? m.autor} · {new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              <div className="corpo"><Markdown>{m.texto}</Markdown></div>
              {m.anexos?.length > 0 && <div className="anexos">{m.anexos.map((a) => <span key={a.caminho}>📎 {a.nome}</span>)}</div>}
            </div>
          ))}
          {atual?.estado === "trabalhando" && <div className="msg sistema digitando">Command Center trabalhando…</div>}
          {atual?.ultimo_erro && atual.estado === "erro" && <div className="msg erro">Erro: {atual.ultimo_erro}</div>}
          <div ref={fim} />
        </div>

        <form className="entrada" onSubmit={enviar}>
          {erro && <div className="aviso">{erro}</div>}
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva para o Command Center…"
            rows={3}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enviar(e); }}
          />
          <div className="acoes">
            <label className="botao">
              Anexar
              <input type="file" multiple hidden onChange={(e) => setArquivos([...(e.target.files ?? [])])} />
            </label>
            {arquivos.length > 0 && <span className="meta">{arquivos.length} arquivo(s)</span>}
            <button className="botao primario" disabled={enviando || atual?.estado === "pausada_orcamento"}>
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
