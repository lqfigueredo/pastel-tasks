# Redesign Mobile (Desktop Preservado)

Criar uma camada de UI dedicada para celulares, ativada por breakpoint (`< 768px`). O desktop continua **exatamente** como está hoje — nada será removido nem alterado em `md:` ou maior. Mantemos a identidade Mint & Cream e a tipografia atuais; o que muda é a **composição e a ergonomia para toque**.

## Princípios do mobile

- **Hierarquia vertical**: uma coluna, conteúdo importante acima da dobra, ações primárias ao alcance do polegar.
- **Navegação por baixo**: sidebar lateral é substituída por uma **bottom tab bar fixa** com 5 itens principais + botão "Mais".
- **Topbar enxuta**: logo compacto à esquerda, ações contextuais (busca, notificações, avatar) à direita.
- **Touch targets ≥ 44px**, espaçamentos generosos, tipografia ligeiramente maior, sem hover-only.
- **Sheets em vez de Dialogs**: formulários e detalhes abrem em `Sheet` deslizando de baixo (mais natural em celular).
- **Tabelas viram cards**: listas densas (tarefas, reuniões, ideias, usuários) são reorganizadas em cards empilhados com swipe actions onde fizer sentido.

## Estrutura técnica

### 1. Shell mobile novo
- `src/components/layout/MobileShell.tsx` — header fixo (56px) + área de conteúdo com `padding-bottom` para a tab bar + `MobileBottomNav` (64px) fixo.
- `src/components/layout/MobileBottomNav.tsx` — 5 itens: Dashboard, Kanban, Reuniões, Tarefas, Mais. O "Mais" abre um `Sheet` com o restante do menu (Ideias, Instruções, Base de Conhecimento, Suporte, Admin, etc.).
- `src/components/layout/MobileTopBar.tsx` — logo + sino de notificações + avatar.

### 2. Roteamento condicional no layout
- Em `src/App.tsx` (ou no layout autenticado existente), detectar viewport via hook `useIsMobile` já presente em `src/hooks/use-mobile.tsx`.
- Se mobile: renderizar `<MobileShell><Outlet /></MobileShell>`.
- Se desktop: manter o `SidebarProvider + AppSidebar` atual **sem mudanças**.

### 3. Auth (`/auth`) mobile
- Card full-width, padding lateral 16px, logo centralizado no topo, campos com `h-12`, botão primário full-width fixo na base do viewport, toggle login/cadastro em tabs grandes.
- Modal de Termos/Privacidade já é `Dialog` — no mobile vira `Sheet` (bottom sheet) com altura 90vh.

### 4. Telas autenticadas — adaptações mobile

| Tela | Mudança mobile |
|---|---|
| Dashboard | Cards de métricas em grid 2 colunas; widgets longos em scroll horizontal "snap" |
| Kanban | Colunas em scroll horizontal com snap por coluna; criar tarefa via FAB (botão flutuante) |
| Detalhes de Tarefa | Abre como `Sheet` full-height em vez de página cheia |
| Reuniões | Calendário em modo agenda (lista por dia); gravador com controles grandes |
| Tarefas (lista) | Cards empilhados com prioridade colorida na borda esquerda |
| Ideias | Grid 1 coluna com cards maiores |
| Instruções de Trabalho | Lista com thumbnail + título; PDF abre em viewer full-screen |
| Base de Conhecimento | Tabs no topo (Links / Arquivos), busca fixa |
| Suporte (chat) | Layout full-screen estilo WhatsApp, input fixo embaixo |
| Admin financeiro | Tabelas convertidas em cards; ações em menu de contexto |
| Notificações | Sheet deslizando da direita ao tocar no sino |
| Timer/Pomodoro | Indicador global vira pill flutuante acima da bottom nav |

### 5. Componentes utilitários mobile
- `MobileSheet` — wrapper do `Sheet` com altura padrão 85vh, handle visual no topo.
- `MobileCardList` — converte arrays em cards padronizados.
- `MobileFab` — botão flutuante de ação primária, posicionado acima da bottom nav.
- `useMobileNavItems` — hook que devolve itens visíveis e itens do "Mais" baseado no papel do usuário.

### 6. i18n
Novas chaves em `pt-BR/common.json` e `en/common.json` para a bottom nav (`nav.dashboard`, `nav.more`, etc.) e títulos de sheets mobile.

## Fora de escopo

- Nenhuma alteração em lógica de negócio, RLS, edge functions ou banco.
- Desktop (`md:` e acima) permanece pixel-idêntico.
- Sem PWA / instalação no celular (pode ser próxima etapa).
- Sem refatoração de componentes desktop existentes — apenas envolvidos pelo shell condicional.

## Entrega faseada sugerida

1. **Fase 1 (base)**: `useIsMobile` no layout, `MobileShell`, `MobileTopBar`, `MobileBottomNav`, Auth mobile, Dashboard mobile.
2. **Fase 2 (operação diária)**: Kanban, Tarefas, Detalhes de Tarefa em Sheet, Reuniões.
3. **Fase 3 (resto)**: Ideias, Instruções, Base de Conhecimento, Suporte, Admin, Notificações.

Posso começar pela Fase 1 assim que aprovar; as fases seguintes vêm em iterações curtas para você validar no celular antes de avançar.
