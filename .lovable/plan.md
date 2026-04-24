
## Edição de usuários para o admin (em `/admin`)

Hoje a tela `/admin` (Luciano) permite **promover/rebaixar** e **ativar/inativar** usuários, mas não permite editar nome, e-mail ou trocar de time. Toda a edição de perfil hoje é exclusiva do `solution_admin` (via `approve-user` em `/financial`). Vou estender a função `admin-manage-user` e adicionar um diálogo de edição na tela do admin, mantendo o isolamento por `created_by_admin` que já existe.

### O que será adicionado

#### 1. Backend — `supabase/functions/admin-manage-user/index.ts`

Adicionar três novas actions, todas reaproveitando a verificação de tenant já existente (admin só age sobre usuários que ele aprovou; `solution_admin` age em qualquer um):

- **`get_user_info`** — retorna o e-mail atual do `auth.users` (necessário para preencher o form).
- **`update_profile`** — atualiza:
  - `profiles.display_name` (sanitizado, max 100)
  - `auth.users.email` (validação de regex; usa `auth.admin.updateUserById`; trata erro de e-mail duplicado com mensagem amigável)
- **`assign_team`** — define o time do usuário em `team_members`:
  - Se `teamId === null` → remove o usuário de qualquer time.
  - Caso contrário → faz upsert (remove o vínculo anterior e insere o novo).
  - Valida que o time pertence ao mesmo admin (consultando `teams.created_by`).

A action `promote/demote` continua restrita a `solution_admin` (sem mudança).

#### 2. Frontend — novo componente `src/components/admin/EditUserDialog.tsx`

Diálogo com três campos:
- **Nome de exibição** (`Input`)
- **E-mail** (`Input` type=email)
- **Time** (`Select` com a lista de `teams` carregada no `Admin.tsx` + opção "Sem time")

Botão **Salvar** dispara em sequência:
1. `admin-manage-user` action `update_profile` (nome + e-mail).
2. Se o time mudou, `admin-manage-user` action `assign_team`.
3. Toast de sucesso e `loadData()` para refrescar a tabela.

Erros do edge function são extraídos via `error.context.json()` (padrão já usado no projeto, conforme memória `api-error-handling`).

#### 3. Tela `src/pages/Admin.tsx`

- Adicionar import e estado: `const [editingUser, setEditingUser] = useState<Profile | null>(null)`.
- Na coluna **Ações** da tabela de usuários, adicionar um botão de lápis (`Pencil` do lucide) ao lado dos botões existentes — visível para qualquer linha, exceto a do próprio usuário logado.
- Ao clicar, abre `EditUserDialog` com os dados pré-carregados (nome vem do `profiles`; e-mail é buscado on-open via `get_user_info`; time é derivado de `teamMembers`).
- Após salvar, `loadData()` atualiza a tabela.

### O que NÃO muda

- RLS, schema do banco, `approve-user`, `EditUserProfileDialog.tsx` (usado apenas pelo financeiro) — todos permanecem como estão.
- Promoção/rebaixamento continua sendo privilégio exclusivo do `solution_admin` (regra explícita no `admin-manage-user`).
- Os build errors listados em outros edge functions (`process-email-queue`, `check-notifications`, `process-recurring-tasks`) são **pré-existentes e não relacionados** a esta feature; serão tratados separadamente se você pedir.

### Resultado esperado

Luciano (admin) entra em `/admin`, vê o ícone de lápis ao lado de cada usuário criado por ele (incluindo Angelo), clica, ajusta nome/e-mail/time e salva — tudo sem precisar pedir intervenção do solution_admin.
