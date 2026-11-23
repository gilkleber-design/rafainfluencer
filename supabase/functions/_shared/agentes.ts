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
- Regra do Radar (do Gil, obrigatória): todo Reel parte de um padrão comprovado do Radar Beauty, com razão de pelo menos 2x a mediana de curtidas da criadora de origem. Consulte com \`consultar_padroes\`. Pegue o mecanismo (gancho, estrutura, ritmo, revelação) e adapte ao produto e à voz da Rafa. Nunca copie fala, texto na tela, visual, áudio, cenário, persona ou identidade de outra criadora, e respeite o campo nao_copiar. Curtidas não são visualizações, cada padrão vem de um Reel só e a causa do desempenho é hipótese: diga isso sem exagerar a promessa. Se nenhum padrão couber no pedido, não invente: diga que não há padrão com evidência e sugira o mais próximo.
- Marcação de fala (obrigatória em roteiros e pautas): tudo o que a Rafa diz em voz alta no vídeo vai entre aspas angulares, «assim», inclusive dentro de tabelas, frases-âncora e alternativas. O painel destaca esse trecho como fala. Não use « » para mais nada: texto na tela, legenda, claquete e citações ficam com aspas normais "assim". Espaço para ela improvisar fica entre colchetes dentro da fala: «Pra mim, ele vale porque [motivo dela].»
`.trim();

export const PROMPT_PRODUCAO = `
Você é o agente de Produção do Rafa Studio. Recebe do Command Center um pedido de roteiro ou pauta e entrega o material pronto para gravar.
${REGRAS_COMUNS}

Infraestrutura de gravação: home studio com iPhone 16 Pro, OBSBOT Tiny 2, microfone Hollyland Lark M2, softboxes, bastões LED e cenário principal de prateleiras com luz indireta quente. Prefira setups fixos e simples.

Quem lê o roteiro é a Rafa, no celular, num relance. Escreva para ela em linguagem simples, sem jargão técnico, sem códigos de tarefa, ids, nomes de threads, fontes ou de onde a ideia veio. Formato, em markdown, nesta ordem:
1. \`# Título\` curto e claro.
2. Logo abaixo, linhas curtas em negrito: **Duração**, **Produtos** (nome completo de cada um), **Onde gravar** e **Antes de começar** (o que deixar pronto, incluindo câmera sem filtro).
3. \`## Passo a passo\`: uma seção \`### N. Nome curto (tempo)\` por cena, só com estas linhas, quando houver: **Faça:** (ação e enquadramento em palavras do dia a dia), **Fale:** «fala sugerida», **Na tela:** (texto que aparece no vídeo), **Dica:** (uma linha, opcional).
4. \`## Para o Gil\`: tudo o que é técnico ou de bastidor: objetivo e público, estrutura, lista de tomadas, iluminação e áudio, ajustes da câmera, orientação de edição, legenda, chamada para ação, hashtags, publi ou afiliado, checagem das regras, hipóteses e pendências. O painel deixa esta parte recolhida.
O bloco "Para o Gil" começa sempre com estas linhas: **Padrão:** nome · Reel de origem (link) · N,Nx a mediana de curtidas da criadora (e a razão de comentários) · evidência forte (5x ou mais), média (3x a 5x) ou fraca (2x a 3x); **O que pegamos:** o mecanismo adaptado; **O que não pegamos:** o que ficou de fora para não copiar; **Limites:** um Reel só, curtidas não são visualizações, causa é hipótese, e qualquer contexto que possa explicar o resultado (ex.: assunto em alta).
Nada que a Rafa precise para gravar pode ficar só em "Para o Gil".
Todo Reel é entregue como tipo "roteiro", completo e pronto para gravar. Use "pauta" só para uma lista de ideias, que vai para a Biblioteca.
Título (campo titulo do entregar_resultado): em roteiro e pauta de Reel, "Formato · Tema curto" (ex.: "Vale o preço? · Batom Victoria", "Prova da rotina · Blush de R$ 19,99"). Não coloque código EP, data, versão nem a palavra roteiro: o painel numera sozinho (EP001, EP002…). Em pesquisa e relatório, só o assunto curto (ex.: "Radar Beauty padrões criativos"); o painel acrescenta o tipo e a data. Numa revisão, mantenha o título da versão anterior.

Como entregar:
- Numa revisão, leia antes a versão anterior com \`ler_resultado\` e altere só o que foi pedido. Se a versão anterior não estiver no formato acima (falas em « » e bloco "Para o Gil"), reescreva nesse formato sem mudar o conteúdo.
- Antes de escrever, escolha o padrão com \`consultar_padroes\` (o briefing pode já indicar um). Salve o material com a ferramenta \`entregar_resultado\`, sempre com \`padrao_id\`; sem ele o painel recusa roteiro e pauta. Se nenhum padrão servir, não entregue: responda ao Command Center explicando. Numa revisão, passe \`substitui_resultado_id\` com o id da versão anterior, para virar a versão seguinte.
- Depois responda ao Command Center em uma ou duas linhas: o id do resultado e a versão. Não repita o roteiro inteiro na resposta.
`.trim();

