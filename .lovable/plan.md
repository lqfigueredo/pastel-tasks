

## Previews interativos nas features da Landing Page

### O que muda
Ao clicar em qualquer card de feature (Kanban, Gestão de Equipes, etc.), abre um Dialog com um mockup HTML estilizado daquela funcionalidade -- não screenshots reais, mas representações visuais construídas com HTML/Tailwind.

### Implementação

**1. Criar componente `FeaturePreviewDialog`**
- Recebe o `title` da feature e renderiza o mockup correspondente
- Usa o `Dialog` existente (`src/components/ui/dialog.tsx`) com `max-w-3xl`
- Cada feature terá um componente de mockup inline (JSX puro com Tailwind)

**2. Mockups HTML para cada feature:**
- **Kanban Intuitivo**: 3 colunas (A Fazer, Em Progresso, Concluído) com cards coloridos arrastáveis
- **Gestão de Equipes**: Lista de membros com avatares, roles e indicadores de status
- **Atas de Reunião**: Layout de ata com título, participantes, pendências
- **Dashboard de Prazos**: Cards de prazo com barras de progresso e datas
- **Temporizador Pomodoro**: Timer circular com botões play/pause/reset
- **Agenda Pessoal**: Mini calendário com eventos coloridos
- **Instruções de Trabalho**: Documento com versão, autor e conteúdo formatado
- **Registro de Ideias**: Cards de ideias com tags e status

**3. Alterar `Landing.tsx`**
- Tornar cada card de feature clicável (`cursor-pointer`)
- Ao clicar, abrir o `FeaturePreviewDialog` com o mockup correspondente

### Arquivos modificados
- `src/components/landing/FeaturePreviewDialog.tsx` (novo)
- `src/pages/Landing.tsx` (adicionar estado e dialog)

