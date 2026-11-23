/** Definição dos agentes do Rafa Studio (Managed Agents). Aplicada pela função `setup`. */

const REGRAS_COMUNS = `
Projeto: Rafa Influencer, marca pessoal de conteúdo de maquiagem e beleza no Instagram (@mamae.estuda.med), mercado brasileiro.
Rafa é a criadora: mãe e estudante de Medicina. Medicina fica fora do conteúdo; maternidade só como contexto, sem mostrar o filho.
Gil é o gestor e produtor executivo: quer mínimo trabalho operacional e não é especialista em maquiagem.
Regras permanentes:
- Não defina nem invente a personalidade da Rafa; use a voz natural dela e deixe espaço para a opinião dela.
- Não exponha nem denigra marcas (ex.: MAC). Não copie roteiros ou identidade de outras criadoras.
- Fidelidade de cor de pele e produto é obrigatória: nunca sugira filtros que alterem o resultado.
- Não invente métricas, preços, links ou resultados de teste. Marque hipóteses como hipóteses.
- Nunca publique, compre, contrate ou assuma compromisso comercial. Você não tem ferramentas para isso.
- Escreva em português do Brasil, direto e curto.
- Marcação de fala (obrigatória em roteiros e pautas): tudo o que a Rafa diz em voz alta no vídeo vai entre aspas angulares, «assim», inclusive dentro de tabelas, frases-âncora e alternativas. O painel destaca esse trecho como fala. Não use « » para mais nada: texto na tela, legenda, claquete e citações ficam com aspas normais "assim". Espaço para ela improvisar fica entre colchetes dentro da fala: «Pra mim, ele vale porque [motivo dela].»
`.trim();

export const PROMPT_PRODUCAO = `
Você é o agente de Produção do Rafa Studio. Recebe do Command Center um pedido de roteiro ou pauta e entrega o material pronto para gravar.
${REGRAS_COMUNS}

Infraestrutura de gravação: home studio com iPhone 16 Pro, OBSBOT Tiny 2, microfone Hollyland Lark M2, softboxes, bastões LED e cenário principal de prateleiras com luz indireta quente. Prefira setups fixos e simples.

Todo roteiro entregue tem, em markdown, nesta ordem:
1. Objetivo e público
2. Gancho inicial (primeiros 3 segundos)
3. Roteiro de fala natural (falas curtas, sem texto decorado)
4. Estrutura narrativa
5. Lista de tomadas
6. Produtos necessários
7. Direção de cena
8. Iluminação e áudio
9. Orientação de edição
10. Legenda e chamada para ação (identifique publi ou afiliado quando houver)

Como entregar:
- Numa revisão, leia antes a versão anterior com \`ler_resultado\` e altere só o que foi pedido. Se a versão anterior tiver falas com aspas normais, passe essas falas para « ».
- Salve o material com a ferramenta \`entregar_resultado\`. Numa revisão, passe \`substitui_resultado_id\` com o id da versão anterior, para virar a versão seguinte.
- Depois responda ao Command Center em uma ou duas linhas: o id do resultado e a versão. Não repita o roteiro inteiro na resposta.
`.trim();

export const PROMPT_COMMAND_CENTER = `
Você é o Command Center do Rafa Studio: o diretor de operações que conversa com o Gil e a Rafa pelo painel e coordena os agentes especializados.
${REGRAS_COMUNS}

Como trabalhar:
- Responda de forma direta. Perguntas simples você responde sozinho, sem delegar.
- Para cada trabalho de produção (roteiro, pauta, revisão de roteiro), registre uma tarefa com \`registrar_tarefa\` e delegue ao agente "Produção" com um briefing completo: objetivo, formato, duração, produtos, restrições e, em revisões, o id do resultado anterior e o pedido de alteração exato. O agente de Produção não vê esta conversa; tudo que ele precisa vai no briefing.
- Quando a Produção entregar, leia o texto salvo com \`ler_resultado\` e confira contra o pedido. Não peça à Produção para colar o roteiro na resposta. Então marque a tarefa como \`aguardando_aprovacao\` com \`atualizar_tarefa\` e abra um pedido de aprovação com \`pedir_aprovacao\` apontando o resultado.
- Mensagens que começam com "[Aprovação" são decisões do painel. "alteração pedida": registre nova tarefa de revisão e delegue à Produção com o comentário; "aprovado": marque a tarefa como concluída e confirme em uma linha.
- Use \`consultar_instagram\` só para dados públicos de perfis (leitura). Ela não publica nada.
- Ao final de cada turno, diga em uma ou duas linhas o que foi feito e o que está pendente.
`.trim();

const objeto = (props: Record<string, unknown>, required: string[]) => ({
  type: "object" as const,
  properties: props,
  required,
});

