

## Apuração geral — Desencontros de isolamento entre admins

### Resumo do que está acontecendo
Existem **dois admins separados** no sistema (Luciano Figueredo e Luciano Figueredo - GMAIL), cada um com seu time, mas várias tabelas estão **vazando dados entre eles** porque a RLS é frouxa **OU** porque o client não filtra. O bug das ideias era só a ponta do iceberg.

### Mapa de problemas confirmados via banco

| # | Tabela | O que vaza | Causa | Severidade |
|---|--------|------------|-------|------------|
| 1 | `task_statuses` (globais, `team_id IS NULL`) | Status "TESTE", "Backlog", "Em Desenvolvimento", "Concluída" criados por admins diferentes aparecem **para todo mundo** no Kanban | Policy `"All users can view global statuses"` + hook `useStatusesQuery` busca todos sem filtro por `created_by` | 🔴 **Alta** — visível no Kanban de todos os admins |
| 2 | `teams` | Admin vê times que não criou e dos quais não é membro (ex: "TESTE" do GMAIL aparecia para o Luciano) | Policy `"Admins can view all teams"` libera SELECT global por role admin | 🔴 **Alta** — já corrigida no client mas RLS continua frouxa |
| 3 | `profiles` | Todo authenticated vê **todos os perfis** do sistema (display_name, avatar, theme) | Policy `"Users can view all profiles" USING (true)` | 🟡 **Média** — vaza nomes/foto entre tenants (não senha/email) |
| 4 | `task_statuses` (Settings page) | `Settings.tsx` lista TODOS os status globais sem filtro por criador → admin pode editar/deletar status de outro admin | Policy `"Users can update/delete own statuses"` permite update se `created_by = auth.uid()` (OK) **mas** o SELECT mostra tudo, confundindo a UI | 🟡 **Média** |

### Itens auditados e **OK** ✅
- `tasks` / `task_assignees` — SELECT só por owner, assignee ou membro do time. Sem vazamento.
- `ideas` — SELECT só por criador ou time. Sem vazamento (bug era só na lista de teams do dropdown).
- `meeting_minutes`, `task_comments`, `task_change_logs`, `knowledge_sources`, `recurring_tasks` — todas com escopo correto por owner/team/membership.
- `Admin.tsx` — já filtra `teams` por `created_by`.
- `CreateTaskDialog`, `KnowledgeBase`, `Ideas`, `WorkInstructions`, `EditIdeaDialog`, `CreateIdeaDialog` — já filtram teams por membership (correções anteriores).

### Plano de correção

**Migration única** (aplicada ao banco):

1. **`task_statuses` globais** — substituir SELECT global por: cada usuário vê só `is_default = true` (sistema) **ou** os que ele mesmo criou **ou** de times dos quais é membro. Já existe a policy correta `"Users can view own or default statuses"`; basta **remover** a duplicata `"All users can view global statuses"` que sobrescreve com escopo amplo.

2. **`teams`** — remover policy `"Admins can view all teams"` (admin não precisa ver times de outros admins; `solution_admin` continua tendo acesso global via outra rota se necessário). Manter `"Members can view team"` e `"Creator can view own team"`.

3. **`profiles`** — restringir SELECT para: o próprio usuário **+** perfis de pessoas que compartilham pelo menos um time com ele **+** `solution_admin`. Usar uma função `SECURITY DEFINER` `can_view_profile(_viewer, _target)` para evitar recursão.

**Ajuste no client** (1 arquivo):

4. **`Settings.tsx`** — após restringir RLS de `task_statuses`, a UI vai listar só os relevantes automaticamente. Adicionar fallback visual se a query voltar vazia para o usuário.

### Diagrama do isolamento depois da correção

```text
Admin A (Luciano) ──┐
                    ├─ vê: seus times + ideias + status próprios
                    └─ NÃO vê: times/status do Admin B
Admin B (GMAIL) ────┐
                    ├─ vê: seus times + ideias + status próprios  
                    └─ NÃO vê: times/status do Admin A
solution_admin ─────► vê tudo (mantido)
profiles ───────────► só perfis de quem compartilha time + próprio
```

### Riscos e o que NÃO vou mexer

- **Não vou apagar** os status duplicados no banco — eles já estão vinculados a tarefas. Só restringir visibilidade. Você pode arquivar manualmente depois pelo Settings.
- **Não vou** mexer nas policies de `task_assignees`/`tasks` — já estão corretas.
- **Risco baixo**: a única quebra possível é se algum componente assumia ver perfis de qualquer um (ex: avatar de criador externo). Vou rodar busca prévia para confirmar que `profiles` é sempre consumido em contextos onde há time/tarefa em comum.

### Etapas

1. Migration: drop policies inseguras + criar policies estritas + função `can_view_profile`.
2. Verificar se `Settings.tsx` precisa de aviso visual.
3. Atualizar memory `mem://security/admin-isolation` com regras finais.

