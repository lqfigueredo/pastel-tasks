## Exportar Tarefas em CSV

Adicionar um botão **"Exportar CSV"** na página de Tarefas (`/tarefas`) que gera e baixa um arquivo `.csv` com todas as tarefas visíveis ao usuário, incluindo o status de cada uma.

### Onde aparece
- Novo botão `Exportar CSV` (variant `outline`, ícone `Download` do `lucide-react`) na barra de ações de `src/pages/Index.tsx`, ao lado do seletor de responsável e do botão "Nova Tarefa".
- Respeita o filtro atual de responsável: se houver filtro ativo, exporta apenas as tarefas filtradas; caso contrário, exporta todas as visíveis.

### Colunas do CSV
| Coluna | Origem |
|---|---|
| ID | `task.id` (UUID completo) |
| Título | `task.title` |
| Descrição | `task.description` |
| Status | nome do status via `task_statuses.name` (resolvido por `status_id`) |
| Responsáveis | `assignees[].display_name` concatenados por `; ` |
| Data início | `task.start_date` |
| Prazo estimado | `task.estimated_delivery_date` |
| Data fim | `task.end_date` |
| Crítica | `task.is_critical` → "Sim"/"Não" |
| Criada em | `task.created_at` (formatada `dd/MM/yyyy HH:mm`) |

### Implementação técnica

1. **Novo utilitário** `src/lib/csv-export.ts`:
   - Função `tasksToCsv(tasks, statusMap)` que monta o CSV com:
     - BOM UTF-8 (`\uFEFF`) para abrir corretamente no Excel PT-BR.
     - Separador `;` (padrão Excel BR).
     - Escape de aspas duplas e quebras de linha em campos de texto.
   - Função `downloadCsv(filename, content)` que cria um `Blob` e dispara o download via `<a download>`.

2. **Hook de dados em `Index.tsx`**:
   - Reutilizar o `useTasksQuery()` (já em cache) e `useStatusesQuery()` para montar o `statusMap: Map<id, name>`.
   - Aplicar o mesmo filtro `filterAssigneeId` que o KanbanBoard usa para manter consistência com o que está visível.

3. **Handler `handleExportCsv`**:
   - Gera nome `tarefas_YYYY-MM-DD.csv`.
   - Toast de sucesso "CSV exportado com X tarefas" (ou "Nenhuma tarefa para exportar" se vazio).

### Arquivos modificados/criados
- **Novo:** `src/lib/csv-export.ts` — utilitários de geração/download de CSV.
- **Editado:** `src/pages/Index.tsx` — adicionar botão, handler e import dos hooks/utilitários.

### Fora do escopo
- Filtros adicionais de exportação (intervalo de datas, status específico) — pode ser feito depois se necessário.
- Exportação em Excel nativo (.xlsx) — CSV resolve o caso de uso e abre direto no Excel.