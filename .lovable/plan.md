## Problema diagnosticado

Quando o **admin financeiro** (papel `solution_admin`) abre a tela **Configurações → Status do Kanban**, ele vê status criados por **todos os admins do sistema** (ex: "Em andamento" do admin A, "Concluída" do admin B, "Finalizado" do admin C, etc.), em vez de ver apenas os status que ele próprio criou + os padrões do sistema.

**Causa-raiz (RLS):** Existem duas políticas `SELECT` PERMISSIVE na tabela `task_statuses`:

1. `Users can view own or default statuses` → `created_by = auth.uid() OR is_team_member OR is_default = true`
2. `Solution admins can view all statuses` → `has_role(auth.uid(), 'solution_admin')`

Como o admin financeiro tem o papel `solution_admin`, a política #2 dispara e retorna **todos** os 6+ status existentes no banco (somando os de vários admins). A query do hook `useStatusesQuery` simplesmente faz `select * from task_statuses where deleted_at is null` — confiando no RLS — então traz tudo.

Os dados confirmam: hoje há status com `team_id=null` criados por 2 admins diferentes (`be4e1bbe…` e `f1c5f326…`) + 1 default global ("Não Afiliado") + status com `team_id` setado. Para o `solution_admin` todos aparecem misturados.

## Objetivo

Fazer com que o admin financeiro (`solution_admin`):

1. **Veja, na tela de Configurações > Status, somente os status criados por ele mesmo + os globais (`is_default=true`)** — exatamente o mesmo escopo de um admin comum, sem o "vazamento" causado pela política de bypass.
2. **Continue tendo acesso à tela `/configuracoes`** (já funciona — apenas confirmar que a aba Status é renderizada para ele e que as ações de criar/editar/arquivar funcionam aplicadas só aos seus próprios status).

> Importante: a política `Solution admins can view all statuses` continua válida em outros contextos (auditoria, suporte) — a mudança será **apenas no front-end**, filtrando explicitamente na query, **sem mexer em RLS** (que é correta para outras telas).

## Mudanças propostas

### 1. `src/hooks/useStatusesQuery.ts` — filtrar por `created_by` do usuário logado

Adicionar um filtro explícito na query para retornar apenas:

- Status onde `created_by = auth.uid()`, **OU**
- Status onde `is_default = true` (padrões globais do sistema)

Isso vale para **todos os usuários** (incluindo admins comuns), garantindo consistência. Para usuários comuns o resultado é idêntico ao atual (RLS já filtrava assim). Para o `solution_admin`, deixa de "ver tudo" e passa a ver apenas os seus + os defaults.

```ts
// pseudo-snippet
const { data: { user } } = await supabase.auth.getUser();
const { data } = await supabase
  .from('task_statuses')
  .select(STATUS_COLUMNS)
  .is('deleted_at', null)
  .or(`created_by.eq.${user!.id},is_default.eq.true`)
  .order('position');
```

Mesma alteração em `useArchivedStatusesQuery` (filtrar arquivados pelo `created_by` do usuário; defaults arquivados raramente existem, mas mantemos o `or` por consistência).

### 2. `src/pages/Settings.tsx` — confirmar acesso e UX para `solution_admin`

- Verificar que a rota `/configuracoes` está acessível para o `solution_admin` (hoje provavelmente já está; só validar). Caso exista um guard que bloqueie, ajustar para liberar `solution_admin` também.
- Garantir que ao criar um novo status pelo `solution_admin`, o registro seja salvo com `created_by = auth.uid()` e `team_id = null` (pessoal do admin financeiro), seguindo o mesmo padrão dos demais. **Já é o comportamento atual** — apenas confirmar.
- Status `is_default = true` permanecerão visíveis mas **não-editáveis/não-arquiváveis** (já existe a regra `is_default = false` na lógica de delete; replicar visualmente desabilitando os botões de edição/arquivar para defaults, se ainda não estiver assim).

### 3. Validação manual após deploy

- Logar como `solution_admin` → abrir `/configuracoes` → aba Status → conferir que aparece apenas: 1 padrão "Não Afiliado" + os status criados pelo próprio admin financeiro.
- Criar um novo status pelo `solution_admin` → confirmar que aparece para ele e **não aparece** para outros admins.
- Logar como admin comum → confirmar que continua vendo os seus + os defaults (sem regressão).

## Arquivos a modificar

- `src/hooks/useStatusesQuery.ts` — adicionar filtro `.or('created_by.eq.<uid>,is_default.eq.true')` em ambas as queries.
- `src/pages/Settings.tsx` — apenas verificação/ajuste pequeno se necessário (desabilitar editar/arquivar em defaults visualmente).

## O que NÃO será alterado

- **Políticas RLS de `task_statuses`** — permanecem como estão. A política do `solution_admin` é útil em telas administrativas/auditoria; o filtro acontece no client.
- **Outras telas que listam status** (Kanban, CreateTaskDialog, IdeaLinkedTasks, etc.) — continuam usando o mesmo hook, então automaticamente passam a ver apenas os status próprios + defaults, **inclusive para o solution_admin**, o que é o comportamento esperado em fluxo de trabalho normal.

## Riscos / Pontos de atenção

- Se em alguma tela administrativa (ex: relatórios futuros) for necessário que o `solution_admin` veja **todos** os status do sistema, será necessário criar um hook separado (`useAllStatusesQuery`) sem o filtro. Hoje não há essa necessidade identificada.
- A condição `.or(...)` do PostgREST precisa do `user.id` resolvido; o hook já depende de `useAuth()`, então é trivial obtê-lo de forma síncrona via `user.id`.