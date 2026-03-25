

# Funcionalidade Completa de Equipe

Implementar criação de time, convite de membros por email e visualização de tarefas da equipe na página Equipe.

## Mudanças

### 1. Migration — Corrigir RLS e adicionar políticas faltantes

A policy SELECT da tabela `teams` tem um bug (`team_members.id` em vez de `teams.id`). Corrigir e adicionar políticas para UPDATE/DELETE em `teams`, e policy SELECT em `team_members` e `task_assignees` para membros do time.

```text
- DROP + CREATE policy "Members can view team" em teams (corrigir JOIN)
- ADD policy "Creator can update team" em teams
- ADD policy "Creator can delete team" em teams
```

### 2. Página Team (`src/pages/Team.tsx`) — Funcionalidade completa

**Sem time criado:** Mostrar card com botão "Criar Time" + campo para nome do time.

**Com time criado (criador):**
- Nome do time com indicador de membros (X/5)
- Lista de membros com avatar, nome e email
- Botão remover membro (exceto o criador)
- Campo para convidar por email (busca na tabela `profiles` por `user_id` via lookup no auth — como não temos acesso a `auth.users`, buscaremos pelo `display_name` ou criaremos uma abordagem de convite por user_id existente no sistema)
- Seção "Tarefas da Equipe": Kanban simplificado ou lista de tarefas do time

**Com time (membro):**
- Visualizar membros e tarefas do time (somente leitura)

### 3. Convite de membros

Como não temos acesso à tabela `auth.users` pelo client, o convite funcionará assim:
- O criador digita o email do membro
- Buscamos na tabela `profiles` (precisamos adicionar campo `email` ou usar edge function)
- Alternativa mais simples: criar uma edge function que busca o `user_id` pelo email em `auth.users` e retorna o `user_id` + `display_name`

Usaremos uma **edge function** `lookup-user-by-email` que recebe o email, busca em `auth.users` com service role, e retorna `{ user_id, display_name }` se existir.

### 4. Visualização de tarefas da equipe

Na página Equipe, mostrar todas as tarefas onde `team_id` corresponde ao time do usuário. Isso requer que ao criar tarefas, o usuário possa opcionalmente associá-las ao time.

- Adicionar campo opcional "Time" no `CreateTaskDialog` (se o usuário tem time)
- Na página Equipe, listar tarefas com `team_id = <team do usuário>` em formato de lista/tabela simples com status, título, responsáveis e datas

### 5. RLS para tarefas do time

Atualizar a policy SELECT de `tasks` para permitir que membros do time vejam tarefas do time:

```text
- ADD policy "Team members can view team tasks" em tasks FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
```

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| Migration SQL | Fix teams RLS, add UPDATE/DELETE policies, add team tasks SELECT policy |
| `supabase/functions/lookup-user-by-email/index.ts` | Nova edge function para buscar usuário por email |
| `src/pages/Team.tsx` | Página completa: criar time, listar membros, convidar, ver tarefas |
| `src/components/kanban/CreateTaskDialog.tsx` | Adicionar campo opcional de time |
| `src/components/kanban/KanbanBoard.tsx` | Nenhuma mudança necessária |

## Fluxo do usuário

1. Usuário acessa "Equipe" → vê botão "Criar Time"
2. Cria time com nome → aparece painel de gerenciamento
3. Digita email de colega → sistema busca via edge function → adiciona como membro (máx 5)
4. Ao criar tarefa, pode associar ao time
5. Na página Equipe, todos os membros veem as tarefas do time

