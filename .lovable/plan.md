

## Gravador de Tela e Voz na Ata de Reunião

Sim, é possível. Usaremos as APIs nativas do navegador (`MediaRecorder`, `getDisplayMedia`, `getUserMedia`) para gravar tela e/ou voz diretamente na página de detalhe da ata, e salvar a gravação como anexo no bucket `meeting-attachments`.

### Como funcionará

- Um botão "Gravar Reunião" aparecerá na página de detalhe da ata
- O usuário escolhe o que gravar: **tela + áudio**, **apenas áudio**, ou **apenas tela**
- Durante a gravação, um indicador visual com cronômetro e botão de parar ficará visível
- Ao parar, o vídeo/áudio é automaticamente salvo como anexo da ata (formato WebM)
- A gravação aparecerá na lista de anexos normalmente, podendo ser baixada

### Implementação

#### 1. Novo componente `src/components/meetings/MeetingRecorder.tsx`
- Botão para iniciar gravação com menu de opções (tela+áudio, só áudio, só tela)
- Usa `navigator.mediaDevices.getDisplayMedia()` para captura de tela
- Usa `navigator.mediaDevices.getUserMedia({ audio: true })` para captura de voz
- Combina os streams com `MediaRecorder` (codec `video/webm`)
- Indicador de gravação ativa com timer e botão de parar
- Ao parar, faz upload automático para `meeting-attachments` e insere registro na tabela `meeting_attachments`

#### 2. Integrar na página `src/pages/MeetingMinuteDetail.tsx`
- Importar e renderizar `MeetingRecorder` ao lado dos botões existentes
- Passar `meetingId` e callback `onRecorded` para atualizar a lista de anexos

### Limitações conhecidas
- Funciona apenas em navegadores desktop modernos (Chrome, Edge, Firefox)
- A captura de tela requer permissão explícita do usuário
- O formato de saída será WebM (suportado nativamente pelo MediaRecorder)
- Gravações longas podem gerar arquivos grandes

### Arquivos criados/modificados
- `src/components/meetings/MeetingRecorder.tsx` (novo)
- `src/pages/MeetingMinuteDetail.tsx` (adicionar componente)

