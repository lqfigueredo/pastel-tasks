# Corrigir travamento do Focus Timer

## Problema
O timer usa `setInterval` decrementando `secondsLeft` a cada 1s. Isso falha em dois cenários comuns:
1. **Aba/janela em background**: navegadores reduzem `setInterval` para ~1x/min, fazendo o timer "travar" visualmente — quando volta para a aba, o tempo está muito atrasado.
2. **Reload/perda do provider**: hoje o estado vive só em memória; qualquer recarga zera tudo.

Como o `TimerProvider` está montado no root (`App.tsx`), navegar entre páginas não desmonta o provider — mas o throttling de background é o que causa a sensação de travamento ao voltar para a tela.

## Solução
Reescrever o `TimerContext` para **calcular o tempo a partir de timestamps absolutos** em vez de decrementar a cada tick, e persistir em `localStorage`.

### Mudanças em `src/contexts/TimerContext.tsx`
- Trocar a lógica baseada em contador por timestamps:
  - `endAt` (ms): quando o timer deve terminar.
  - `pausedRemaining` (s): tempo restante salvo ao pausar.
- A cada tick (mantém 1s só para atualizar UI), calcular `secondsLeft = Math.max(0, Math.ceil((endAt - Date.now())/1000))`. Assim, mesmo que o `setInterval` seja throttled, ao voltar à aba o valor é recomputado corretamente.
- Disparar `finished` quando `Date.now() >= endAt`, mesmo que o tick tenha sido pulado.
- Adicionar listener de `document.visibilitychange`: ao voltar a ficar visível, recomputar imediatamente (sem esperar o próximo tick) e checar se já terminou (toca alerta nesse caso).
- Persistir `{ state, endAt, pausedRemaining, totalSeconds, minutes }` em `localStorage` sob a chave `focus-timer-state`. Ao montar o provider, restaurar o estado:
  - Se `running` e `endAt` no futuro → retomar.
  - Se `running` e `endAt` no passado → marcar `finished`.
  - Se `paused` → restaurar com `pausedRemaining`.
- Limpar o `localStorage` em `finish`/`cancel`.

### Sem mudanças funcionais visíveis
- API pública do hook (`start/pause/resume/stop/finish/cancel`, `secondsLeft`, `elapsedSeconds`, etc.) permanece igual.
- `Timer.tsx` e `GlobalTimerIndicator.tsx` não precisam ser alterados.

## Detalhes técnicos
- `elapsedSeconds` continua exposto, calculado como `totalSeconds - secondsLeft` (ou acumulado entre pausas para precisão).
- `playAlertSound` só é disparado uma vez quando a transição para `finished` ocorre (guarda com flag para não tocar duas vezes ao retornar à aba).
- Nada de mudanças no backend, banco ou outras telas.
