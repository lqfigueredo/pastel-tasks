

# Descritivo e Anexos do Time

Adicionar descrição e anexos diretamente na página de Equipe existente, como uma nova seção/card dentro do time já criado.

## Mudanças

### 1. Migration — Adicionar coluna `description` na tabela `teams` + tabela de anexos + bucket

```sql
-- Descrição do time
ALTER TABLE public.teams ADD COLUMN description text;

-- Tabela de anexos do time
CREATE TABLE public.team_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_attachments ENABLE ROW LEVEL SECURITY;

-- Membros do time podem ver anexos
CREATE POLICY "Team members can view attachments" ON public.team_attachments
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

-- Membros podem adicionar anexos
CREATE POLICY "Team members can add attachments" ON public.team_attachments
  FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

-- Criador do time ou quem fez upload pode deletar
CREATE POLICY "Uploader can delete attachments" ON public.team_attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Bucket de storage
INSERT INTO storage.buckets (id, name, public) VALUES ('team-attachments', 'team-attachments', false);

CREATE POLICY "Team members can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'team-attachments');

CREATE POLICY "Team members can view" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'team-attachments');

CREATE POLICY "Uploader can delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'team-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. Componente `src/components/team/TeamAttachments.tsx`

Componente reutilizando o mesmo padrão de `TaskAttachments`, mas apontando para bucket `team-attachments` e tabela `team_attachments`, recebendo `teamId` como prop.

### 3. Atualizar `src/pages/Team.tsx`

Quando o time existe, adicionar dois novos cards na página:

- **Card "Sobre o Time"**: campo de descrição editável (textarea) com botão salvar. Usa `supabase.from('teams').update({ description })`. Visível para todos os membros, editável apenas pelo criador.
- **Card "Anexos do Time"**: usa o componente `TeamAttachments` para upload/download/exclusão de arquivos do time.

### Fluxo

1. Usuário acessa a página "Equipe" e vê seu time
2. Abaixo dos membros, vê o card "Sobre o Time" com a descrição editável (se for criador) ou somente leitura
3. Abaixo, o card "Anexos do Time" permite upload de arquivos associados ao time

## Arquivos

| Arquivo | Alteração |
|---|---|
| Migration SQL | Coluna description em teams, tabela team_attachments, bucket, RLS |
| `src/components/team/TeamAttachments.tsx` | Novo componente de anexos do time |
| `src/pages/Team.tsx` | Cards de descrição e anexos na view do time |

