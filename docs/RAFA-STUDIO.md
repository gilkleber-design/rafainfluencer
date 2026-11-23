# Rafa Studio: documentação completa

Atualizado em 23/11/2026. Este arquivo descreve o projeto inteiro (objetivo, estratégia, regras, telas, agentes, dados, infraestrutura, limites e pendências) para que outra pessoa ou outra IA entenda e continue o trabalho. Não contém segredos, tokens nem senhas.

---

## 1. O que é

**Rafa Influencer** é uma agência operada por agentes de IA para criar, produzir e acompanhar conteúdo de maquiagem e beleza no Instagram, com o mínimo de trabalho humano.

**Rafa Studio** é o painel web privado dessa operação: https://rafastudio.profgilkleber.com.br

- **Gil**: gestor e produtor executivo. Aprova, decide e não é especialista em maquiagem. Quer o mínimo de trabalho operacional.
- **Rafa**: a criadora. Mulher real, mãe e estudante de Medicina, apaixonada por maquiagem. Grava os vídeos.
- **Agentes de IA**: o Command Center conversa com Gil e Rafa e coordena; o agente de Produção escreve os roteiros.

Fluxo resumido: Gil pede no Chat → Command Center registra a tarefa e delega → Produção escolhe um padrão viral comprovado e escreve o roteiro → roteiro aparece no quadro de Conteúdos → Gil aprova ou pede alteração (vira v2, v3…) → Rafa grava → publica → métricas.

---

## 2. Estratégia e posicionamento

### 2.1 Perfil e regras da Rafa (permanentes)

- Perfil no Instagram: **@mamae.estuda.med**. Mercado brasileiro, português do Brasil.
- Direção escolhida pela Rafa: **make real para quem não tem tempo** + **"Vale o preço?"** (produtos acessíveis avaliados com honestidade).
- Fala direto para a câmera. Grava à noite ou no fim de semana.
- **Medicina fica fora do conteúdo.** Maternidade entra só como contexto; **nunca mostrar o filho**.
- **Não definir nem inventar a personalidade da Rafa.** A IA propõe; a Rafa valida. Espaço para a opinião dela fica marcado.
- **Não expor nem denegrir marcas** (ex.: não citar a MAC nem comparar para diminuir marca famosa).
- **Fidelidade de cor**: nada de filtro que altere pele ou produto.
- Não inventar métricas, preços, links ou resultados de teste. Hipótese é marcada como hipótese.
- Agentes nunca publicam, compram, contratam nem assumem compromisso comercial.

### 2.2 Os 5 formatos da Rafa

1. **Vale o preço?**
2. **Prova da rotina**
3. **Nota da Rafa**
4. **Make de 5 minutos**
5. **Lado a lado**

### 2.3 Regra do Radar ("roubar a mágica")

Decisão do Gil: **não gastar energia com conteúdo sem potencial comprovado de viralizar.**

- Todo Reel parte de um **padrão comprovado do Radar Beauty**: um Reel de outra criadora brasileira que fez **pelo menos 2x a mediana de curtidas** daquela criadora.
- Pega-se o **mecanismo** (gancho, estrutura, ritmo, revelação) e adapta-se ao produto e à voz da Rafa.
- **Nunca copiar** fala, texto na tela, visual, áudio, cenário, persona ou identidade de outra criadora. Cada padrão tem um campo `nao_copiar`.
- Força da evidência: **forte** ≥ 5x, **média** 3x a 5x, **fraca** 2x a 3x.
- Limites declarados sempre: cada padrão vem de um Reel só; curtidas não são visualizações; a causa do sucesso é hipótese.
- O sistema **recusa** salvar roteiro ou pauta sem `padrao_id` válido (padrão ativo e ≥ 2x). Se nenhum padrão serve, o agente diz isso em vez de inventar.

### 2.4 Radar Beauty (pesquisa)

- 1ª leitura em 23/11/2026: **144 Reels** de 12 criadoras brasileiras de beleza (ex.: marimaria, bianca, camilapudim, brunatavares, adammitch, karenbachini, vicceridono, natgagliotti, amandaoligon, jeroese, juuevellyn, carolrmakeup).
- Dados vêm da API do Instagram (business discovery) via função `pesquisa` do projeto IA com Prosa, **só leitura**.
- Análise audiovisual de 5 Reels (quadros + transcrição) gerou os 5 padrões atuais:

