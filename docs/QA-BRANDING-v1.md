# QA: branding v1 no Rafa Studio

Branch `design/rafa-editorial-v1`, criada a partir de `rafa-studio-mvp` (já igual à `main` em código de tela). **Pronta para revisão. Merge na main e publicação dependem da autorização do Gil.** A especificação seguida é `RAFA_STUDIO_IMPLEMENTACAO_CLAUDE.md` v1.0 (23/11/2026).

## Mudanças funcionais

Nenhuma. Não houve alteração em lógica, banco, migrações, Edge Functions, agentes, Supabase, autenticação, domínio, segredos nem integração Meta. Rótulos e valores de etapa e evidência persistidos no banco não mudaram; só as cores.

## Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `web/app/rafa-studio.css` (novo) | Tokens `--rs-*` do kit, copiados sem alteração |
| `web/app/globals.css` | Importa os tokens e a Instrument Serif. Tema único dark-first: as variáveis semânticas do painel apontam para a paleta oficial. Etapas usam `--rs-stage-*` e evidências usam `--rs-evidence-*`. O foco visível agora é Champagne e o títulos editoriais ficam sem negrito sintético |
| `web/app/layout.tsx` | Classe `rs-theme`, `color-scheme` dark, `theme-color` Noir, favicons e apple-touch-icon |
| `web/app/manifest.ts` (novo) | Manifesto PWA do kit (ícones 192 e 512, cor Noir) |
| `web/public/` (novo) | `favicon.ico`, `favicon-16/32.png`, `apple-touch-icon.png`, `icon-192/512.png` e `marca/` com os SVGs em paths (empilhado, horizontal, monograma e app icon, todos `-dark`) |
| `web/app/page.tsx` | Logotipo oficial (empilhado na sidebar e no login, horizontal no topo do celular, monograma no carregamento). Topo desktop com "Da ideia ao próximo take." e login redesenhado. Item ativo da sidebar com fundo Plum e indicador Blush, `aria-current` e alvos de toque ≥ 44 px. Ordem do menu inalterada |
| `web/components/ui.tsx` | Botão primário Blush com texto Noir. Secundário Plum elevado com borda. Destrutivo com borda vermelha. Cartões e selos nos tokens |
| `web/components/Conteudos.tsx` | Colunas do Kanban com cabeçalho tingido na cor da etapa e cartões elevados. Títulos editoriais maiores |
| `web/components/Chat.tsx`, `Paineis.tsx`, `Metricas.tsx` | Títulos editoriais. Avatar do Command Center em Blush |
| `web/components/identidade.tsx` | Cores dos avatares dos agentes nos tokens (sem branco fixo) |
| `web/package.json` | `+@fontsource/instrument-serif` e `-@fontsource-variable/fraunces` |

**Sobre as fontes:** a Instrument Serif (licença OFL) entra pelo pacote npm `@fontsource`, o mesmo mecanismo que o projeto já usa para a Inter. Assim o build não depende de baixar do Google, e nenhum arquivo de fonte foi copiado para o repositório.

## Verificações

| Verificação | Resultado |
|---|---|
| `npm run lint` (tsc --noEmit) | OK, sem erros |
| `next build` | OK (rotas `/` e `/manifest.webmanifest`) |
| Testes de função (`deno test`) | Não rodados: nenhuma função foi alterada |
| Overflow horizontal em 320, 360, 390, 430, 768, 1024 e 1440 px, nas 6 áreas e no login (49 combinações) | 0 ocorrências. O scroll horizontal do Kanban fica dentro da área própria dele |
| Fontes carregadas | Inter Variable e Instrument Serif. Os fallbacks Georgia e system-ui não quebram o layout |
| Foco por teclado | Contorno Champagne de 3 px (print 9) |
| `prefers-reduced-motion` | Regra do kit aplicada a todo o tema |

### Contraste (WCAG AA, pares reais)

| Par | Razão |
|---|---|
| Texto Porcelain sobre Noir / Plum / Raised | 17,6 / 15,7 / 14,2 |
| Texto secundário `#D1C3CE` sobre Plum | 10,0 |
| Texto de apoio `#A995A7` sobre Plum / Raised | 6,1 / 5,5 |
| Botão primário (Noir sobre Blush) | 9,2 |
| Blush sobre accent-subtle | 7,0 |
| Rótulo de etapa sobre o próprio fundo tingido | de 4,8 a 8,4 |
| Selo de evidência sobre o próprio fundo | de 5,2 a 6,2 |
| Erro, alerta, ok e info sobre o fundo suave | de 4,7 a 6,1 |

Ajuste feito: os rótulos de "Ideia" e "Sem evidência" com as cores puras do kit davam 4,1 e 3,9, abaixo de 4,5. Por isso o texto dos selos usa a cor da etapa ou da evidência misturada com 20% de Porcelain. A cor de identificação (ponto e borda) continua igual à do kit.

## Checklist da seção 8

- [x] Hierarquia, paleta e atmosfera editorial do mockup.
- [x] Logotipo em SVG paths, nítido, no desktop e no celular.
- [x] Menus e rotas preservados; Conteúdos continua como tela inicial.
- [x] Kanban de 7 etapas com rótulos corretos (estado vem do banco).
- [x] EP001 com dados reais (Aprovado, Batom Victoria). Nada herdado do mockup.
- [x] Evidência do Radar mostra a razão real ou "Sem evidência".
- [x] Chat mantém a troca com o Command Center e os anexos (sem mudança de lógica).
- [x] Aprovação mantém versões, comentários e histórico.
- [x] Responsivo de 320 a 1440 px, sem recortes nem vazamentos.
- [x] Nada mexido em lógica, segredos, Supabase, agentes, domínio ou deploy.
- [x] Build, typecheck e QA visual documentados. O fluxo ponta a ponta real (pedido, roteiro, alteração e v2) não foi refeito porque nenhuma lógica mudou. Ele pode ser repetido no preview depois do ok.

## Evidências

Prints locais com dados de teste do painel (mock, sem acesso ao banco real), em `/mnt/project-files/rafa-studio/branding-v1/qa/`:
- `antes/`: versão atual em produção, tema claro, 1440 e 390 px.
- `depois/`: esta branch, 1440 e 390 px.

Telas capturadas: 1 Conteúdos, 2 detalhe EP002, 3 Chat, 4 Biblioteca, 5 Aprovações, 6 Métricas, 7 Atividade, 8 Login, e 9 foco por teclado (só depois).

## Limitações conhecidas

- O painel passa a ser só escuro, como manda a especificação ("dark-first"). Não existe mais tema claro.
- A Vercel gera um preview automático da branch quando ela é enviada ao GitHub, como já acontece com a `rafa-studio-mvp`. Não foi feito deploy de produção.
