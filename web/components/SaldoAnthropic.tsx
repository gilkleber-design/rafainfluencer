"use client";
import { useEffect, useState } from "react";
import { Pencil, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTabela } from "@/lib/useTabela";
import type { Conversa } from "@/lib/tipos";
import { Botao } from "@/components/ui";
import { cn } from "@/lib/cn";

interface Saldo {
  informado: boolean;
  saldo_informado_centavos: number | null;
  informado_em: string | null;
  gasto_desde_centavos: number | null;
  saldo_estimado_centavos: number | null;
  gasto_mes_centavos: number;
}

const usd = (c: number | null | undefined) => `US$ ${((c ?? 0) / 100).toFixed(2).replace(".", ",")}`;
const data = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

/**
 * Saldo estimado na Anthropic. A API não expõe o saldo de créditos: o gestor informa o saldo
 * que vê no Console e o painel desconta o custo real das conversas feitas depois disso.
 */
export default function SaldoAnthropic({ compacto = false, podeEditar = false, pilula, onPilula }: { compacto?: boolean; podeEditar?: boolean; pilula?: boolean; onPilula?: () => void }) {
  const { linhas: conversas } = useTabela<Conversa>("conversas", { ordem: "atualizado_em", limite: 200 });
  const { linhas: registros } = useTabela<{ id: string }>("credito_anthropic", { ordem: "informado_em", limite: 5 });
  const gatilho = `${conversas.reduce((s, c) => s + (c.custo_centavos ?? 0), 0)}|${registros[0]?.id ?? ""}`;
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    supabase().rpc("saldo_anthropic").then(({ data, error }) => {
      if (error) { console.error("saldo_anthropic", error); setFalhou(true); return; }
      setFalhou(false);
      if (data) setSaldo(data as Saldo);
    });
  }, [gatilho]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(valor.replace(/\s|US\$|\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) { setErro("Valor inválido."); return; }
    setSalvando(true); setErro(null);
    const { error } = await supabase().rpc("informar_saldo_anthropic", { valor_usd: n });
    setSalvando(false);
    if (error) { setErro("Não deu para salvar."); return; }
    setEditando(false); setValor("");
    const { data } = await supabase().rpc("saldo_anthropic");
    if (data) setSaldo(data as Saldo);
  }

  if (pilula) {
    const v = saldo?.saldo_estimado_centavos;
    const baixoP = v !== null && v !== undefined && v < 500;
    return (
      <button onClick={onPilula} aria-label="Saldo Anthropic estimado" title="Saldo Anthropic (estimado)"
        className={cn("flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium tabular-nums cursor-pointer", baixoP ? "text-[#D8AB81]" : "text-ink-2")}>
        <Wallet className="size-4" aria-hidden />
        {saldo?.informado ? usd(v) : falhou ? "?" : "…"}
      </button>
    );
  }

  if (!saldo) {
    return (
      <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12px] text-muted">
        <div className="flex items-center gap-2"><Wallet className="size-3.5" aria-hidden />Saldo Anthropic (estimado)</div>
        <div className="mt-1">{falhou ? "Não deu para carregar o saldo." : "Carregando…"}</div>
      </div>
    );
  }
  const baixo = saldo.saldo_estimado_centavos !== null && saldo.saldo_estimado_centavos < 500;

  if (editando) {
    return (
      <form onSubmit={salvar} className={cn("rounded-xl border border-line bg-surface-2 p-3", compacto && "w-full")}>
        <label htmlFor="saldo-anthropic" className="block text-[12px] text-ink-2">Saldo atual no Console da Anthropic (US$)</label>
        <input id="saldo-anthropic" inputMode="decimal" autoFocus value={valor} onChange={(e) => setValor(e.target.value)} placeholder="20,00"
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[14px] text-ink tabular-nums outline-none focus:border-brand" />
        {erro && <p className="mt-1 text-[12px] text-red-300">{erro}</p>}
        <div className="mt-2 flex gap-1.5">
          <Botao type="submit" tamanho="sm" disabled={salvando || !valor.trim()}>Salvar</Botao>
          <Botao type="button" variante="fantasma" tamanho="sm" onClick={() => { setEditando(false); setErro(null); }}>Cancelar</Botao>
        </div>
        <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" className="mt-2 block text-[12px] text-muted underline">Ver saldo no Console</a>
      </form>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5" title="Estimativa: saldo informado menos o custo das conversas feitas depois. Confira no Console da Anthropic.">
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <Wallet className="size-3.5" aria-hidden />
        <span className="flex-1">Saldo Anthropic (estimado)</span>
        {podeEditar && <button onClick={() => { setEditando(true); setValor(saldo.saldo_estimado_centavos !== null ? (saldo.saldo_estimado_centavos / 100).toFixed(2).replace(".", ",") : ""); }}
          aria-label="Atualizar saldo" title="Atualizar saldo" className="grid size-6 place-items-center rounded-md hover:bg-surface hover:text-ink cursor-pointer">
          <Pencil className="size-3" />
        </button>}
      </div>
      {saldo.informado ? (
        <div className={cn("mt-0.5 text-[20px] font-semibold tabular-nums", baixo ? "text-[#D8AB81]" : "text-ink")}>{usd(saldo.saldo_estimado_centavos)}</div>
      ) : podeEditar ? (
        <button onClick={() => setEditando(true)} className="mt-1 text-[13px] text-brand underline cursor-pointer">Informar saldo do Console</button>
      ) : (
        <div className="mt-1 text-[13px] text-muted">Ainda não informado.</div>
      )}
      <div className="mt-1 text-[12px] leading-snug text-muted tabular-nums">
        Gasto no mês: {usd(saldo.gasto_mes_centavos)}
        {saldo.informado && <><br />Informado {usd(saldo.saldo_informado_centavos)} em {data(saldo.informado_em)}</>}
      </div>
    </div>
  );
}
