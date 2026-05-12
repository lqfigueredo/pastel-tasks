## Objetivo

Adicionar um botão **"New Kanban"** no cabeçalho da página de Tarefas (`/tarefas`) que serve apenas como atalho — ao clicar, leva o usuário para a tela de Configurações (`/configuracoes`).

## Mudanças

### 1. `src/pages/Index.tsx`
- Importar o ícone `LayoutGrid` (ou `KanbanSquare`) do `lucide-react`.
- Adicionar um `<Button variant="outline">` dentro do grupo de ações do cabeçalho (linha 175–286), posicionado antes do botão "Nova tarefa".
- `onClick` chama `navigate('/configuracoes')` — `useNavigate` já está disponível.
- Texto via `t('page.newKanban')`.

### 2. i18n — `src/i18n/locales/{pt-BR,en}/kanban.json`
Adicionar a chave em `page`:
- pt-BR: `"newKanban": "Novo Kanban"`
- en: `"newKanban": "New Kanban"`

## Fora de escopo

- Criar de fato um novo Kanban / quadro adicional. O botão é apenas um atalho de navegação para a tela de configurações, conforme solicitado.