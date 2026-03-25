

# Minimizar Tasks no Kanban

Adicionar um botão em cada card para alternar entre visualização expandida (padrão) e minimizada (compacta — só título). O estado será persistido no banco para que sobreviva entre sessões.

## Mudanças

### 1. Migration — coluna `is_minimized` na tabela `tasks`

```sql
ALTER TABLE public.tasks ADD COLUMN is_minimized boolean NOT NULL DEFAULT false;
```

### 2. KanbanCard.tsx — botão de minimizar e renderização condicional

- Adicionar ícone de minimizar/expandir (ChevronDown/ChevronUp) no canto superior direito do card
- Clicar no ícone alterna `is_minimized` no banco via `supabase.from('tasks').update({ is_minimized: !task.is_minimized })`
- Quando minimizado: mostrar apenas o título em uma linha, sem descrição, sem assignees, sem data
- O clique no card (abrir detalhes) continua funcionando normalmente — o ícone de minimizar intercepta o evento com `stopPropagation`

### 3. KanbanBoard.tsx — incluir `is_minimized` no tipo Task

- Adicionar `is_minimized: boolean` à interface `Task`
- O campo já vem no `select('*')`, então não precisa mudar a query

### 4. Estilo visual

- Card minimizado: padding reduzido, texto menor, fundo levemente diferenciado (opacity reduzida)
- Transição suave ao alternar

