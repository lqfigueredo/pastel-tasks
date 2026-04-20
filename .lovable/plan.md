
## B1: Eliminar duplicação de log em `subscription_changes`

### Problema
Quando RPCs como `comp_activate_subscription`, `register_manual_payment` ou (futuramente) outras alteram `subscriptions.status`, a trigger genérica `log_subscription_changes` insere um evento `status_changed` **além** do evento específico (`comp_activation`, `manual_payment`) que a RPC já registrou. Resultado: histórico poluído com 2 eventos para a mesma operação.

### Solução: flag de sessão

Usar GUC do Postgres (`SET LOCAL`) para que a RPC sinalize "já loguei o evento específico, pula o genérico".

### Mudanças

**1. Atualizar `log_subscription_changes`** — ler GUC `app.suppress_status_log` e, se `'true'`, pular apenas o INSERT de `status_changed` (demais campos continuam logando normalmente, ex: `seats_changed`, `trial_extended`).

```sql
-- pseudo
IF NEW.status IS DISTINCT FROM OLD.status THEN
  IF current_setting('app.suppress_status_log', true) IS DISTINCT FROM 'true' THEN
    INSERT INTO subscription_changes (...) -- status_changed
  END IF;
END IF;
```

Uso de `current_setting(name, true)` (segundo argumento `true` = não falha se a GUC não estiver setada — retorna NULL).

**2. Atualizar `comp_activate_subscription`** — adicionar `PERFORM set_config('app.suppress_status_log', 'true', true);` antes do `UPDATE subscriptions`. O 3º argumento `true` torna o set local à transação (equivalente a `SET LOCAL`).

**3. Atualizar `register_manual_payment`** — mesma flag antes do `UPDATE subscriptions` (também muda status quando avança ciclo de past_due/suspended → active).

**4. Não mexer em `apply_voucher` / `remove_voucher` / `apply_direct_discount`** — essas RPCs não alteram `subscriptions.status`, então a trigger não dispara `status_changed` por elas. Sem ação necessária.

### Validação pós-deploy
- Disparar uma cortesia de teste numa sub `trialing` → conferir que aparece **só** `comp_activation` no histórico (e não `status_changed` extra).
- Disparar pagamento manual numa sub `past_due` → conferir só `manual_payment` (sem `status_changed` extra).
- Mudar status manualmente via `solution_admin` (UPDATE direto, ex: através do drawer no futuro) → `status_changed` ainda deve aparecer.

### Arquivos afetados
- **Nova migração SQL:** redefine `log_subscription_changes`, `comp_activate_subscription` e `register_manual_payment`.

### Fora de escopo
- B2 (`expire-trials` para cortesia com prazo), B4 (link voltar Auth), M1 (banner cortesia no /billing), M5 (bucket email-assets) — ficam para próximas iterações.
