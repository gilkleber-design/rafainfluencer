/**
 * Camada do "motor" de agentes. Todo o resto do Rafa Studio fala só com esta interface,
 * então trocar Managed Agents por outra implementação (Messages API, Agent SDK) mexe só aqui.
 */
import Anthropic from "npm:@anthropic-ai/sdk@1.12.0";

/** Evento normalizado que o processador entende. */
export interface EventoMotor {
  id: string;
  tipo: string;               // ex.: agent.message, agent.custom_tool_use, session.status_idle
  quando: string;             // ISO (processed_at)
  threadId: string | null;    // null = thread principal (Command Center)
  bruto: Record<string, unknown>;
}

export interface Motor {
  nome: string;
  criarSessao(opts: { titulo: string; orcamentoCentavos: number }): Promise<string>;
  enviarMensagem(sessaoId: string, texto: string): Promise<void>;
  responderFerramenta(sessaoId: string, chamadaId: string, texto: string, erro?: boolean): Promise<void>;
  /** Eventos com processed_at >= desde (ou todos), em ordem cronológica. */
  listarEventos(sessaoId: string, desde: string | null): Promise<EventoMotor[]>;
  custoCentavos(sessaoId: string): Promise<number | null>;
}

export interface IdsMotor {
  ambiente_id: string;
  command_center_id: string;
}

export function motorManagedAgents(ids: IdsMotor): Motor {
  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  return {
    nome: "managed_agents",

    async criarSessao({ titulo, orcamentoCentavos }) {
      const s = await client.beta.sessions.create({
        agent: ids.command_center_id,
        environment_id: ids.ambiente_id,
        title: titulo,
        budget: { type: "limit", max_list_cost: { amount: String(Math.max(1, Math.round(orcamentoCentavos))), currency: "USD" } },
      });
      return s.id;
    },

    async enviarMensagem(sessaoId, texto) {
      await client.beta.sessions.events.send(sessaoId, {
        events: [{ type: "user.message", content: [{ type: "text", text: texto }] }],
      });
    },

    async responderFerramenta(sessaoId, chamadaId, texto, erro = false) {
      await client.beta.sessions.events.send(sessaoId, {
        events: [{
          type: "user.custom_tool_result",
          custom_tool_use_id: chamadaId,
          content: [{ type: "text", text: texto }],
          ...(erro ? { is_error: true } : {}),
        }],
      });
    },

    async listarEventos(sessaoId, desde) {
      const params: Record<string, unknown> = { limit: 1000, order: "asc" };
      if (desde) params["created_at[gte]"] = desde;
      const out: EventoMotor[] = [];
      for await (const ev of client.beta.sessions.events.list(sessaoId, params as never)) {
        const e = ev as unknown as Record<string, unknown>;
        out.push({
          id: String(e.id),
          tipo: String(e.type),
          quando: String(e.processed_at ?? new Date().toISOString()),
          threadId: (e.session_thread_id as string | null | undefined) ?? null,
          bruto: e,
        });
      }
      return out;
    },

    async custoCentavos(sessaoId) {
      const s = await client.beta.sessions.retrieve(sessaoId) as unknown as { usage?: { list_cost?: { amount?: string } | null } };
      const v = s.usage?.list_cost?.amount;
      return v ? Number.parseInt(v, 10) : null;
    },
  };
}
