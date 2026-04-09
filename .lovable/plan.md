

## Limite de gravação de reuniões

### Recomendação de limite

Para reuniões de ~30 minutos, os tamanhos típicos em WebM são:
- **Apenas áudio**: ~15-30 MB (30 min)
- **Tela + áudio**: ~100-200 MB (30 min)

Recomendo limitar em **45 minutos** de duração (margem sobre os 30 min típicos) e **200 MB** de tamanho de arquivo. Isso cobre a maioria dos cenários sem desperdiçar storage.

### Implementação

**`src/components/meetings/MeetingRecorder.tsx`**:

1. Adicionar constantes `MAX_DURATION_SECONDS = 2700` (45 min) e `MAX_SIZE_BYTES = 200 * 1024 * 1024`
2. No timer (`setInterval`), verificar se `elapsed >= MAX_DURATION_SECONDS` → parar gravação automaticamente com `toast.warning`
3. No `ondataavailable`, acumular tamanho total dos chunks e verificar se excede `MAX_SIZE_BYTES` → parar gravação com aviso
4. Exibir aviso visual (texto amarelo) quando restarem 5 minutos (`elapsed >= MAX_DURATION_SECONDS - 300`)
5. Mostrar o tempo máximo no tooltip do botão "Gravar" para informar o usuário antes de iniciar

### Arquivos modificados
- `src/components/meetings/MeetingRecorder.tsx`

