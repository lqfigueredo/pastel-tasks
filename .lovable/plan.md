

## Problema: Comentários de Jonathas não são salvos

### Causa raiz

Jonathas consegue **visualizar** tarefas da equipe (a política de SELECT permite via `team_members`), mas a política de **INSERT** na tabela `task_comments` exige que o usuário seja **dono** ou **responsável** pela tarefa. Em tarefas onde ele é apenas membro da equipe (sem ser assignee), o insert é bloqueado silenciosamente pelo banco.

Além disso, o código não trata erros do insert — então o comentário some sem nenhuma mensagem de erro.

### Solução

#### 1. Migration — permitir membros de equipe comentarem

Adicionar uma nova política de INSERT na tabela `task_comments` que permita membros da equipe inserir comentários:

```sql
CREATE POLICY "Team members can add comments"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
      AND t.team_id IS NOT NULL
      AND is_team_member(auth.uid(), t.team_id)
  )
);
```

Também adicionar política de SELECT para membros da equipe (caso não exista):

```sql
CREATE POLICY "Team members can view task comments"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
      AND t.team_id IS NOT NULL
      AND is_team_member(auth.uid(), t.team_id)
  )
);
```

#### 2. Código — tratar erros no insert de comentários

**Arquivo: `src/components/kanban/TaskDetailDialog.tsx`**

Na função `addComment`, capturar o erro do insert e exibir um toast de erro caso falhe, em vez de silenciosamente limpar o campo.

### Arquivos modificados
- **Migration SQL** — 2 novas políticas RLS em `task_comments`
- `src/components/kanban/TaskDetailDialog.tsx` — tratamento de erro no `addComment`