| id | Nome | Criadora de origem | Razão vs mediana | Formato da Rafa |
|---|---|---|---|---|
| investigacao-polemica | Investigação de uma dúvida que todo mundo tem | adammitch | 17,0x | 5 Lado a lado |
| transformacao-trend | Transformação com áudio em alta | camilapudim | 9,0x | 4 Make de 5 minutos |
| explicacao-tecnica-de-polemica | Explicação de uma reclamação comum | karenbachini | 6,4x | 3 Nota da Rafa |
| primeiras-impressoes-lancamento | Primeiras impressões com pergunta direta | amandaoligon | 3,4x | 3 Nota da Rafa |
| lista-com-regra | Lista com uma regra única | natgagliotti | 2,1x | 1 Vale o preço? |

Achados gerais: o lançamento Fran by FR dominou nov/2026; publis têm mediana 0,9x (grandes criadoras 0,09x–0,5x); muitos comentários contra poucas curtidas costumam indicar CTA de "comente para receber o link".

### 2.5 Nomenclatura

- Reels: **`EP### · Formato · Tema`** (ex.: `EP001 · Vale o preço? · Batom Victoria`). O número EP é dado pelo banco automaticamente.
- Testes: **`TESTE · Tema`**.
- Documentos (pesquisa, relatório, pauta): **`Tipo · Assunto · dd/mm`**.
- Agentes geram só "Formato · Tema"; o painel monta o resto.

### 2.6 Formato do roteiro

Quem lê é a Rafa, no celular, num relance. Ordem fixa em Markdown:

1. `# Título`
2. Linhas em negrito: **Duração**, **Produtos**, **Onde gravar**, **Antes de começar** (inclui câmera sem filtro).
3. `## Passo a passo`: uma seção `### N. Nome curto (tempo)` por cena com **Faça:**, **Fale:** «fala», **Na tela:**, **Dica:**.
4. `## Para o Gil` (recolhido no painel): começa com **Padrão / O que pegamos / O que não pegamos / Limites**, depois objetivo, tomadas, luz e áudio, câmera, edição, legenda, CTA, hashtags, publi, checagem de regras, hipóteses e pendências.

Marcação de fala: tudo que a Rafa diz em voz alta vai entre **« »** e o painel destaca como fala. Improviso dela entre colchetes: «Pra mim, ele vale porque [motivo dela].» Texto na tela e legenda usam aspas normais.

### 2.7 Estúdio de gravação

iPhone 16 Pro, OBSBOT Tiny 2, microfone Hollyland Lark M2, softboxes, bastões LED, cenário de prateleiras com luz indireta quente. Preferência por setups fixos e simples.

---

## 3. Telas do painel

Login por link mágico no e-mail (sem senha), só para e-mails cadastrados como membros. Menu lateral no computador, barra inferior no celular. A tela inicial é **Conteúdos**.

Ordem do menu: Conteúdos · Chat · Biblioteca · Aprovações · Métricas · Atividade dos agentes.

### 3.1 Conteúdos (tela inicial)

Quadro Kanban dos Reels ("peças"). Colunas com cor própria:

| Etapa | Cor |
|---|---|
| Ideia | cinza |
| Roteiro | azul |
| Aprovado | roxo |
| Em produção | laranja |
| Gravado | amarelo |
| Editado | rosa |
| Publicado | verde |

- Arrastar cartões entre etapas. Mover para Publicado pede o link do post.
- Cartão: chip "Reel", versão (v1, v2…), nº de anexos, título EP###, **selo de evidência** (forte/média/fraca com a razão, ou "Sem evidência"), autor e tempo.
- **Nova ideia** cria uma peça na etapa Ideia.
- **Lixeira**: peças arquivadas, restauráveis.
- Detalhe da peça: roteiro renderizado (falas destacadas, "Para o Gil" recolhido), histórico de versões, seletor de etapa, cartão **Padrão do Radar** (nome, mecanismo, razões, link do Reel de origem, limites), anexos (ex.: ficha de gravação, roteiro alternativo), etiquetas, métricas.

### 3.2 Chat

Conversa com o Command Center. Cada conversa mostra estado e custo. Mensagens de humanos, Command Center, agentes e sistema; anexos de arquivo.

### 3.3 Biblioteca

Documentos que não são Reels: pautas (listas de ideias), pesquisas, relatórios, fichas. Roteiro vira peça no quadro automaticamente; o resto vira documento.

### 3.4 Aprovações

Pedidos de aprovação abertos pelo Command Center. Gil aprova ou pede alteração com comentário. Um aviso no menu mostra quantas entregas esperam decisão. "Alteração pedida" gera nova versão do mesmo Reel.

### 3.5 Métricas

Curtidas, comentários (e, quando houver acesso a Insights, visualizações, alcance, salvamentos, compartilhamentos) dos Reels publicados, com gráfico por peça. Coleta é manual (botão), sem rotina recorrente.

### 3.6 Atividade dos agentes

Lista cronológica simples do que os agentes fizeram, ligada ao EP### correspondente. Só dois estados ganham destaque: **Aguardando você** e **Falhou**. Itens antigos podem ser arquivados.

