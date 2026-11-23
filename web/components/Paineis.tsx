"use client";
import { useMemo, useState } from "react";
import Md from "@/components/Md";
import { ponte } from "@/lib/supabase";
import { useTabela } from "@/lib/useTabela";
import type { Aprovacao, Resultado, Tarefa } from "@/lib/tipos";

const data = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const COLUNAS: { estado: string; nome: string }[] = [
  { estado: "pendente", nome: "Pendente" },
  { estado: "em_execucao", nome: "Em execução" },
  { estado: "aguardando_aprovacao", nome: "Aguardando aprovação" },
  { estado: "concluida", nome: "Concluída" },
  { estado: "falhou", nome: "Falhou" },
];

export function Tarefas() {
  const { linhas, carregando } = useTabela<Tarefa>("tarefas", { ordem: "atualizada_em" });
  if (carregando) return <p className="meta">Carregando…</p>;
  return (
    <div className="quadro">
      {COLUNAS.map((c) => {
        const itens = linhas.filter((t) => t.estado === c.estado);
        return (
          <div key={c.estado} className="coluna">
            <h3>{c.nome} <span className="meta">{itens.length}</span></h3>
            {itens.map((t) => (
              <div key={t.id} className="cartao">
                <div className="meta">{t.codigo} · {t.agente} · {data(t.atualizada_em)}</div>
                <strong>{t.titulo}</strong>
                {t.detalhe && <p>{t.detalhe}</p>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function Resultados({ abrirId }: { abrirId?: string | null }) {
  const { linhas } = useTabela<Resultado>("resultados", { ordem: "criado_em" });
  const [selId, setSelId] = useState<string | null>(abrirId ?? null);
  // Agrupa por série, mostrando a versão mais recente primeiro.
  const series = useMemo(() => {
    const m = new Map<string, Resultado[]>();
    for (const r of linhas) m.set(r.serie, [...(m.get(r.serie) ?? []), r].sort((a, b) => b.versao - a.versao));
    return [...m.values()].sort((a, b) => b[0].criado_em.localeCompare(a[0].criado_em));
  }, [linhas]);
  const sel = linhas.find((r) => r.id === selId) ?? series[0]?.[0] ?? null;
  const versoes = sel ? series.find((s) => s[0].serie === sel.serie) ?? [] : [];

  return (
    <div className="resultados">
      <aside>
        {series.length === 0 && <p className="meta">Nenhum resultado ainda.</p>}
        {series.map((s) => (
          <button key={s[0].serie} className={sel?.serie === s[0].serie ? "ativa" : ""} onClick={() => setSelId(s[0].id)}>
            <span className="titulo">{s[0].titulo}</span>
            <span className="meta">{s[0].tipo} · v{s[0].versao} · {data(s[0].criado_em)}</span>
          </button>
        ))}
      </aside>
      {sel && (
        <article className="documento">
          <div className="versoes">
            {versoes.map((v) => (
              <button key={v.id} className={v.id === sel.id ? "ativa" : ""} onClick={() => setSelId(v.id)}>v{v.versao}</button>
            ))}
            <span className="meta">por {sel.autor} · {data(sel.criado_em)}</span>
          </div>
          <Md>{sel.conteudo}</Md>
        </article>
      )}
    </div>
  );
}

export function Aprovacoes({ verResultado }: { verResultado: (id: string) => void }) {
  const { linhas } = useTabela<Aprovacao>("aprovacoes", { ordem: "criado_em" });
  const { linhas: resultados } = useTabela<Resultado>("resultados", { ordem: "criado_em" });
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pendentes = linhas.filter((a) => a.estado === "pendente");
  const decididas = linhas.filter((a) => a.estado !== "pendente").slice(0, 20);

  async function decidir(a: Aprovacao, estado: "aprovado" | "alteracao_pedida") {
    setOcupado(a.id);
    setErro(null);
    const r = await ponte({ acao: "decisao", aprovacao_id: a.id, estado, comentario: comentarios[a.id] ?? null });
    if (r.erro) setErro(r.erro);
    setOcupado(null);
  }

  const res = (id: string | null) => resultados.find((r) => r.id === id);

  return (
    <div className="aprovacoes">
      {erro && <div className="aviso">{erro}</div>}
      <h3>Pendentes ({pendentes.length})</h3>
      {pendentes.length === 0 && <p className="meta">Nada aguardando você.</p>}
      {pendentes.map((a) => {
        const r = res(a.resultado_id);
        return (
          <div key={a.id} className="cartao grande">
            <div className="meta">{data(a.criado_em)}</div>
            <strong>{a.pergunta}</strong>
            {r && (
              <>
                <button className="link" onClick={() => verResultado(r.id)}>Abrir “{r.titulo}” (v{r.versao})</button>
                <details><summary>Ver aqui</summary><Md className="md documento">{r.conteudo}</Md></details>
              </>
            )}
            <textarea
              placeholder="O que mudar? (obrigatório para pedir alteração)"
              value={comentarios[a.id] ?? ""}
              onChange={(e) => setComentarios({ ...comentarios, [a.id]: e.target.value })}
              rows={2}
            />
            <div className="acoes">
              <button className="botao primario" disabled={ocupado === a.id} onClick={() => decidir(a, "aprovado")}>Aprovar</button>
              <button className="botao" disabled={ocupado === a.id || !(comentarios[a.id] ?? "").trim()} onClick={() => decidir(a, "alteracao_pedida")}>Pedir alteração</button>
            </div>
          </div>
        );
      })}
      <h3>Decididas</h3>
      {decididas.map((a) => (
        <div key={a.id} className="cartao">
          <div className="meta">{a.estado === "aprovado" ? "Aprovado" : "Alteração pedida"} por {a.decidido_por} · {a.decidido_em && data(a.decidido_em)}</div>
          <span>{a.pergunta}</span>
          {a.comentario && <p>“{a.comentario}”</p>}
        </div>
      ))}
    </div>
  );
}
