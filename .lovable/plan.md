

# Ajustar status padrão — apenas "Não Afiliado"

Atualmente todos os 4 status ativos estão com `is_default = true`. Precisamos corrigir para que apenas "Não Afiliado" seja o padrão, e colocá-lo na posição 0 (o código usa `is_default && position === 0` para identificar o fallback).

## Migration SQL

```sql
-- Remove is_default de todos
UPDATE public.task_statuses SET is_default = false WHERE is_default = true;

-- Define apenas "Não Afiliado" como default na posição 0
UPDATE public.task_statuses SET is_default = true, position = 0 WHERE id = '59a735d6-ffa5-4b8b-be6e-43135fcc8806';

-- Reordenar os demais (mantendo ordem relativa)
UPDATE public.task_statuses SET position = 1 WHERE id = 'ad7243eb-1903-4928-8fc2-ab54ae8937e9'; -- Em Desenvolvimento
UPDATE public.task_statuses SET position = 2 WHERE id = '7d705bbd-b15f-4a12-a8f5-49d287cab243'; -- Backlog
UPDATE public.task_statuses SET position = 3 WHERE id = '74431d84-4592-4f4a-9bc4-f2e4632f313b'; -- Concluída
```

Nenhuma alteração de código necessária — apenas dados.

