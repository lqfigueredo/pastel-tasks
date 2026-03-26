

# Sidebar condicional para usuário financeiro (solution_admin)

## Mudança

No `AppSidebar.tsx`, quando o usuário tem apenas o role `solution_admin` (e não é `admin` nem usuário regular de tarefas), exibir **somente** o menu "Financeiro" — escondendo Dashboard, Minhas Tarefas, Equipe, Atas de Reunião, Configurações e Administração.

## Lógica

Adicionar um check: também verificar se o usuário tem role `user` ou `admin`. Se o usuário é **apenas** `solution_admin` (sem `admin` e sem `user`), renderizar apenas o item Financeiro no menu. Caso contrário, manter o comportamento atual.

Também ajustar a rota padrão: quando um `solution_admin` puro faz login e vai para `/`, redirecionar para `/financeiro`.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/AppSidebar.tsx` | Checar role `user`, condicionar `navItems` — se só `solution_admin`, mostrar apenas Financeiro |
| `src/pages/Index.tsx` | Redirecionar `solution_admin` puro para `/financeiro` |

