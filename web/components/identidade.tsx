"use client";
import { Bot, Clapperboard, Sparkles, UserRound, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tom } from "@/components/ui";

/** Quem fala: cor e ícone fixos por agente, para reconhecer de relance. */
const AGENTES: Record<string, { cor: string; icone: React.ElementType; papel: string }> = {
  "command center": { cor: "bg-[#3b2a33] text-[#f5e7ea] dark:bg-[#f0dfe4] dark:text-[#3b2a33]", icone: Sparkles, papel: "Coordena e delega" },
  "produção": { cor: "bg-[#a07a3c] text-white", icone: Clapperboard, papel: "Roteiros e pautas" },
};

export function infoAgente(nome: string | null | undefined) {
  const chave = (nome ?? "").toLowerCase().trim();
  return AGENTES[chave] ?? { cor: "bg-info text-white dark:text-[#151113]", icone: Bot, papel: "Agente" };
}

export function Avatar({ nome, tipo, tamanho = 32 }: { nome: string | null; tipo: "humano" | "command_center" | "agente" | "sistema"; tamanho?: number }) {
  const estilo = { width: tamanho, height: tamanho };
  if (tipo === "humano") {
    const ini = (nome ?? "?").trim().slice(0, 1).toUpperCase();
    return <div style={estilo} className="grid shrink-0 place-items-center rounded-full bg-brand text-brand-ink text-[13px] font-semibold">{ini || <UserRound className="size-4" />}</div>;
  }
  if (tipo === "sistema") return <div style={estilo} className="grid shrink-0 place-items-center rounded-full bg-surface-2 text-muted"><Info className="size-4" /></div>;
  const a = infoAgente(tipo === "command_center" ? "command center" : nome);
  const Icone = a.icone;
  return <div style={estilo} className={cn("grid shrink-0 place-items-center rounded-full", a.cor)}><Icone className="size-[45%]" strokeWidth={2.2} /></div>;
}

export const ESTADO_TAREFA: Record<string, { nome: string; tom: Tom }> = {
  pendente: { nome: "Pendente", tom: "neutro" },
  em_execucao: { nome: "Em execução", tom: "info" },
  aguardando_aprovacao: { nome: "Aguardando você", tom: "alerta" },
  concluida: { nome: "Concluída", tom: "ok" },
  falhou: { nome: "Falhou", tom: "erro" },
  cancelada: { nome: "Cancelada", tom: "neutro" },
};

export const ESTADO_CONVERSA: Record<string, { nome: string; tom: Tom }> = {
  nova: { nome: "Nova", tom: "neutro" },
  ativa: { nome: "Pronta", tom: "ok" },
  aguardando: { nome: "Pronta", tom: "ok" },
  trabalhando: { nome: "Trabalhando", tom: "info" },
  pausada_orcamento: { nome: "Pausada: teto de gasto", tom: "alerta" },
  erro: { nome: "Erro", tom: "erro" },
  encerrada: { nome: "Encerrada", tom: "neutro" },
};

export const TIPO_RESULTADO: Record<string, string> = { roteiro: "Reel", pauta: "Pauta", pesquisa: "Pesquisa", relatorio: "Relatório", outro: "Documento" };

export function quando(s: string) {
  const d = new Date(s);
  const seg = (Date.now() - d.getTime()) / 1000;
  if (seg < 60) return "agora";
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `hoje, ${hora}`;
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return `ontem, ${hora}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "") + `, ${hora}`;
}
export const hora = (s: string) => new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const ETAPAS: { id: import("@/lib/tipos").Etapa; nome: string; cor: string }[] = [
  { id: "ideia", nome: "Ideia", cor: "etapa-ideia" },
  { id: "roteiro", nome: "Roteiro", cor: "etapa-roteiro" },
  { id: "aprovado", nome: "Aprovado", cor: "etapa-aprovado" },
  { id: "em_producao", nome: "Em produção", cor: "etapa-em_producao" },
  { id: "gravado", nome: "Gravado", cor: "etapa-gravado" },
  { id: "editado", nome: "Editado", cor: "etapa-editado" },
  { id: "publicado", nome: "Publicado", cor: "etapa-publicado" },
];
export const nomeEtapa = (id: string) => ETAPAS.find((e) => e.id === id)?.nome ?? (id === "arquivado" ? "Lixeira" : id);
export const num = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("pt-BR"));

/**
 * Nome padrão de um conteúdo:
 * peça "EP001 · Formato · Tema", teste "TESTE · Tema", documento "Tipo · Assunto · dd/mm".
 */
export function nomeConteudo(c: { titulo: string; codigo?: string | null; classe?: string; etiquetas?: string[]; tipo: string; criado_em: string }) {
  if (c.classe === "documento") {
    const data = new Date(c.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${TIPO_RESULTADO[c.tipo] ?? "Documento"} · ${c.titulo} · ${data}`;
  }
  if (c.etiquetas?.includes("teste")) return `TESTE · ${c.titulo}`;
  return c.codigo ? `${c.codigo} · ${c.titulo}` : c.titulo;
}

export type Padrao = { id: string; nome: string; reel_origem: string; perfil: string; razao_vs_mediana: number; razao_comentarios: number | null; tipo_gancho: string | null; estrutura: string | null; mecanismo: string | null };

/** Força da evidência do padrão do Radar: curtidas do Reel de origem ÷ mediana da criadora. */
export function forcaEvidencia(p: Padrao | null | undefined): { classe: string; rotulo: string } {
  if (!p) return { classe: "evid-sem", rotulo: "Sem evidência" };
  const r = Number(p.razao_vs_mediana);
  const x = r.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "x";
  if (r >= 5) return { classe: "evid-forte", rotulo: `Evidência forte · ${x}` };
  if (r >= 3) return { classe: "evid-media", rotulo: `Evidência média · ${x}` };
  return { classe: "evid-fraca", rotulo: `Evidência fraca · ${x}` };
}
