

# Registro de Ideias — Nova Funcionalidade

## Resumo
Criar um módulo completo de "Registro de Ideias" com tabela no banco, storage para anexos, página de listagem/cadastro, e menu na sidebar.

## 1. Banco de Dados

### Tabela `ideas`
```sql
CREATE TABLE public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_implemented boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- Usuário pode gerenciar suas próprias ideias
CREATE POLICY "Users can manage own ideas" ON public.ideas
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Todos autenticados podem ver todas as ideias (brainstorming é colaborativo)
CREATE POLICY "Authenticated can view all ideas" ON public.ideas
  FOR SELECT TO authenticated
  USING (true);
```

### Tabela `idea_attachments`
```sql
CREATE TABLE public.idea_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view idea attachments" ON public.idea_attachments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Uploader can manage own attachments" ON public.idea_attachments
  FOR ALL TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());
```

### Storage bucket `idea-attachments`
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('idea-attachments', 'idea-attachments', false);

-- Políticas de storage para upload/download por autenticados
```

### Trigger para `updated_at`
Reutilizar a função `update_updated_at_column` existente.

## 2. Sidebar
Adicionar item "Registro de Ideias" com ícone `Lightbulb` na lista `navItems` do `AppSidebar.tsx`, apontando para `/ideias`.

## 3. Rota
Adicionar rota `/ideias` dentro do `AppLayout` no `App.tsx` com lazy loading.

## 4. Página `src/pages/Ideas.tsx`
- Listagem de ideias em tabela com busca por texto
- Filtro por status (implementada/não implementada/todas)
- Botão "Nova Ideia" que abre dialog de criação
- Cada linha mostra: título, descrição (truncada), status implementada (badge), autor, data, botões de ação
- Click para abrir dialog de detalhes/edição
- Somente o criador pode editar/excluir

## 5. Componentes
- `src/components/ideas/CreateIdeaDialog.tsx` — Form com título, descrição, upload de arquivos
- `src/components/ideas/EditIdeaDialog.tsx` — Edição com toggle "implementada", gerenciamento de anexos
- `src/components/ideas/IdeaAttachments.tsx` — Lista de anexos com upload/download/delete (padrão similar a `TaskAttachments`)

## Arquivos criados/editados
- **Migration SQL** (1 arquivo): tabelas, RLS, bucket, trigger
- `src/pages/Ideas.tsx` (novo)
- `src/components/ideas/CreateIdeaDialog.tsx` (novo)
- `src/components/ideas/EditIdeaDialog.tsx` (novo)
- `src/components/ideas/IdeaAttachments.tsx` (novo)
- `src/components/AppSidebar.tsx` (adicionar menu)
- `src/App.tsx` (adicionar rota)

