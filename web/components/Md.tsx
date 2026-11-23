"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

/** Markdown com tabelas, listas de tarefas e riscado (GFM). Tabelas rolam na horizontal em telas estreitas. */
export default function Md({ children, className = "md" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkFalas]}
        components={{
          table: ({ node: _n, ...p }) => <div className="tabela"><table {...p} /></div>,
          a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noreferrer" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
