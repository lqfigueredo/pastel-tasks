
## Diagnóstico

O acesso à rota `/configuracoes` já foi liberado para `solution_admin` no passo anterior, mas o **item de menu** continua escondido na sidebar. Em `src/components/AppSidebar.tsx`:

- `adminItems` (que contém **Configurações**, **Administração** e **Cobrança**) está dentro de um grupo renderizado apenas quando `isAdmin === true` (linha 127).
- O usuário financeiro tem apenas as roles `user` + `solution_admin` (confirmado nos logs de rede: `[{"role":"user"},{"role":"solution_admin"}]`), portanto `isAdmin` é `false` e o grupo nunca aparece.
- O grupo "Operação" (que mostra "Financeiro") já aparece corretamente para `solution_admin`, mas não inclui Configurações.

## Mudanças propostas

### 1. `src/components/AppSidebar.tsx`
Separar o item **Configurações** dos itens exclusivos de admin, exibindo-o tanto para `isAdmin` quanto para `isSolutionAdmin`:

- Remover `items.settings` da constante `adminItems` (deixar apenas `admin` e `billing` lá, que continuam restritos a `isAdmin`).
- Adicionar `items.settings` ao grupo "Operação" para `solution_admin` (junto com **Financeiro**), OU criar um item Settings que apareça em ambos os grupos baseado na role.

**Abordagem escolhida:** mover `items.settings` para um `settingsItem` isolado e renderizá-lo em um pequeno grupo visível quando `isAdmin || isSolutionAdmin`. Isso evita duplicação visual e mantém os outros itens administrativos restritos a `admin` puro.

Estrutura final dos grupos para `solution_admin` (sem `admin`):
- (Trabalho + Documentação visíveis, pois `isOnlySolutionAdmin` é `false` quando há também a role `user`)
- **Operação:** Financeiro
- **Configurações:** Configurações ← novo grupo/item visível

### 2. Verificação
- Confirmar que `Settings.tsx` já permite `solution_admin` (feito no passo anterior).
- Garantir que ao clicar em Configurações, o usuário consiga gerenciar apenas seus próprios status (já corrigido pelo filtro `.or` em `useStatusesQuery`).

## Arquivos a modificar
- `src/components/AppSidebar.tsx` — único arquivo de código alterado.

Sem mudanças em banco de dados, RLS, traduções ou outros componentes.
