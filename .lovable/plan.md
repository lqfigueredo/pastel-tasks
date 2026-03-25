

# Múltiplos Times com Tela de Listagem

Atualmente a página de Equipe assume que o usuário pertence a apenas um time. Vamos reestruturar para suportar múltiplos times com uma tela de listagem.

## Arquitetura

A página `/equipe` passa a ter dois estados:
1. **Lista de times** (padrão) -- mostra todos os times do usuário em cards + botão criar novo time
2. **Detalhe do time** (`/equipe/:teamId`) -- a tela atual com membros, descrição, anexos e tarefas

## Mudanças

### 1. Nova página `src/pages/TeamList.tsx`

Lista todos os times do usuário:
- Busca `team_members` filtrado por `user_id` do usuário logado
- Para cada `team_id`, carrega dados do time (nome, descrição, contagem de membros)
- Exibe em cards com: nome do time, descrição truncada, badge com contagem de membros, badge "Criador" se aplicável
- Botão "Criar Time" abre dialog inline (nome do time) -- reutiliza lógica existente
- Clique no card navega para `/equipe/:teamId`

### 2. Refatorar `src/pages/Team.tsx` para aceitar `teamId` via URL

- Recebe `teamId` de `useParams()` ao invés de buscar automaticamente o primeiro time
- Remove a lógica de "encontrar time do usuário" e usa o `teamId` direto da URL
- Adiciona botão "Voltar" para `/equipe`
- Mantém toda a lógica atual de membros, descrição, anexos e tarefas

### 3. Atualizar rotas em `src/App.tsx`

```
<Route path="/equipe" element={<TeamList />} />
<Route path="/equipe/:teamId" element={<Team />} />
```

### 4. Nenhuma mudança no banco de dados

O schema atual já suporta múltiplos times (um usuário pode ter múltiplas entradas em `team_members`). As RLS policies também já estão corretas.

## Arquivos

| Arquivo | Alteração |
|---|---|
| `src/pages/TeamList.tsx` | Nova página de listagem de times |
| `src/pages/Team.tsx` | Refatorar para usar `teamId` da URL |
| `src/App.tsx` | Adicionar rota `/equipe/:teamId` |