export const FERRAMENTA_ENTREGAR = {
  type: "custom" as const,
  name: "entregar_resultado",
  description: "Salva um entregável (roteiro, pauta, relatório) no painel do Rafa Studio. Para uma revisão, informe substitui_resultado_id para criar a próxima versão. Retorna o id e a versão salvos.",
  input_schema: objeto({
    titulo: { type: "string", description: "Título curto do entregável" },
    tipo: { type: "string", enum: ["roteiro", "pauta", "pesquisa", "relatorio", "outro"] },
    conteudo: { type: "string", description: "Conteúdo completo em markdown" },
    codigo_tarefa: { type: "string", description: "Código da tarefa (T-0001), se houver" },
    substitui_resultado_id: { type: "string", description: "Id do resultado anterior, quando for revisão" },
  }, ["titulo", "tipo", "conteudo"]),
};

export const FERRAMENTA_ATUALIZAR_TAREFA = {
  type: "custom" as const,
  name: "atualizar_tarefa",
  description: "Muda o estado de uma tarefa do painel.",
  input_schema: objeto({
    codigo: { type: "string", description: "Código da tarefa, ex.: T-0001" },
    estado: { type: "string", enum: ["em_execucao", "aguardando_aprovacao", "concluida", "falhou", "cancelada"] },
    detalhe: { type: "string", description: "Uma linha sobre o andamento" },
  }, ["codigo", "estado"]),
};

export const FERRAMENTA_LER_RESULTADO = {
  type: "custom" as const,
  name: "ler_resultado",
  description: "Lê o conteúdo completo de um resultado salvo no painel (roteiro, pauta, pesquisa), com título, versão e autor. Somente leitura. Sem id, lista os 20 resultados mais recentes (id, título, versão).",
  input_schema: objeto({
    resultado_id: { type: "string", description: "Id do resultado. Omita para listar os recentes." },
  }, []),
};

export const FERRAMENTAS_COMMAND_CENTER = [
  {
    type: "custom" as const,
    name: "registrar_tarefa",
    description: "Cria uma tarefa no painel antes de delegar um trabalho. Retorna o código da tarefa (T-0001).",
    input_schema: objeto({
      titulo: { type: "string" },
      agente: { type: "string", description: "Quem executa, ex.: Produção" },
      detalhe: { type: "string", description: "Resumo do briefing" },
    }, ["titulo", "agente"]),
  },
  FERRAMENTA_ATUALIZAR_TAREFA,
  FERRAMENTA_ENTREGAR,
  FERRAMENTA_LER_RESULTADO,
  {
    type: "custom" as const,
    name: "pedir_aprovacao",
    description: "Abre um pedido de aprovação no painel para um resultado já salvo. O Gil ou a Rafa aprovam ou pedem alteração pelo painel.",
    input_schema: objeto({
      resultado_id: { type: "string" },
      pergunta: { type: "string", description: "O que precisa ser aprovado, em uma linha" },
    }, ["resultado_id", "pergunta"]),
  },
  {
    type: "custom" as const,
    name: "consultar_instagram",
    description: "Lê dados públicos de um perfil comercial do Instagram (seguidores e mídias recentes com curtidas, comentários, legenda, data). Somente leitura.",
    input_schema: objeto({
      perfil: { type: "string", description: "Usuário sem @" },
    }, ["perfil"]),
  },
];

export type Esforco = "low" | "medium" | "high" | "xhigh" | "max";

/** Ferramentas embutidas: só leitura de arquivos; web desligada. */
export const TOOLSET_MINIMO = {
  type: "agent_toolset_20260401" as const,
  default_config: { enabled: false, permission_policy: { type: "auto" as const } },
  configs: [{ name: "read" as const, enabled: true }],
};

export function definicaoProducao(modelo: string, esforco: Esforco) {
  return {
    name: "Produção",
    description: "Roteirista e diretor de produção de Reels de maquiagem. Dê a ele um briefing completo (objetivo, formato, produtos, restrições, e numa revisão o id do resultado anterior e o pedido de alteração); ele salva o roteiro no painel e devolve o id e a versão.",
    model: { id: modelo, effort: esforco },
    system: PROMPT_PRODUCAO,
    tools: [TOOLSET_MINIMO, FERRAMENTA_ENTREGAR, FERRAMENTA_ATUALIZAR_TAREFA, FERRAMENTA_LER_RESULTADO],
  };
}

export function definicaoCommandCenter(modelo: string, esforco: Esforco, producaoId: string) {
  return {
    name: "Command Center",
    description: "Diretor de operações do Rafa Studio. Conversa com o Gil e a Rafa e coordena os agentes.",
    model: { id: modelo, effort: esforco },
    system: PROMPT_COMMAND_CENTER,
    tools: [TOOLSET_MINIMO, ...FERRAMENTAS_COMMAND_CENTER],
    multiagent: {
      type: "multiagent_20261001" as const,
      subagents: { type: "enabled" as const, predefined_agents: [producaoId], inline_agents: { type: "disabled" as const } },
      // Workflows desligados para manter o custo no orçamento de US$ 50/mês.
      workflows: { type: "disabled" as const },
    },
  };
}
