

# Landing Page + Captação de Leads (com role `solution_admin`)

## Resumo

Criar um novo papel `solution_admin` separado do `admin` existente. O `solution_admin` é o administrador comercial que gerencia leads captados pela landing page. O `admin` atual continua apenas para gestão do sistema (usuários, configurações).

## Banco de Dados

### 1. Atualizar o enum `app_role`

```sql
ALTER TYPE public.app_role ADD VALUE 'solution_admin';
```

### 2. Tabela `leads`

```sql
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (anon) pode inserir
CREATE POLICY "Anyone can insert leads"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Apenas solution_admin pode visualizar
CREATE POLICY "Solution admins can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'));
```

## Front-end

### Landing Page (`/landing`) — rota pública, fora do AppLayout

- Hero section apresentando o SimpleTask
- Seções de features (gestão de tarefas, equipes, atas)
- Botão "Tenho Interesse" → dialog com campos Nome e E-mail
- Insere na tabela `leads` usando o client anon (sem autenticação)
- Link "Já tenho conta" → `/auth`

### Tela Financeiro (`/financeiro`) — dentro do AppLayout, só para `solution_admin`

- Tabela listando leads: Nome, E-mail, Data de contato
- Verificação de role `solution_admin` no carregamento

### Sidebar — link "Financeiro" visível apenas para `solution_admin`

- Novo check `isSolutionAdmin` separado do `isAdmin`
- Ícone `DollarSign` ou `TrendingUp`

### Rotas (`App.tsx`)

- `/landing` fora do `<Route element={<AppLayout />}>` (pública, sem auth)
- `/financeiro` dentro do AppLayout (protegida)

## Arquivos

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar `solution_admin` ao enum + criar tabela `leads` com RLS |
| `src/pages/Landing.tsx` | Nova página pública |
| `src/pages/Financial.tsx` | Nova página de leads (solution_admin) |
| `src/App.tsx` | Rotas `/landing` e `/financeiro` |
| `src/components/AppSidebar.tsx` | Link "Financeiro" para solution_admin |

