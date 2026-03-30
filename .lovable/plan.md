
# Francisco ainda não vê as tarefas atribuídas — diagnóstico confirmado

## O que eu verifiquei
Confirmei no banco que o usuário `francisco@institutototum.com.br` realmente tem tarefas atribuídas, incluindo:

- `Melhoria de NF`
- `Estudo de NF`

Também confirmei que os status dessas tarefas já estão visíveis (`Em andamento` e `Finalizado`), então o problema agora **não é mais coluna/status**.

## Causa real
A requisição do quadro para buscar tarefas está falhando com erro 500:

```text
infinite recursion detected in policy for relation "tasks"
```

### Ciclo que está acontecendo hoje
```text
tasks (policy de SELECT para assignee)
  -> consulta task_assignees
     -> task_assignees tem policy que consulta tasks
        -> tasks volta a consultar task_assignees
           -> loop infinito
```

Ou seja: as tarefas existem, mas a consulta quebra por causa da RLS, então nada aparece no quadro.

## Plano de correção

### 1. Remover a recursão da RLS de tarefas
Criar funções `SECURITY DEFINER` para checar permissões sem depender de políticas que se referenciam entre si:

- `is_task_assignee(_task_id uuid, _user_id uuid)`
- `is_task_owner(_task_id uuid, _user_id uuid)`

Essas funções vão consultar diretamente as tabelas necessárias e evitar o loop de RLS.

### 2. Reescrever as policies da área de tarefas para usar essas funções
Atualizar as policies que hoje dependem de `EXISTS (...)` com `tasks` e `task_assignees` se chamando indiretamente.

#### Tabelas a revisar na migration
- `tasks`
  - policy de SELECT para assignees
  - policy de UPDATE para assignees (recomendado, para permitir mover card)
- `task_assignees`
  - policy do dono da tarefa
- `task_comments`
- `task_change_logs`
- `task_attachments`
- `delivery_date_logs`

Motivo: mesmo que o quadro volte a listar as tarefas, o mesmo padrão de recursão pode quebrar detalhes, comentários, histórico e anexos ao abrir uma tarefa atribuída.

### 3. Manter o frontend do quadro como está
No `KanbanBoard.tsx`, a query já está correta:

```ts
supabase.from('tasks').select('*').order('created_at', { ascending: false })
```

Então a correção principal é no backend/permissões. Não preciso mexer na listagem do Kanban para este problema específico.

## Resultado esperado após a correção
- Francisco volta a ver as tarefas atribuídas a ele no Kanban
- As colunas continuam visíveis
- A abertura do card também passa a funcionar sem erro de permissão/recursão
- Se eu incluir a policy de UPDATE para assignees, ele também poderá mover o card entre colunas

## Arquivos que pretendo alterar
- Nova migration SQL para funções + ajuste das policies RLS

## Validação depois da implementação
1. Logar como `francisco@institutototum.com.br`
2. Abrir `/`
3. Confirmar que `Melhoria de NF` e `Estudo de NF` aparecem
4. Abrir uma dessas tarefas para validar comentários/histórico/anexos
5. Testar mover o card, caso a policy de update do assignee entre junto
