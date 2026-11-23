"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/**
 * Carrega uma tabela e mantém em sincronia via Supabase Realtime.
 * A RLS garante que só membros recebem as linhas.
 */
export function useTabela<T extends { id: string }>(
  tabela: string,
  opts: { ordem: string; asc?: boolean; filtro?: { coluna: string; valor: string } | null; limite?: number },
): { linhas: T[]; carregando: boolean } {
  const [linhas, setLinhas] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const filtroChave = opts.filtro ? `${opts.filtro.coluna}=${opts.filtro.valor}` : "";

  useEffect(() => {
    let vivo = true;
    const sb = supabase();
    const asc = opts.asc ?? false;
    const ordenar = (xs: T[]) =>
      [...xs].sort((a, b) => {
        const va = String((a as Record<string, unknown>)[opts.ordem] ?? "");
        const vb = String((b as Record<string, unknown>)[opts.ordem] ?? "");
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      });

    async function carregar() {
      let q = sb.from(tabela).select("*").order(opts.ordem, { ascending: asc }).limit(opts.limite ?? 200);
      if (opts.filtro) q = q.eq(opts.filtro.coluna, opts.filtro.valor);
      const { data } = await q;
      if (vivo) {
        setLinhas(ordenar((data ?? []) as T[]));
        setCarregando(false);
      }
    }
    carregar();

    const canal = sb
      .channel(`rt-${tabela}-${filtroChave}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tabela,
          ...(opts.filtro ? { filter: `${opts.filtro.coluna}=eq.${opts.filtro.valor}` } : {}),
        },
        (p) => {
          setLinhas((atual) => {
            if (p.eventType === "DELETE") return atual.filter((l) => l.id !== (p.old as T).id);
            const nova = p.new as T;
            const sem = atual.filter((l) => l.id !== nova.id);
            return ordenar([...sem, nova]);
          });
        },
      )
      .subscribe((status) => {
        // Ao reconectar, recarrega para não perder mudanças feitas enquanto estava fora.
        if (status === "SUBSCRIBED") carregar();
      });

    return () => {
      vivo = false;
      sb.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela, opts.ordem, opts.asc, filtroChave, opts.limite]);

  return { linhas, carregando };
}
