# Plano: Eliminar scroll horizontal global e reforçar responsividade

## Diagnóstico

Auditei os principais layouts (`AppLayout`, `Index/Tarefas`, `Financial`, `SubscriptionsTab`, `KanbanBoard`, `responsive-table`) e identifiquei 4 causas raiz para barras de rolagem horizontais aparecerem na página inteira (em vez de ficarem confinadas ao container interno):

1. **Falta de `min-w-0` em flex children** — `AppLayout` usa `SidebarProvider` (flex row) com `<div class="flex-1 flex flex-col">`. Sem `min-w-0`, qualquer tabela/board interno empurra a coluna inteira além do viewport, gerando scroll na `<body>` em vez de no wrapper interno.
2. **Header de `/tarefas` (Index.tsx)** — barra de ações com `KanbanSavedFilters` + Select 200px + botão "Exportar CSV" + botão "Nova Tarefa" + título. Tem `flex-wrap`, mas o bloco de ações da direita não é um único grupo `flex-wrap`, então em viewports ~1000–1280 (com sidebar aberta) os botões saem do container.
3. **`<main>` sem contenção horizontal** — `<main class="flex-1 overflow-auto p-6">` permite overflow vertical e horizontal. Trocar para `overflow-y-auto` + `min-w-0` impede que conteúdo largo crie scroll global.
4. **Tabelas e KanbanBoard** — já usam `overflow-x-auto` localmente (✅), mas dependem do pai ter `min-w-0` para funcionarem como ilhas roláveis.

## Mudanças propostas

### 1. `src/components/AppLayout.tsx` — base do layout
- Adicionar `min-w-0` ao wrapper `<div class="flex-1 flex flex-col">` para que ele possa encolher abaixo do conteúdo.
- Trocar `<main class="... overflow-auto ...">` por `<main class="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 md:p-6">` — confina scroll horizontal ao wrapper interno e reduz padding em telas pequenas.
- Adicionar `min-w-0` no `<header>` para o título não empurrar o header.

### 2. `src/index.css` — guard global
- Adicionar `html, body { overflow-x: hidden; }` como rede de segurança (apenas no eixo X — vertical permanece normal).
- Adicionar utilitário `.no-scrollbar` (já útil para tabs do Kanban mobile) escondendo a barra mas mantendo scroll por toque.

### 3. `src/pages/Index.tsx` — header de Tarefas
- Reagrupar a barra de ações da direita em `<div class="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">` para que os 4 controles quebrem para a próxima linha em telas menores antes de estourar.
- Trocar `SelectTrigger w-[200px]` por `w-full sm:w-[200px]` para ocupar toda a largura quando empilhado.
- Botões "Exportar CSV" e "Nova Tarefa" com `flex-1 sm:flex-none` no mobile, para dividirem a linha.
- Aplicar `text-xl md:text-2xl` no `<h1>` e `truncate` no subtítulo container.

### 4. `src/pages/Financial.tsx` (e similares com tabs/tabelas)
- Adicionar `min-w-0` no container raiz da página.
- Garantir que cada wrapper `overflow-x-auto` esteja envolto em um pai com `min-w-0` (verificar e ajustar onde necessário).
- Tabs dentro de Financial: aplicar `overflow-x-auto no-scrollbar` no `TabsList` para permitir rolagem horizontal das abas em telas estreitas, sem empurrar a página.

### 5. `src/components/kanban/KanbanBoard.tsx`
- Confirmar/ajustar wrapper para `<div class="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory md:snap-none">` — adiciona scroll-snap para colunas em telas médias (mais ergonômico) e bordas negativas para o scroll respeitar o padding da página.

### 6. Verificação visual após mudanças (modo default)
- Abrir `/tarefas`, `/financeiro`, `/equipe/:id`, `/atas` em viewports 360, 768, 1024, 1280 e confirmar que **não há scroll horizontal no `<body>`** — apenas em containers internos quando aplicável (tabela, kanban).
- Conferir que botões "Exportar CSV" e "Nova Tarefa" continuam acessíveis em mobile.

## Arquivos modificados (estimativa)
- `src/components/AppLayout.tsx`
- `src/index.css`
- `src/pages/Index.tsx`
- `src/pages/Financial.tsx`
- `src/components/kanban/KanbanBoard.tsx`

## Fora de escopo
- Refatoração visual maior (cores, tipografia).
- Reescrita das tabelas em cards mobile (já existe `ResponsiveTable` para isso e segue funcional).
- Mudanças nos diálogos/drawers (já são `ResponsiveDialog`).

Aprovando, aplico em sequência e valido nos breakpoints listados.