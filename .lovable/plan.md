

## Diagnóstico dos dois problemas no login do Jonathas

### Problema 1 — "Tarefas de outro usuário aparecendo"

Não é vazamento de dados entre tenants. O Jonathas está corretamente **dentro do mesmo time** (`727e47c5-…`) que Luciano, Francisco, Rodolpho e Sidnei. A política RLS `Team members can view team tasks` faz com que qualquer membro veja todas as tarefas do time — comportamento correto para um kanban compartilhado.

O que o Jonathas percebe como "tarefa de outro usuário" é, por exemplo, a tarefa **"Revisão CGOB"** criada pelo Luciano. Ela aparece porque:
- foi criada por um colega de time, e
- a tela `/tarefas` (Minhas Tarefas) não filtra por responsável por padrão — mostra o board inteiro do time.

**Correção proposta (UX):**
Na tela `/tarefas`, definir o filtro padrão como "Apenas minhas tarefas" (`filterAssigneeId = user.id` na primeira renderização), com opção de mudar para "Todos" via o seletor que já existe. Isso resolve a confusão sem mudar RLS nem quebrar a colaboração de time.

Arquivo afetado: `src/pages/Index.tsx` (estado inicial de `filterAssigneeId`).

---

### Problema 2 — "Não estão aparecendo todos os kanbans em produção"

Esse é o bug real. As colunas ativas hoje são:

| Coluna | created_by | team_id | is_default | Quem vê pela RLS |
|---|---|---|---|---|
| Não Afiliado | (nulo) | nulo | **true** | Todos |
| Em andamento | Luciano | **nulo** | false | **Só o Luciano** |
| Finalizado | Luciano | **nulo** | false | **Só o Luciano** |

A política `Users can view own or default statuses` exige uma destas: dono, membro do time da coluna, ou default. Como "Em andamento" e "Finalizado" foram criadas com `team_id = NULL`, **só o criador (Luciano) consegue lê-las**. Jonathas, Francisco, Rodolpho e Sidnei só veem "Não Afiliado" — daí o kanban quase vazio.

**Correção proposta (dados + código):**

1. **Migration de dados (one-shot):** atribuir `team_id = 727e47c5-8038-4926-9298-255360c023b7` às colunas "Em andamento" e "Finalizado", para que todos os 5 membros do time as vejam.

2. **Correção estrutural no código de criação de status:** garantir que ao criar uma nova coluna, o front-end sempre envie `team_id` quando o usuário pertence a um time. Hoje algo está criando colunas com `team_id = NULL` e isso vai voltar a acontecer. Vou revisar o ponto de criação de status (provavelmente em `KanbanColumn.tsx` / função "adicionar coluna") e garantir o `team_id` no insert.

3. **Migration corretiva preventiva:** rodar um update de saneamento que, para cada `task_status` com `team_id IS NULL` e `is_default = false`, atribuir o `team_id` do criador (quando ele pertencer a exatamente um time).

---

### Resumo das alterações

- **Migration SQL:**
  - `UPDATE public.task_statuses SET team_id = '727e47c5-…' WHERE id IN ('c5f9bf38-…', '2650b7ba-…');`
  - Update preventivo das demais colunas órfãs com `team_id` único do criador.
- **Código:**
  - `src/pages/Index.tsx`: filtro padrão = usuário logado.
  - Componente que cria status: incluir `team_id` no insert quando aplicável.

### Resultado esperado

- Jonathas entra em `/tarefas` e vê **suas próprias tarefas por padrão** (sem "tarefa de outro usuário" sem contexto).
- O kanban dele em produção passa a mostrar **as 3 colunas (Não Afiliado, Em andamento, Finalizado)**, igual ao do Luciano.
- Novas colunas criadas no futuro já nascem com `team_id` correto.

