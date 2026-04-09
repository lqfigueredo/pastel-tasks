

## Corrigir gravação parando sozinha

### Diagnóstico

Identifiquei duas causas prováveis:

1. **Componente desmonta durante gravação**: A função `fetchAll` (usada como callback em AddPendencyDialog, EditMeetingDialog e MeetingAttachments) faz `setLoading(true)`, que desmonta toda a página -- incluindo o `MeetingRecorder`. Quando ele desmonta, o `useEffect` de cleanup para os streams e para a gravação.

2. **Evento `ended` na captura de tela**: Para gravações com tela, o navegador mostra um indicador "Parar compartilhamento". Se o usuário clicar acidentalmente ou mudar de aba/janela, o track de vídeo dispara `ended` e para a gravação.

### Correções

#### 1. `src/pages/MeetingMinuteDetail.tsx`
- Não usar `setLoading(true)` ao recarregar dados (apenas no carregamento inicial). Criar uma função `refreshData` que atualiza os estados sem setar `loading=true`, evitando que o componente MeetingRecorder seja desmontado durante uma gravação.
- Usar `refreshData` (sem loading) nos callbacks `onCreated`, `onUpdated` e `onRecorded`.

#### 2. `src/components/meetings/MeetingRecorder.tsx`
- Remover o listener `ended` no video track que para a gravação automaticamente quando o usuário para o compartilhamento de tela (isso é confuso -- o usuário pode querer continuar gravando áudio).
- Alternativamente, manter o comportamento mas exibir um toast informativo explicando por que a gravação parou.

### Arquivos modificados
- `src/pages/MeetingMinuteDetail.tsx` -- separar refresh sem loading
- `src/components/meetings/MeetingRecorder.tsx` -- melhorar tratamento do evento `ended`

