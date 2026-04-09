

## Temporizador persistente entre telas

### Problema
Atualmente, o estado do timer vive apenas dentro da página `/temporizador`. Ao navegar para outro menu, o timer é desmontado e o estado é perdido.

### Solução
Criar um **Context global** para o timer e um **indicador compacto no header** que aparece sempre que há um timer ativo.

### Implementação

#### 1. Novo contexto — `src/contexts/TimerContext.tsx`
- Extrair toda a lógica de estado do timer (state, secondsLeft, elapsed, interval, start/pause/resume/stop/finish/cancel) para um React Context
- O provider será montado no `AppLayout`, garantindo persistência entre navegações
- Expor via hook `useTimer()`

#### 2. Indicador no header — `src/components/GlobalTimerIndicator.tsx`
- Componente compacto que aparece no header quando `timerState !== 'idle'`
- Exibe o tempo restante em formato `MM:SS` com ícone pulsante
- Botões inline para pausar/retomar e parar
- Clique no tempo navega para `/temporizador`
- Quando `timerState === 'finished'`, exibe "Finalizado!" com link para a página

#### 3. Atualizar `AppLayout.tsx`
- Envolver conteúdo com `<TimerProvider>`
- Inserir `<GlobalTimerIndicator />` no header, ao lado do `NotificationBell`

#### 4. Simplificar `src/pages/Timer.tsx`
- Substituir o estado local pelo `useTimer()` do contexto
- Manter apenas a UI (slider, botões, histórico) — a lógica já vive no contexto
- O comportamento da página continua idêntico, mas agora o estado sobrevive à navegação

### Arquivos modificados/criados
- `src/contexts/TimerContext.tsx` (novo) — estado global do timer
- `src/components/GlobalTimerIndicator.tsx` (novo) — indicador no header
- `src/components/AppLayout.tsx` — adicionar provider + indicador
- `src/pages/Timer.tsx` — consumir contexto em vez de estado local

