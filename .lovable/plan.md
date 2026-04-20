

## Fase 1 — UX de alto impacto

Implementação das 6 mudanças críticas identificadas na avaliação heurística.

### 1. Sidebar agrupada por contexto

`src/components/AppSidebar.tsx` — converter a lista plana em 3-4 `SidebarGroup` com `SidebarGroupLabel`:

- **Trabalho**: Dashboard, Minhas Tarefas, Equipe, Agenda, Temporizador
- **Documentação**: Atas de Reunião, Instruções de Trabalho, Registro de Ideias, Fonte de Conhecimento
- **Administração** (visível só com `isAdmin`): Configurações, Administração, Cobrança
- **Operação** (visível só com `isSolutionAdmin`): Financeiro

Quando `collapsed`, os labels são ocultados (já é o comportamento padrão do shadcn — só os ícones permanecem).

### 2. Confirmação ao sair

`src/components/AppSidebar.tsx` — substituir o `onClick={signOut}` direto por um `AlertDialog`:

```text
"Sair da conta?"
"Você precisará entrar novamente para acessar."
[Cancelar] [Sair]
```

### 3. Componente reutilizável `<EmptyState />`

Criar `src/components/ui/empty-state.tsx`:

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

Visual: ícone grande circular com fundo `bg-muted/40`, título, descrição opcional, botão de ação opcional. Padding generoso, centralizado.

Aplicar em:
- **KanbanColumn** quando `tasks.length === 0` (hoje só mostra coluna vazia) → "Nenhuma tarefa aqui ainda" + CTA "Nova tarefa"
- **NotificationBell** quando lista vazia → "Tudo em dia" + descrição "Você verá aqui avisos de prazos e reuniões"
- **MeetingMinutes**, **Ideas**, **KnowledgeBase** quando lista vazia → ícone + título + CTA do próprio módulo

### 4. Validação inline em formulários críticos

**`src/pages/Auth.tsx`**: adicionar estado de erros por campo + render de `<p className="text-xs text-destructive">` abaixo de cada `Input`. Validações:
- Email: regex válido + obrigatório
- Senha: mínimo 6 caracteres + obrigatório
- Nome (cadastro): obrigatório, mínimo 2 caracteres

Mostrar erro `onBlur` (não a cada keystroke). Limpar erro ao digitar.

**`src/components/kanban/CreateTaskDialog.tsx`**: 
- Título obrigatório → erro inline "Informe um título" abaixo do input
- Datas com ano fora de 1900-2100 → erro inline (substitui o toast atual)
- Botão "Criar" desabilitado enquanto `!title.trim()`

### 5. Filtro de responsável com chip + contagem

`src/pages/Index.tsx` — quando `filterAssigneeId` está ativo:
- Mostrar chip removível ao lado do `Select`: `[Filtro: João Silva ✕]`
- Substituir subtítulo "Gerencie suas atividades no quadro Kanban" por contagem dinâmica: `"42 tarefas visíveis"` (ou `"3 de 42 tarefas (filtradas por João Silva)"` quando filtrado)
- A contagem vem de `KanbanBoard` via callback `onCountChange?: (visible: number, total: number) => void`

### 6. Toasts de erro mais úteis

Criar helper `src/lib/toast-helpers.ts`:

```ts
export function errorToast(action: string, error?: { message?: string }) {
  toast({
    title: `Não foi possível ${action}`,
    description: error?.message 
      ? `Detalhes: ${error.message}` 
      : 'Verifique sua conexão e tente novamente.',
    variant: 'destructive',
  });
}
```

Aplicar nos pontos de maior atrito identificados (escopo limitado à Fase 1, sem refatorar tudo):
- `KanbanBoard` (mover tarefa)
- `CreateTaskDialog` (criar)
- `Auth` (entrar/cadastrar)
- `NotificationBell` (marcar como lida)

### Arquivos afetados

**Novos:**
- `src/components/ui/empty-state.tsx`
- `src/lib/toast-helpers.ts`

**Modificados:**
- `src/components/AppSidebar.tsx` (agrupamento + AlertDialog logout)
- `src/pages/Auth.tsx` (validação inline)
- `src/components/kanban/CreateTaskDialog.tsx` (validação inline + EmptyState não se aplica aqui)
- `src/components/kanban/KanbanColumn.tsx` (EmptyState quando vazio)
- `src/components/kanban/KanbanBoard.tsx` (callback de contagem)
- `src/pages/Index.tsx` (chip removível + contagem)
- `src/components/NotificationBell.tsx` (EmptyState)
- `src/pages/MeetingMinutes.tsx`, `src/pages/Ideas.tsx`, `src/pages/KnowledgeBase.tsx` (EmptyState quando vazio)

### Fora de escopo (vai para Fase 2/3)

- Padronização de loading states (`<PageLoader />`, skeletons)
- Breadcrumb no header
- Agrupamento de notificações por data + filtro por tipo
- Datas humanizadas ("Vence amanhã")
- Microcopy global, mobile pass, atalhos de teclado, busca global

