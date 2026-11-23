"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root } from "mdast";
import { Clock, ListChecks, MapPin, Package } from "lucide-react";

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

/** "### 1. Abertura (0 a 3 s)" vira passo numerado com círculo, como no mockup. */
function h3({ node: _n, children, ...p }: React.ComponentProps<"h3"> & { node?: unknown }) {
  const lista = Array.isArray(children) ? children : [children];
  const m = typeof lista[0] === "string" ? lista[0].match(/^(\d+)[.)]\s+(.*)$/s) : null;
  if (!m) return <h3 {...p}>{children}</h3>;
  return <h3 {...p} className="passo"><span className="passo-n" aria-hidden>{m[1]}</span><span><span className="sr-only">{m[1]}. </span>{m[2]}{lista.slice(1)}</span></h3>;
}

const componentes = {
  h3,
  table: ({ node: _n, ...p }: React.ComponentProps<"table"> & { node?: unknown }) => <div className="tabela"><table {...p} /></div>,
  a: ({ node: _n, ...p }: React.ComponentProps<"a"> & { node?: unknown }) => <a {...p} target="_blank" rel="noreferrer" />,
};

function Bloco({ texto }: { texto: string }) {
  return <Markdown remarkPlugins={[remarkGfm, remarkBreaks, remarkFalas]} components={componentes}>{texto}</Markdown>;
}

/** Linhas "**Duração:** …", "**Produtos:** …", "**Onde gravar:** …", "**Antes de começar:** …" do topo do roteiro. */
const FICHA = /^\*\*(Duração|Produtos?|Onde gravar|Antes de começar)\s*:\*\*\s*(.+)$/i;
const ICONES: Record<string, React.ElementType> = { duração: Clock, produto: Package, produtos: Package, "onde gravar": MapPin, "antes de começar": ListChecks };

/** Mostra a ficha do roteiro como cartão com ícones; o texto vem igual ao salvo (nada é reescrito). */
function ComFicha({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  const ini = linhas.findIndex((l) => FICHA.test(l.trim()));
  if (ini < 0) return <Bloco texto={texto} />;
  let fim = ini;
  for (let i = ini; i < linhas.length; i++) {
    if (FICHA.test(linhas[i].trim())) fim = i + 1;
    else if (linhas[i].trim() !== "") break;
  }
  const itens = linhas.slice(ini, fim).filter((l) => l.trim() !== "").map((l) => l.trim().match(FICHA)!);
  return (
    <>
      <Bloco texto={linhas.slice(0, ini).join("\n")} />
      <dl className="ficha">
        {itens.map(([, rotulo, valor]) => {
          const Icone = ICONES[rotulo.toLowerCase()] ?? ListChecks;
          return (
            <div key={rotulo} className="ficha-item">
              <dt><Icone className="size-4" aria-hidden />{rotulo}</dt>
              <dd><Bloco texto={valor} /></dd>
            </div>
          );
        })}
      </dl>
      <Bloco texto={linhas.slice(fim).join("\n")} />
    </>
  );
}

/** Tudo a partir de "## Para o Gil" é bastidor técnico: fica recolhido para a leitura da Rafa ficar limpa. */
const PARA_O_GIL = /^##\s+Para o Gil\b[^\n]*\n?/m;

/** Markdown com tabelas, listas de tarefas e riscado (GFM). Tabelas rolam na horizontal em telas estreitas. */
export default function Md({ children, className = "md" }: { children: string; className?: string }) {
  const m = children.match(PARA_O_GIL);
  if (!m || m.index === undefined) return <div className={className}><ComFicha texto={children} /></div>;
  return (
    <div className={className}>
      <ComFicha texto={children.slice(0, m.index)} />
      <details className="para-gil">
        <summary>Para o Gil · detalhes técnicos</summary>
        <div className="para-gil-corpo"><Bloco texto={children.slice(m.index + m[0].length)} /></div>
      </details>
    </div>
  );
}
