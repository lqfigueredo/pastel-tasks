## Mudança

Alterar o limite de duração das gravações de tela/áudio de **45 min para 20 min**.

### Arquivo: `src/components/meetings/MeetingRecorder.tsx`
- `MAX_DURATION_SECONDS`: `2700` → `1200` (20 min)
- `WARNING_THRESHOLD`: manter aviso 5 min antes do fim → `MAX_DURATION_SECONDS - 300` (já é relativo, não precisa mexer)

O timer exibido na UI (`MM:SS / 20:00`) e o auto-stop ao atingir o limite passam a respeitar os 20 min automaticamente.

### Fora de escopo
- Não alterar `MAX_SIZE_BYTES` (200 MB continua como teto de segurança).
- Não alterar i18n (mensagem `recorder.limit` / `recorder.limitDuration` continuam válidas — se quiser, posso atualizar o texto para citar "20 minutos" explicitamente; confirme).