---

## 4. Agentes

Rodam no **Claude Managed Agents** (Anthropic). Definições em `supabase/functions/_shared/agentes.ts`, aplicadas pela função `setup`.

### 4.1 Command Center (modelo Opus)

- Conversa com Gil e Rafa. Perguntas simples responde sozinho.
- Trabalho de produção: registra tarefa (`registrar_tarefa`), consulta padrões (`consultar_padroes`) e delega à Produção com briefing completo (padrão, objetivo, formato, duração, produtos, restrições; em revisão, id anterior e alteração exata).
- Ao receber a entrega: lê com `ler_resultado`, confere, marca `aguardando_aprovacao` e abre `pedir_aprovacao`.
- Mensagens "[Aprovação …]" vindas do painel: "alteração pedida" → nova tarefa de revisão; "aprovado" → conclui.
- `consultar_instagram`: dados públicos de perfis, só leitura.
- Subagente permitido: só a Produção. Workflows de muitos agentes desligados (custo).

### 4.2 Produção (modelo Sonnet)

- Recebe o briefing, escolhe o padrão, escreve no formato da seção 2.6 e salva com `entregar_resultado` (sempre com `padrao_id`). Em revisão, lê a versão anterior e altera só o pedido.
- Ferramentas: `entregar_resultado`, `atualizar_tarefa`, `ler_resultado`, `consultar_padroes`.

### 4.3 Ferramentas (executadas pelo servidor)

| Ferramenta | Quem | O que faz |
|---|---|---|
| registrar_tarefa | CC | Cria tarefa na Atividade |
| atualizar_tarefa | ambos | Muda estado/detalhe da tarefa |
| entregar_resultado | Produção | Salva roteiro/pauta/documento (nova versão se substitui outro). Recusa roteiro/pauta sem padrão ≥ 2x |
| ler_resultado | ambos | Lê o texto de um resultado |
| consultar_padroes | ambos | Lista padrões ativos ≥ 2x, filtra por formato, opcionalmente traz os Reels de referência |
| pedir_aprovacao | CC | Abre pedido na tela Aprovações |
| consultar_instagram | CC | Leitura de perfil público via `pesquisa` |

---

## 5. Arquitetura

```
Navegador (Next.js na Vercel)
   │  login Supabase Auth, leitura direta com RLS, Realtime
   ▼
Supabase (Postgres + Auth + Storage + Edge Functions + pg_cron)
   │  ponte: única porta de escrita do painel
   │  sync: cron de 1 min, busca eventos e executa ferramentas
   │  setup: cria/atualiza agentes
   ▼
Claude Managed Agents (Command Center + Produção)
   │
   └─▶ função `pesquisa` do projeto IA com Prosa (HTTP, só leitura) → API do Instagram
```

- **Frontend**: Next.js (App Router, React, Tailwind), pasta `web/`, hospedado na Vercel (plano Hobby), domínio rafastudio.profgilkleber.com.br.
- **Banco**: Supabase. O navegador **só lê** (RLS: só membros veem dados). Toda escrita passa pela Edge Function **ponte** (service role no servidor).
- **Realtime**: o painel assina mudanças das tabelas e atualiza sozinho.
- **Edge Functions**:
  - `ponte` (exige JWT): mensagens do chat, decisões de aprovação, ações `conteudo_*` (mover, editar, arquivar, restaurar, publicação, classe, etiquetas, anexar) e `metricas_coletar`.
  - `sync` (cron a cada minuto, protegido por segredo): lê eventos das sessões dos agentes, executa ferramentas pendentes, grava resultados e custo.
  - `setup` (protegido por segredo): cria ambiente e agentes e guarda os ids em `config`.
  - `_shared/motor.ts` é a única camada que conhece o Managed Agents; trocar de motor = implementar a interface `Motor`.
- **Storage**: bucket `anexos`.

### 5.1 Limites de custo (em código)

- Orçamento total aprovado: **US$ 50/mês** de API.
- Teto por conversa: US$ 3,00 (a sessão pausa).
- Teto mensal: US$ 45,00 (a ponte recusa novas mensagens).
- Configurável na tabela `config` (chave `limites`).

---

## 6. Modelo de dados (Postgres)

