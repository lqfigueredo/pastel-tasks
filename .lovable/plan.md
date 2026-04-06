

## Compactar modal de Nova Tarefa

### O que muda
Os três toggles (Tarefa Crítica, Originada de Reunião, Recorrente) que hoje ocupam 3 linhas empilhadas serão colocados lado a lado em uma única linha com `grid grid-cols-3`, reduzindo significativamente a altura do modal.

### Implementação

**Arquivo: `src/components/kanban/CreateTaskDialog.tsx`**

- Substituir os 3 blocos separados de toggle (linhas 209-288) por um único `div` com `grid grid-cols-3 gap-2`
- Cada toggle será um card compacto vertical (ícone + label em cima, switch embaixo), ocupando ~1/3 da largura
- Layout de cada card: `flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center`
- Manter os mesmos IDs, estados e comportamentos

O modal continua com `max-w-md`, apenas fica mais curto verticalmente.

