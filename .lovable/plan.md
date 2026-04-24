## Corrigir visibilidade de perfis criados pelo admin

### Problema
O Angelo foi aprovado e está corretamente vinculado ao Luciano via `user_approvals.created_by_admin`, mas **não aparece no painel admin** do Luciano. A função `can_view_profile` (usada pela RLS de `profiles`) só permite ver perfis de pessoas que compartilham um time ou tarefas com o viewer. Como o Angelo é novo e ainda não tem time/tarefas, seu profile fica invisível — criando um catch-22 em que o admin não consegue ver o usuário que ele mesmo criou.

### Correção

**Migração SQL:** atualizar `public.can_view_profile` adicionando uma cláusula que permite visibilidade quando existe um vínculo admin↔usuário em `user_approvals`:

```sql
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _viewer_id = _target_id
    OR has_role(_viewer_id, 'solution_admin'::app_role)
    -- NOVO: admin pode ver perfis de usuários que ele criou (e vice-versa)
    OR EXISTS (
      SELECT 1 FROM public.user_approvals ua
      WHERE (ua.created_by_admin = _viewer_id AND ua.user_id = _target_id)
         OR (ua.created_by_admin = _target_id AND ua.user_id = _viewer_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = _viewer_id AND tm2.user_id = _target_id
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.created_by = _target_id
        AND (t.created_by = _viewer_id
             OR is_task_assignee(t.id, _viewer_id)
             OR (t.team_id IS NOT NULL AND is_team_member(_viewer_id, t.team_id)))
    )
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      JOIN public.tasks t ON t.id = ta.task_id
      WHERE ta.user_id = _target_id
        AND (t.created_by = _viewer_id
             OR is_task_assignee(t.id, _viewer_id)
             OR (t.team_id IS NOT NULL AND is_team_member(_viewer_id, t.team_id)))
    )
$$;
```

### Resultado esperado
- Luciano abre `/admin` e passa a ver o Angelo (e qualquer outro usuário aprovado que ele tenha cadastrado).
- A relação é simétrica: o usuário recém-criado também consegue ver o perfil do admin que o cadastrou.
- Nenhuma alteração em código frontend ou em outras políticas RLS.

### Risco
Baixo. A nova condição apenas amplia visibilidade entre admin e seus próprios usuários — não expõe dados a terceiros nem afeta o isolamento entre admins distintos (que continua intacto via `created_by_admin`).
