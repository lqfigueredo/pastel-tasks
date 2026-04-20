
## Diagnóstico

A tabela `subscription_changes` tem um CHECK constraint que limita `change_type` aos valores antigos:

```
['seats_changed', 'status_changed', 'trial_extended', 'manual_payment',
 'cycle_advanced', 'created', 'cancellation_scheduled', 'reactivated', 'note']
```

Mas as funções recém-criadas tentam inserir:
- `comp_activation` (cortesia) — quebraria também
- `direct_discount` (desconto direto) — **erro que o usuário viu**
- `voucher_applied` / `voucher_removed` (vouchers normais) — também quebrariam

Por isso só agora apareceu: foram adicionados sem atualizar a constraint.

## Correção

**Migração SQL única:** dropar o CHECK antigo e recriar incluindo todos os tipos válidos:

```
seats_changed, status_changed, trial_extended, manual_payment,
cycle_advanced, created, cancellation_scheduled, reactivated, note,
voucher_applied, voucher_removed, direct_discount, comp_activation
```

Sem mexer em código TS — basta corrigir a constraint no banco.

## Arquivos afetados

- **Nova migração SQL:** drop + recreate de `subscription_changes_change_type_check` com a lista completa.

## Fora de escopo

- Refatorar para enum (mais limpo, mas exige cast em várias funções; deixo como melhoria futura).
