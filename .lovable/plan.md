

# Higienizar banco de dados

## Estado atual

| user_id | Nome | Roles | Manter? |
|---|---|---|---|
| f1c5f326... | Luciano Figueredo (lqfigueredo) | admin, user | ✅ |
| 4165e1ab... | lu (lu@email.com) | solution_admin, user | ✅ |
| b0e928fc... | Luciano | user | ❌ |
| c831205c... | Teste User | user | ❌ |

Dados existentes: 2 tasks, 3 assignees, 1 comment, 2 meeting minutes, 1 user_approval, 1 team (TESTE).

## Plano

### 1. Limpar dados dos usuários a remover

Usar a ferramenta de inserção/deleção para remover registros das tabelas públicas associados aos IDs `b0e928fc-3c63-4d14-a470-c0833bc06c73` e `c831205c-48a3-4894-8257-2fc018287060`:

- `task_assignees`, `task_comments`, `task_change_logs`, `delivery_date_logs` — onde `user_id` é um dos removidos
- `tasks` — onde `created_by` é um dos removidos
- `meeting_participants`, `meeting_pendencies`, `meeting_minutes` — onde pertence a esses usuários
- `user_approvals` — onde `user_id` é um dos removidos
- `team_members` — onde `user_id` é um dos removidos
- `user_roles` — onde `user_id` é um dos removidos
- `profiles` — onde `user_id` é um dos removidos

### 2. Remover usuários do auth

Criar/usar uma edge function temporária (ou o `admin-manage-user` existente) para chamar `supabase.auth.admin.deleteUser()` para os dois IDs a remover.

### Resultado

Banco limpo com apenas os 2 usuários: lqfigueredo (admin) e lu@email.com (solution_admin).

