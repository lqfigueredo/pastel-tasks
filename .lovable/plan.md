
# Plano: reduzir uso de disco do banco

## Diagnóstico

- Disco do banco: **4,14 GB usados / 68%**.
- 98% disso é a tabela `cron.job_run_details` (**4066 MB**) — histórico de toda execução de cron job acumulado sem limite.
- 155 MB são respostas HTTP cacheadas em `net._http_response` (extensão `pg_net`, usada pelos cron jobs que chamam Edge Functions).
- Os dados reais do produto (schema `public`) somam **3,4 MB**. Não há nada para "otimizar" em tabelas de negócio.
- Storage (arquivos) é cobrado à parte e está pequeno (≈558 MB, dominado por gravações de reuniões).

## O que vou fazer (migração única)

### 1. Limpar o lixo acumulado agora

- `TRUNCATE cron.job_run_details` → libera ~4 GB imediatamente.
- `DELETE FROM net._http_response WHERE created < now() - interval '1 day'` → libera ~150 MB.
- `VACUUM (FULL, ANALYZE)` nas duas tabelas para devolver o espaço ao SO (necessário para o disco cair de fato).

### 2. Instalar retenção automática (não voltar a encher)

Criar dois cron jobs novos via `cron.schedule`:

- `cleanup-cron-history` — diário 03:30 UTC:
  ```sql
  DELETE FROM cron.job_run_details
  WHERE end_time < now() - interval '7 days';
  ```
  Mantém só 7 dias de histórico (suficiente para depurar falhas recentes).

- `cleanup-http-responses` — diário 03:45 UTC:
  ```sql
  DELETE FROM net._http_response
  WHERE created < now() - interval '2 days';
  ```

### 3. Reduzir geração de novos logs

- Revisar a frequência dos jobs existentes. Hoje há rotinas rodando a cada poucos minutos (notifications, recurring-tasks). Vou auditar e propor reduzir cadência onde fizer sentido (por ex. `check-notifications` a cada 5 min → 15 min) — qualquer mudança aqui entra em uma migração separada se você aprovar caso a caso.

## Storage (arquivos) — fora desta migração

- Bucket `meeting-attachments` (485 MB) concentra o custo de storage. Sugestões para uma próxima rodada, se quiser:
  - Política de retenção: apagar gravações com mais de N dias automaticamente.
  - Compressão/transcodificação no upload (reduz 50–80% em áudio).
  - Permitir ao usuário marcar uma reunião como "arquivar/excluir gravação" mantendo a ata.
- Nada será mexido em storage nesta migração.

## Resultado esperado

- Disco do banco cai de **4,14 GB → ~50 MB** após o `VACUUM FULL`.
- Crescimento futuro limitado a ~7 dias de histórico de cron (~ poucas centenas de MB no pior caso, em vez de crescer indefinidamente).
- Zero impacto em dados de usuário, RLS, edge functions ou UI.

## Riscos

- `VACUUM FULL` bloqueia as tabelas envolvidas por alguns segundos (só `cron.job_run_details` e `net._http_response`, que não são lidas pelo app).
- Perda do histórico antigo de execução de cron jobs (não é dado de negócio, é log operacional).

## Detalhes técnicos

Arquivos tocados:

- Nova migração em `supabase/migrations/` contendo:
  1. `TRUNCATE cron.job_run_details;`
  2. `DELETE FROM net._http_response WHERE created < now() - interval '1 day';`
  3. `VACUUM (FULL, ANALYZE) cron.job_run_details;`
     `VACUUM (FULL, ANALYZE) net._http_response;`
  4. `SELECT cron.schedule('cleanup-cron-history', '30 3 * * *', $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$);`
  5. `SELECT cron.schedule('cleanup-http-responses', '45 3 * * *', $$DELETE FROM net._http_response WHERE created < now() - interval '2 days'$$);`

Nada mais é alterado.
