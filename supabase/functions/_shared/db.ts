import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.119.2";

export type Db = SupabaseClient;

/** Cliente com service role: só existe dentro das Edge Functions. */
export function dbAdmin(): Db {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function lerConfig<T = unknown>(db: Db, chave: string): Promise<T | null> {
  const { data, error } = await db.from("config").select("valor").eq("chave", chave).maybeSingle();
  if (error) throw error;
  return (data?.valor as T) ?? null;
}

export async function gravarConfig(db: Db, chave: string, valor: unknown) {
  const { error } = await db.from("config").upsert({ chave, valor, atualizado_em: new Date().toISOString() });
  if (error) throw error;
}

/** Identifica o membro a partir do JWT do navegador. Retorna null se não for membro. */
export async function membroDaRequisicao(db: Db, req: Request): Promise<{ email: string; nome: string } | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email) return null;
  const { data: m } = await db.from("membros").select("email, nome").ilike("email", data.user.email).maybeSingle();
  return m ?? null;
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

/** Segredo do cron: secret CRON_SEGREDO, ou `config.cron_segredo` (só a service role lê). */
export async function segredoCron(db: Db): Promise<string | undefined> {
  const env = Deno.env.get("CRON_SEGREDO");
  if (env) return env;
  return (await lerConfig<string>(db, "cron_segredo")) ?? undefined;
}

/** Compara segredo em tempo constante. */
export function segredoConfere(recebido: string | null, esperado: string | undefined): boolean {
  if (!recebido || !esperado || recebido.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  return diff === 0;
}
