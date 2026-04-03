
# Landing como página inicial

## Alteração
Trocar as rotas no `src/App.tsx` para que `/` seja a Landing e o Kanban (Index) fique em `/tarefas`.

## Arquivos
- **`src/App.tsx`**: trocar `path="/"` de `Index` para `Landing` (fora do AppLayout), e mover `Index` para `path="/tarefas"` dentro do AppLayout
- **`src/components/AppSidebar.tsx`**: atualizar o link "Minhas Tarefas" de `/` para `/tarefas`
- **`src/pages/Index.tsx`**: atualizar o redirect do solution_admin de `/financeiro` (se necessário, verificar se há outros links para `/`)
