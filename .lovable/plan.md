

# Gerenciamento de Textos de Ajuda pelo Financeiro

## Visão Geral
Adicionar uma nova aba "Textos de Ajuda" na tela do Financeiro, onde o `solution_admin` pode editar os textos de ajuda exibidos pelo botão `?` em cada página do sistema. Os textos são armazenados no banco e carregados dinamicamente pelo componente `HelpButton`.

## Banco de Dados

### Nova tabela `help_texts`
```sql
CREATE TABLE public.help_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,  -- ex: 'tasks', 'dashboard', 'meetings', etc.
  title text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]',  -- [{label, text}]
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.help_texts ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler
CREATE POLICY "Authenticated can read help_texts" ON public.help_texts
  FOR SELECT TO authenticated USING (true);

-- Apenas solution_admin pode inserir/atualizar
CREATE POLICY "Solution admins can manage help_texts" ON public.help_texts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'solution_admin'));
```

Pré-popular com valores padrão para cada página (tasks, dashboard, meetings, work-instructions, calendar, settings, admin, financial, team).

## Frontend

### 1. Novo componente `src/components/financial/HelpTextsManager.tsx`
- Lista todas as páginas com seus textos de ajuda
- Para cada página: título editável + seções (label + texto) editáveis
- Botões para adicionar/remover seções e salvar alterações
- Interface tipo accordion — cada página expande para editar

### 2. Nova aba na página `Financial.tsx`
- Adicionar `<TabsTrigger value="help-texts">Textos de Ajuda</TabsTrigger>`
- `<TabsContent>` renderiza `<HelpTextsManager />`

### 3. Componente `src/components/HelpButton.tsx`
- Recebe `pageKey: string` como prop
- Busca título e seções da tabela `help_texts` pelo `page_key`
- Exibe Dialog com o conteúdo carregado do banco
- Fallback para texto padrão hardcoded caso não exista registro no banco

### 4. Integrar `HelpButton` em cada página
- Adicionar ao lado do título em: Index, Dashboard, MeetingMinutes, WorkInstructions, PersonalCalendar, Settings, Admin, Financial, TeamList

## Fluxo
1. Solution_admin acessa Financeiro → aba "Textos de Ajuda"
2. Edita título e seções de qualquer página
3. Usuários veem o conteúdo atualizado ao clicar no botão `?`

