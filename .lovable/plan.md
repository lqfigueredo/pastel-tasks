
# Novo menu "Temporizador" com countdown e persistência

## Resumo
Criar uma nova página acessível pelo menu lateral onde o usuário configura um temporizador de até 50 minutos, recebe alerta sonoro ao final, e pode salvar o tempo com descrição opcional.

## Alterações

### 1. Nova tabela `timer_sessions` (migração SQL)
```sql
CREATE TABLE public.timer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  duration_seconds integer NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.timer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own timer sessions"
  ON public.timer_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 2. Nova página `src/pages/Timer.tsx`
- Slider ou input numérico para definir minutos (1-50)
- Botão "Iniciar" que inicia countdown visual (MM:SS)
- Ao chegar em 00:00, tocar som de alerta (usando `Audio` API com um tom gerado via `AudioContext` ou um arquivo de som embutido)
- Botão "Interromper" para parar o alerta e mostrar formulário de finalização
- Campo de descrição (textarea, não obrigatório)
- Botão "Finalizar" que salva em `timer_sessions` (duration real utilizada + descrição)
- Histórico das sessões salvas abaixo, listando data, duração e descrição

### 3. Rota no `src/App.tsx`
Adicionar rota `/temporizador` dentro do `AppLayout`.

### 4. Menu lateral `src/components/AppSidebar.tsx`
Adicionar item "Temporizador" com ícone `Timer` do lucide-react, entre "Registro de Ideias" e os menus de admin.

## Arquivos
- **Migração SQL**: criar tabela `timer_sessions`
- **`src/pages/Timer.tsx`**: nova página com toda a lógica
- **`src/App.tsx`**: adicionar rota `/temporizador`
- **`src/components/AppSidebar.tsx`**: adicionar item no menu
