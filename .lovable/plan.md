

# Mostrar nomes dos responsáveis no card do Kanban (somente leitura)

## Problema
Atualmente o `KanbanCard` exibe apenas avatares pequenos (círculos com iniciais) dos responsáveis, sem mostrar os nomes.

## Solução
Substituir o componente `AssigneeAvatars` no `KanbanCard` por uma exibição que mostre avatar + nome de cada responsável, sem possibilidade de edição.

## Alteração

**Arquivo: `src/components/kanban/KanbanCard.tsx`**

Na seção onde `AssigneeAvatars` é renderizado (dentro do bloco `!minimized`), substituir por uma lista compacta que mostra avatar + `display_name` de cada assignee:

```tsx
<div className="mt-2 flex flex-wrap items-center gap-1.5">
  {task.assignees.map((a) => (
    <span key={a.user_id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
      <Avatar className="h-4 w-4">
        {a.avatar_url && <AvatarImage src={a.avatar_url} />}
        <AvatarFallback className="text-[8px]">{a.display_name.slice(0,2).toUpperCase()}</AvatarFallback>
      </Avatar>
      {a.display_name}
    </span>
  ))}
</div>
```

- Quando minimizado, mantém o comportamento atual (sem mostrar responsáveis)
- Sem botões de remoção ou adição — somente leitura
- Importar `Avatar, AvatarFallback, AvatarImage` no arquivo

