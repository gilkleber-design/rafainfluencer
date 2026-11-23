"use client";
import { useState } from "react";
import { BarChart3, ExternalLink, Info, RefreshCw } from "lucide-react";
import { ponte } from "@/lib/supabase";
import { Aviso, Botao, Cartao, Esqueleto, Vazio } from "@/components/ui";
import { num, quando } from "@/components/identidade";
import { Grafico, useDados } from "@/components/Conteudos";
import { cn } from "@/lib/cn";

export function Metricas({ abrir }: { abrir: (serie: string) => void }) {
  const { conteudos, metricas, carregando } = useDados();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const publicados = conteudos.filter((c) => c.etapa === "publicado" && !c.arquivado_em)
    .sort((a, b) => (b.publicado_em ?? "").localeCompare(a.publicado_em ?? ""));
  const ult = (s: string) => { const m = metricas.get(s) ?? []; return m[m.length - 1]; };
  const total = (k: "curtidas" | "comentarios") => publicados.reduce((t, c) => t + (ult(c.serie)?.[k] ?? 0), 0);

  async function atualizar(series: string[]) {
    setErro(null);
    for (const s of series) {
      setOcupado(s);
      const r = await ponte({ acao: "metricas_coletar", serie: s });
      if (r.erro) setErro(r.erro);
    }
    setOcupado(null);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1000px] px-4 pb-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-6 pb-4">
          <div>
            <h1 className="font-display text-[26px] font-semibold tracking-tight">Métricas</h1>
            <p className="mt-0.5 text-[14px] text-muted">Desempenho dos Reels publicados.</p>
          </div>
          <Botao tamanho="sm" disabled={!!ocupado || !publicados.some((c) => c.url_publicacao)} onClick={() => atualizar(publicados.filter((c) => c.url_publicacao).map((c) => c.serie))}>
            <RefreshCw className={cn("size-3.5", ocupado && "animate-spin")} />Atualizar todos
          </Botao>
        </div>

        {erro && <Aviso className="mb-4">{erro}</Aviso>}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Publicados", publicados.length.toLocaleString("pt-BR")],
            ["Curtidas", num(total("curtidas"))],
            ["Comentários", num(total("comentarios"))],
            ["Visualizações", "—"],
          ].map(([rotulo, valor], i) => (
            <Cartao key={rotulo} className="px-4 py-3.5">
              <p className="text-[12px] text-muted">{rotulo}</p>
              <p className={cn("mt-0.5 font-display text-[26px] font-semibold tabular-nums", i === 3 && "text-muted")}>{valor}</p>
            </Cartao>
          ))}
        </div>

        <div className="mt-3 flex gap-3 rounded-2xl bg-info-soft px-4 py-3 text-[13px] text-info">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>Curtidas e comentários vêm da leitura pública do Instagram. Visualizações, alcance, salvamentos e compartilhamentos só aparecem quando a conta da Rafa for conectada ao painel pelo login da Meta (Insights). O espaço já está pronto.</p>
        </div>

        <div className="mt-6 space-y-3">
          {carregando && <Esqueleto className="h-28" />}
          {!carregando && publicados.length === 0 && (
            <Cartao><Vazio icone={<BarChart3 className="size-5" />} titulo="Nenhum Reel publicado ainda">Quando um conteúdo chegar a Publicado com o link do Reel, as métricas aparecem aqui.</Vazio></Cartao>
          )}
          {publicados.map((c) => {
            const ms = metricas.get(c.serie) ?? [];
            const m = ms[ms.length - 1];
            const ant = ms[ms.length - 2];
            const delta = m && ant && m.curtidas != null && ant.curtidas != null ? m.curtidas - ant.curtidas : null;
            return (
              <Cartao key={c.serie} className="grid gap-4 p-4 md:grid-cols-[1fr_280px] md:items-center">
                <div className="min-w-0">
                  <button onClick={() => abrir(c.serie)} className="text-left text-[15px] font-medium hover:text-brand cursor-pointer">{c.titulo}</button>
                  <p className="text-[12px] text-muted">
                    {c.publicado_em ? `Publicado ${quando(c.publicado_em)}` : "Publicado"}
                    {c.url_publicacao && <> · <a href={c.url_publicacao} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand">ver Reel<ExternalLink className="size-3" /></a></>}
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-5">
                    <div><p className="text-[11px] text-muted">Curtidas</p><p className="text-[20px] font-semibold tabular-nums">{num(m?.curtidas)}{delta != null && delta !== 0 && <span className={cn("ml-1.5 text-[12px]", delta > 0 ? "text-ok" : "text-bad")}>{delta > 0 ? "+" : ""}{delta}</span>}</p></div>
                    <div><p className="text-[11px] text-muted">Comentários</p><p className="text-[20px] font-semibold tabular-nums">{num(m?.comentarios)}</p></div>
                    <div><p className="text-[11px] text-muted">Visualizações</p><p className="text-[20px] font-semibold tabular-nums text-muted">{num(m?.visualizacoes)}</p></div>
                    <Botao tamanho="sm" variante="fantasma" className="ml-auto" disabled={!!ocupado || !c.url_publicacao} onClick={() => atualizar([c.serie])}>
                      <RefreshCw className={cn("size-3.5", ocupado === c.serie && "animate-spin")} />{m ? quando(m.coletado_em) : "Ler agora"}
                    </Botao>
                  </div>
                  {!c.url_publicacao && <p className="mt-2 text-[12px] text-warn">Falta o link do Reel: abra o conteúdo e cole o link.</p>}
                </div>
                <Grafico metricas={ms} />
              </Cartao>
            );
          })}
        </div>
      </div>
    </div>
  );
}
