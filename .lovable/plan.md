

# Gerenciamento de Status Personalizados

Adicionar uma seção na página de **Configurações** para que o usuário possa criar, visualizar e excluir status personalizados do Kanban.

## O que será feito

1. **Seção "Status do Kanban" na página Settings** — Lista os status existentes (nome + cor) com botão de excluir (apenas os não-default). Formulário inline para criar novo status com campo de nome e seletor de cor.

2. **Migration para permitir UPDATE e DELETE** — Atualmente a tabela `task_statuses` não permite UPDATE nem DELETE. Criar políticas RLS para que usuários autenticados possam deletar status que não sejam default (e que não tenham tarefas vinculadas).

3. **Lógica de proteção** — Status default (Backlog, Em Desenvolvimento, Concluída) não podem ser excluídos. Ao excluir um status custom, verificar se há tarefas usando-o e avisar o usuário.

4. **Integração automática no Kanban** — Os novos status já aparecerão no board porque o `KanbanBoard` busca todos os status da tabela `task_statuses` ordenados por `position`.

## Detalhes técnicos

- Migration: adicionar RLS policy para DELETE em `task_statuses` onde `is_default = false`
- Na Settings, usar `supabase.from('task_statuses').insert(...)` para criar e `.delete()` para remover
- Seletor de cor: lista de cores pré-definidas (pastéis) como botões circulares
- Position do novo status: `max(position) + 1`

