"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root } from "mdast";

/**
 * Falas da Rafa: tudo entre «aspas angulares» vira um destaque de fala,
 * no texto corrido e dentro de tabelas. É a marcação padrão dos roteiros.
 */
function remarkFalas() {
  return (tree: Root) => {
    findAndReplace(tree, [[/«([^»]+)»/g, (_m: string, fala: string) => ({
      type: "emphasis",
      data: { hName: "span", hProperties: { className: ["fala"] } },
      children: [{ type: "text", value: fala.trim() }],
    })]]);
  };
}

const componentes = {
  table: ({ node: _n, ...p }: React.ComponentProps<"table"> & { node?: unknown }) => <div className="tabela"><table {...p} /></div>,
  a: ({ node: _n, ...p }: React.ComponentProps<"a"> & { node?: unknown }) => <a {...p} target="_blank" rel="noreferrer" />,
};

function Bloco({ texto }: { texto: string }) {
  return <Markdown remarkPlugins={[remarkGfm, remarkBreaks, remarkFalas]} components={componentes}>{texto}</Markdown>;
}

/** Tudo a partir de "## Para o Gil" é bastidor técnico: fica recolhido para a leitura da Rafa ficar limpa. */
const PARA_O_GIL = /^##\s+Para o Gil\b[^\n]*\n?/m;

/** Markdown com tabelas, listas de tarefas e riscado (GFM). Tabelas rolam na horizontal em telas estreitas. */
export default function Md({ children, className = "md" }: { children: string; className?: string }) {
  const m = children.match(PARA_O_GIL);
  if (!m || m.index === undefined) return <div className={className}><Bloco texto={children} /></div>;
  return (
    <div className={className}>
      <Bloco texto={children.slice(0, m.index)} />
      <details className="para-gil">
        <summary>Para o Gil · detalhes técnicos</summary>
        <div className="para-gil-corpo"><Bloco texto={children.slice(m.index + m[0].length)} /></div>
      </details>
    </div>
  );
}
