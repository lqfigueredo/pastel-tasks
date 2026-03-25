

# Adicionar Responsáveis (Assignees) às Tarefas

Atualmente, a tabela `task_assignees` já existe no banco de dados, mas a interface ainda não permite atribuir usuários a tarefas. Vamos implementar isso.

## O que será feito

1. **Seção de Responsáveis no TaskDetailDialog** — Adicionar um seletor de membros abaixo do campo de status, mostrando avatares dos responsáveis atuais com botão para adicionar/remover.

2. **Buscar perfis disponíveis** — Listar todos os perfis cadastrados (a tabela `profiles` já permite SELECT para authenticated). O usuário poderá selecionar entre os perfis existentes.

3. **Avatares nos cards do Kanban** — Exibir mini-avatares dos responsáveis em cada card do KanbanCard, buscando os assignees junto com as tasks.

4. **Seletor de responsáveis na criação** — Adicionar campo opcional de assignees no CreateTaskDialog.

## Detalhes técnicos

- Buscar assignees via join: `task_assignees` + `profiles` (usando user_id)
- No KanbanBoard, alterar a query de tasks para incluir assignees com seus perfis
- Componente de seleção: dropdown multi-select com checkboxes mostrando nome/avatar dos perfis
- Inserir/deletar registros em `task_assignees` ao salvar

## Pré-requisito importante

Para que existam outros usuários disponíveis para atribuir, é necessário que outras pessoas criem contas no sistema. Cada pessoa que fizer cadastro terá seu perfil criado automaticamente e ficará disponível como responsável.

