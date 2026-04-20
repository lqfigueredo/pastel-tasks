
## Contexto

Usuário (solution_admin) está em `/financeiro` e quer poder marcar uma assinatura como **ativa sem cobrar pagamento** — útil para cortesia, contas internas, parceiros, beta testers, etc.

Hoje o único caminho para sair de `trialing`/`past_due`/`suspended` para `active` é:
1. `register_manual_payment` — exige criar uma fatura paga, com método e valor.
2. Editar manualmente via SQL (não exposto na UI).

Falta um botão "Ativar gratuitamente" no painel financeiro do solution_admin.

## Decisões de design

- **Quem pode usar:** apenas `solution_admin` (já é o público de `/financeiro`).
- **Onde aparece:** dentro do `SubscriptionDetailDrawer` (drawer de detalhes da assinatura) e no menu de ações `SubscriptionActionsDialog`. É a tela natural para essa operação.
- **O que faz:**
  - Muda `status` para `active`.
  - Define `current_period_start = now()` e `current_period_end = now() + 1 mês` (ou período customizável).
  - Limpa `past_due_since` e `trial_ends_at`.
  - **Não cria fatura** (é o ponto: conta ativa sem pagamento).
  - Registra em `subscription_changes` com `change_type = 'comp_activation'` e `reason` obrigatório (texto explicando o motivo da cortesia).
  - Opcionalmente cria uma `subscription_notes` com a justificativa para histórico.
- **Controle de duração:** dropdown com opções "1 mês / 3 meses / 6 meses / 12 meses / indefinido". Indefinido = `current_period_end = NULL`, e o cron de expiração ignora subscriptions sem `current_period_end`.
- **Confirmação:** dialog com aviso claro ("Esta conta ficará ativa sem cobrança até [data]") e campo de motivo obrigatório.

## Implementação

### 1. Função RPC `comp_activate_subscription`
SECURITY DEFINER, restrita a solution_admin:
- Parâmetros: `_subscription_id uuid, _months integer (nullable), _reason text`
- Valida role.
- Valida que `_reason` não está vazio.
- Atualiza `subscriptions`: status='active', period_start=now(), period_end=now()+months (ou NULL), trial_ends_at=NULL, past_due_since=NULL.
- Insere em `subscription_changes` (change_type='comp_activation', reason).
- Insere em `subscription_notes` com o motivo.

### 2. Ajuste no cron `expire-trials`
Garantir que a query de `past_due` não pegue subscriptions com `current_period_end IS NULL` (cortesias indefinidas). A query atual filtra por `past_due_since`, então já está OK — só documentar que cortesia indefinida nunca entra em past_due porque `past_due_since` fica NULL.

### 3. UI no `SubscriptionActionsDialog` (ou novo dialog dedicado)
- Botão novo: "Ativar como cortesia" (ícone Gift).
- Abre sub-dialog `CompActivationDialog`:
  - Select de duração (1m / 3m / 6m / 12m / indefinido)
  - Textarea de motivo (obrigatório)
  - Preview: "A conta ficará ativa até dd/mm/aaaa" ou "indefinidamente"
  - Botão confirmar chama RPC
- Toast de sucesso + invalidate da query da assinatura.

### 4. Indicador visual
No `SubscriptionDetailDrawer`, se a última `subscription_change` for `comp_activation`, mostrar badge "Cortesia" próximo ao status, com tooltip mostrando o motivo registrado.

## Arquivos afetados

- **Migração SQL:** criar função `comp_activate_subscription(_subscription_id, _months, _reason)`
- **Novo:** `src/components/financial/CompActivationDialog.tsx`
- **Editado:** `src/components/financial/SubscriptionActionsDialog.tsx` — adicionar botão "Ativar como cortesia"
- **Editado:** `src/components/financial/SubscriptionDetailDrawer.tsx` — badge "Cortesia" quando aplicável

## Fora de escopo (não vou fazer agora, só sinalizo)

- Renovação automática de cortesia quando expira — por enquanto, expira como qualquer outra (vai para past_due e depois suspended via cron). Solution_admin pode reativar manualmente.
- Conversão automática cortesia → assinatura paga.
- Relatório de "contas em cortesia" no dashboard MRR.
