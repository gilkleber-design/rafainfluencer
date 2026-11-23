"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Variáveis públicas que faltam neste deploy (lidas no build; vazias = painel não conecta). */
export function variaveisFaltando(): string[] {
  const faltam: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) faltam.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) faltam.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return faltam;
}

export function supabase(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !chave) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY");
    cliente = createClient(url, chave, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } });
  }
  return cliente;
}

/** Chama a Edge Function `ponte` com o token do usuário logado. */
export async function ponte(corpo: Record<string, unknown>): Promise<{ ok?: boolean; erro?: string; conversa_id?: string; serie?: string; versao?: number; curtidas?: number | null; comentarios?: number | null }> {
  const { data, error } = await supabase().functions.invoke("ponte", { body: corpo });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx) msg = (await ctx.json()).erro ?? msg;
    } catch { /* mantém a mensagem original */ }
    return { erro: msg };
  }
  return data;
}
