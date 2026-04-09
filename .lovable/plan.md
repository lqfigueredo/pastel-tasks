

## Nova funcionalidade: Fonte de Conhecimento

### O que será criado

Uma nova página "Fonte de Conhecimento" onde usuários podem salvar links de referência e arquivos importantes, de forma individual ou compartilhada com a equipe. A página terá listagem com filtro por título e indicação visual se é individual ou de equipe.

### Implementação

#### 1. Migration — nova tabela `knowledge_sources`

```sql
CREATE TABLE public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  reference_url text,
  file_path text,
  file_name text,
  scope text NOT NULL DEFAULT 'individual', -- 'individual' ou 'team'
  team_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

-- Usuário vê as próprias (individuais) + as da equipe
CREATE POLICY "Users can view own sources" ON public.knowledge_sources
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (scope = 'team' AND team_id IS NOT NULL AND is_team_member(auth.uid(), team_id)));

CREATE POLICY "Users can create sources" ON public.knowledge_sources
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own sources" ON public.knowledge_sources
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own sources" ON public.knowledge_sources
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());
```

Também criar um bucket `knowledge-attachments` para os arquivos.

#### 2. Storage — bucket + RLS

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-attachments', 'knowledge-attachments', false);

-- Políticas de storage para o bucket
CREATE POLICY "Auth users can upload knowledge files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'knowledge-attachments');

CREATE POLICY "Users can view knowledge files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'knowledge-attachments');

CREATE POLICY "Uploader can delete knowledge files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'knowledge-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
```

#### 3. Página — `src/pages/KnowledgeBase.tsx`

- Listagem em cards ou tabela com: título, descrição (truncada), link, arquivo, badge "Individual"/"Equipe", data
- Campo de busca por título no topo
- Botão "Nova Fonte" abrindo dialog de criação
- Clique no item abre dialog de edição/visualização

#### 4. Dialog de criação — `src/components/knowledge/CreateKnowledgeDialog.tsx`

Campos:
- Título (obrigatório)
- Descrição (opcional, textarea)
- Link de referência (opcional, input URL)
- Arquivo (opcional, upload)
- Escopo: Individual / Equipe (radio/select)
- Se equipe: seletor de equipe (busca `team_members` do usuário)

#### 5. Dialog de edição — `src/components/knowledge/EditKnowledgeDialog.tsx`

Mesmos campos, com possibilidade de atualizar ou excluir.

#### 6. Rota + Menu

- **`src/App.tsx`**: adicionar rota `/conhecimento` com componente `KnowledgeBase`
- **`src/components/AppSidebar.tsx`**: adicionar item "Fonte de Conhecimento" com ícone `BookMarked` entre "Registro de Ideias" e "Temporizador"

### Arquivos modificados/criados
- **Migration SQL** — tabela `knowledge_sources` + bucket + RLS
- `src/pages/KnowledgeBase.tsx` (novo)
- `src/components/knowledge/CreateKnowledgeDialog.tsx` (novo)
- `src/components/knowledge/EditKnowledgeDialog.tsx` (novo)
- `src/App.tsx` — nova rota
- `src/components/AppSidebar.tsx` — novo item de menu