| Tabela | Para que serve |
|---|---|
| membros | E-mails autorizados e papel (Gil gestor, Rafa criadora) |
| conversas | Conversas do Chat, estado, custo, último erro |
| mensagens | Mensagens (humano, command_center, agente, sistema) e anexos |
| eventos | Eventos brutos das sessões dos agentes |
| chamadas | Chamadas de ferramenta e respostas |
| tarefas | Atividade dos agentes (código T-####, agente, estado, detalhe, arquivada_em) |
| resultados | Cada versão entregue (série, versão, tipo, título, conteúdo, autor, padrao_id) |
| aprovacoes | Pedidos de aprovação e decisão |
| conteudos | Peças e documentos do quadro (série, etapa, código EP###, classe peca/documento, etiquetas, anexo_de, padrao_id, url/data de publicação, arquivado_em) |
| conteudo_historico | Mudanças de etapa |
| metricas | Coletas de métricas por série |
| padroes | Padrões do Radar (id, nome, reel_origem, perfil, razões, categoria, gancho, estrutura, texto fixo, fala, cortes, duração, evidência, formato_rafa, mecanismo, nao_copiar, ativo) |
| reels_referencia | 144 Reels do Radar (url, criadora, seguidores, data, curtidas, comentários, razões vs mediana, sinais, legenda, padrao_id) |
| config | Ids dos agentes, limites, perfil do Instagram |

Regras automáticas no banco:
- Um resultado tipo roteiro vira peça no quadro; outros tipos viram documento na Biblioteca.
- Peças recebem código EP### sequencial e título normalizado.
- Nova versão de um resultado herda o padrão da anterior.

---

## 7. Integrações

- **IA com Prosa** (outro projeto Supabase): dono da integração com a API do Instagram (Meta). O Rafa Studio só **chama** a função `pesquisa` por HTTP, em leitura. O token fica só no servidor. Qualquer mudança no IA com Prosa exige autorização específica do Gil. **Nunca publicar** em @iacomprosa.
- **Instagram**: business discovery funciona (perfis comerciais públicos). Busca por hashtag está bloqueada até App Review da Meta. Visualizações e alcance da Rafa exigem acesso aos Insights da conta dela.
- **Anthropic (Managed Agents)**: chave só como secret das Edge Functions.

---

## 8. Código, deploy e branches

- Repositório: `gilkleber-design/rafainfluencer` (privado).
- Estrutura:
  - `web/`: painel Next.js (`app/page.tsx`, `components/Conteudos.tsx`, `Chat.tsx`, `Paineis.tsx`, `Metricas.tsx`, `identidade.tsx`, `Md.tsx`, `lib/tipos.ts`).
  - `supabase/migrations/`: schema, RLS, cron, padrões.
  - `supabase/functions/`: `ponte`, `sync`, `setup`, `_shared/`.
  - `supabase/dados/`: seed do Radar (padrões e Reels).
  - `docs/`: esta documentação.
- Branch de trabalho: `rafa-studio-mvp`. **Merge na `main` só com aprovação do Gil.** A `main` publica na Vercel e dispara a integração GitHub do Supabase.
- Migrações são não destrutivas e idempotentes.

---

## 9. Regras de operação (do Gil)

- Pedir aprovação antes de: operações irreversíveis, ativar serviço pago, expor o sistema publicamente, merge na main, mudança de infraestrutura.
- Não criar outro projeto Supabase.
- Vercel Pro só com preço exato aprovado.
- Sem rotinas recorrentes automáticas por enquanto (coleta de métricas e pesquisa são manuais).
- Respostas diretas e curtas, em português.

---

## 10. Estado atual (23/11/2026)

- Painel no ar, teste ponta a ponta aprovado (pedido → roteiro → alteração → v2 → aprovado).
- No quadro:
  - **EP001 · Vale o preço? · Batom Victoria**: Aprovado. Roteiro do Gil (oficial), produto Batom Líquido Bruna Tavares Matte cor Victoria (R$ 50 na Sephora). Anexos: ficha de gravação e alternativa com padrão do Radar (primeiras impressões, 3,4x).
  - **EP002 · Prova da rotina · Blush de R$ 19,99**: Roteiro, padrão investigação-polêmica (17x).
  - **EP003 · Nota da Rafa · Paleta Vivai Infinity Shadows**: Roteiro, padrão explicação técnica (6,4x).
  - **EP004 · Make de 5 minutos · Quando não dá tempo**: Roteiro, padrão lista com regra (2,1x, fraca).
  - **EP005 · Lado a lado · 3 rosinhas pro dia a dia**: Ideia, sem padrão com evidência.

## 11. Pendências

- Inventário de produtos da Rafa (destrava novas pautas).
- Nomes definitivos dos quadros.
- Secrets `PESQUISA_URL`/`PESQUISA_TOKEN` no Rafa Studio para `consultar_instagram` e coleta de métricas.
- Acesso aos Insights da conta da Rafa (visualizações e alcance).
- App Review da Meta para busca por hashtag.
- Ampliar o Radar com mais padrões (hoje 5; um só tem evidência fraca).
- Gravar e publicar o EP001 e medir.