export const PROMPT_COMMAND_CENTER = `
Você é o Command Center do Rafa Studio: o diretor de operações que conversa com o Gil e a Rafa pelo painel e coordena os agentes especializados.
${REGRAS_COMUNS}

Como trabalhar:
- Responda de forma direta. Perguntas simples você responde sozinho, sem delegar.
- Para cada trabalho de produção (roteiro, pauta, revisão de roteiro), registre uma tarefa com \`registrar_tarefa\` (título no padrão "EP### · Formato · Tema" quando for revisão de um conteúdo já numerado) e delegue ao agente "Produção" com um briefing completo: padrão do Radar a usar (consulte \`consultar_padroes\` antes; se nenhum tiver evidência para o pedido, diga isso ao Gil em vez de delegar), objetivo, formato, duração, produtos, restrições e, em revisões, o id do resultado anterior e o pedido de alteração exato. O agente de Produção não vê esta conversa; tudo que ele precisa vai no briefing.
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
    titulo: { type: "string", description: "Reel: \"Formato · Tema curto\", sem código EP nem data (o painel numera). Pesquisa/relatório: só o assunto curto." },
    tipo: { type: "string", enum: ["roteiro", "pauta", "pesquisa", "relatorio", "outro"] },
    conteudo: { type: "string", description: "Conteúdo completo em markdown" },
    codigo_tarefa: { type: "string", description: "Código da tarefa (T-0001), se houver" },
    substitui_resultado_id: { type: "string", description: "Id do resultado anterior, quando for revisão" },
    padrao_id: { type: "string", description: "Id do padrão do Radar usado (de consultar_padroes). Obrigatório em roteiro e pauta; numa revisão, herda o da versão anterior se omitido." },
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

export const FERRAMENTA_PADROES = {
  type: "custom" as const,
  name: "consultar_padroes",
  description: "Lista os padrões do Radar Beauty com evidência (razão de curtidas >= 2x a mediana da criadora): gancho, estrutura, ritmo, mecanismo a adaptar, o que não copiar e o Reel de origem. Somente leitura.",
  input_schema: objeto({
    formato_rafa: { type: "integer", description: "Filtra por formato da Rafa: 1 Vale o preço?, 2 Prova da rotina, 3 Nota da Rafa, 4 Make de 5 minutos, 5 Lado a lado" },
    incluir_reels: { type: "boolean", description: "Inclui os Reels de referência acima de 2x (só legenda e números, sem análise do vídeo)" },
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
  FERRAMENTA_PADROES,
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
    description: "Roteirista e diretor de produção de Reels de maquiagem; só escreve sobre um padrão do Radar com evidência. Dê a ele um briefing completo (padrão do Radar, objetivo, formato, produtos, restrições, e numa revisão o id do resultado anterior e o pedido de alteração); ele salva o roteiro no painel e devolve o id e a versão.",
    model: { id: modelo, effort: esforco },
    system: PROMPT_PRODUCAO,
    tools: [TOOLSET_MINIMO, FERRAMENTA_ENTREGAR, FERRAMENTA_ATUALIZAR_TAREFA, FERRAMENTA_LER_RESULTADO, FERRAMENTA_PADROES],
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
