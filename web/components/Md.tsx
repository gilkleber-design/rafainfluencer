"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown com tabelas, listas de tarefas e riscado (GFM). Tabelas rolam na horizontal em telas estreitas. */
export default function Md({ children, className = "md" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <Markdown
        remarkPlugins={[remarkGfm]}
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
