# Limpeza automática das gravações de atas (15 dias)

## Diagnóstico do tamanho atual
- Bucket `meeting-attachments`: **13 arquivos, ~558 MB**.
- Média por gravação: **~43 MB**; maior: **210 MB** (45 min limite).
- Sem expurgo, o crescimento tende a estourar a cota de storage rapidamente — limpar em 15 dias é apropriado.

## Escopo confirmado
- Apagar **somente gravações de áudio/vídeo** (`file_type` começando com `video/` ou `audio/`).
- PDFs, imagens e demais anexos permanecem intactos.
- Prazo: **15 dias** a partir de `created_at` do anexo.

## O que será construído

### 1. Edge Function `cleanup-meeting-recordings`
- Roda com `service_role`, sem JWT.
- Seleciona `meeting_attachments` onde `(file_type LIKE 'video/%' OR file_type LIKE 'audio/%')` e `created_at < now() - interval '15 days'`.
- Para cada item: remove do bucket `meeting-attachments` (Storage API) e deleta a linha em `meeting_attachments`.
- Retorna contagem de removidos + bytes liberados; loga falhas individualmente sem abortar o lote.

### 2. Agendamento pg_cron
- Job diário às 03:00 (BRT) chamando a função via `net.http_post` com header `apikey` (anon) + `Authorization: Bearer CRON_SECRET`.
- Criado via tool `supabase--insert` (contém URL e chave específicas do projeto).
- Função valida `CRON_SECRET` antes de executar.

### 3. UI — contador de expiração
- Em `src/components/meetings/MeetingAttachments.tsx`, para cada anexo cujo `file_type` é áudio/vídeo, exibir um `Badge` discreto ao lado do nome:
  - `> 3 dias`: "Expira em N dias" (badge secundária).
  - `≤ 3 dias`: "Expira em N dias" (badge `destructive`, com ícone `Clock`).
  - `≤ 0`: "Expirando hoje".
- Tooltip explicando: "Gravações são removidas automaticamente 15 dias após o upload para economizar armazenamento."
- Cálculo client-side a partir de `created_at + 15 dias`. Sem mudanças de schema.

### 4. i18n
- Novas chaves em `meetings.json` (pt-BR e en):
  - `attachments.expiresIn` ("Expira em {{count}} dias")
  - `attachments.expiringToday` ("Expira hoje")
  - `attachments.recordingRetentionTooltip`

## Fora de escopo
- Não notificaremos por e-mail antes de apagar (pode ser feito depois se desejar).
- Não criamos política de "arquivar para download" — usuário precisa baixar dentro dos 15 dias.
- Tamanho atual dos 13 arquivos existentes: ao primeiro run do cron, os antigos (>15 dias) serão apagados — confirme se está OK ou se prefere preservá-los uma vez.

## Detalhes técnicos
- Constante centralizada `RECORDING_RETENTION_DAYS = 15` para fácil ajuste futuro (compartilhada via prop/const na UI; replicada no edge function).
- Função registrada em `supabase/config.toml` com `verify_jwt = false`.
- Secret `CRON_SECRET` já existe — reaproveitado.
