/**
 * setup: cria (ou atualiza) o ambiente e os agentes no Managed Agents e guarda os ids em `config`.
 * Rodar uma vez após o deploy e sempre que os prompts mudarem. Protegido por x-cron-segredo.
 * Idempotente: se os ids já existem, atualiza os agentes (gera nova versão) em vez de criar outros.
 */
import Anthropic from "npm:@anthropic-ai/sdk@1.12.0";
import { dbAdmin, segredoCron, gravarConfig, json, lerConfig, segredoConfere } from "../_shared/db.ts";
import { definicaoCommandCenter, definicaoProducao, type Esforco } from "../_shared/agentes.ts";

interface Ids { ambiente_id: string; command_center_id: string; producao_id: string }

Deno.serve(async (req) => {
  const db = dbAdmin();
  if (!segredoConfere(req.headers.get("x-cron-segredo"), await segredoCron(db))) {
    return json({ erro: "acesso negado" }, 403);
  }
  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  const modelos: { command_center: string; producao: string; esforco: Esforco } = {
    command_center: "claude-opus-5-5",
    producao: "claude-sonnet-5-5",
    esforco: "medium",
    ...(await lerConfig<Partial<{ command_center: string; producao: string; esforco: Esforco }>>(db, "modelos") ?? {}),
  };

  const ids = (await lerConfig<Ids>(db, "motor_ids")) ?? ({} as Partial<Ids>);
  const log: string[] = [];

  if (!ids.ambiente_id) {
    const env = await client.beta.environments.create({
      name: "rafa-studio",
      config: { type: "cloud", networking: { type: "limited", allow_package_managers: false, allow_mcp_servers: false } },
    });
    ids.ambiente_id = env.id;
    log.push(`ambiente criado ${env.id}`);
  }

  const prod = definicaoProducao(modelos.producao, modelos.esforco);
  if (!ids.producao_id) {
    const a = await client.beta.agents.create(prod);
    ids.producao_id = a.id;
    log.push(`Produção criado ${a.id} v${a.version}`);
  } else {
    const atual = await client.beta.agents.retrieve(ids.producao_id);
    const a = await client.beta.agents.update(ids.producao_id, { ...prod, version: atual.version });
    log.push(`Produção atualizado v${a.version}`);
  }

  const cc = definicaoCommandCenter(modelos.command_center, modelos.esforco, ids.producao_id!);
  if (!ids.command_center_id) {
    const a = await client.beta.agents.create(cc);
    ids.command_center_id = a.id;
    log.push(`Command Center criado ${a.id} v${a.version}`);
  } else {
    const atual = await client.beta.agents.retrieve(ids.command_center_id);
    const a = await client.beta.agents.update(ids.command_center_id, { ...cc, version: atual.version });
    log.push(`Command Center atualizado v${a.version}`);
  }

  await gravarConfig(db, "motor_ids", ids);
  return json({ ok: true, ids, log });
});
