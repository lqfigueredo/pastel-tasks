
## Contexto

Hoje o desconto em assinatura existente exige criar primeiro um voucher (em "Vouchers") e depois aplicá-lo via aba "Descontos". O usuário quer um **atalho**: aplicar desconto direto numa assinatura, sem criar voucher manualmente.

## Decisão de design

Em vez de criar uma estrutura paralela (que duplicaria `subscription_discounts` + cálculo em `calculate_invoice_amount`), vou **gerar um voucher "ad-hoc" automaticamente nos bastidores** e aplicá-lo. Vantagens:

- Reaproveita 100% da lógica existente (`calculate_invoice_amount`, `register_manual_payment`, exibição na aba Descontos, badge no resumo, decremento de `invoices_remaining`).
- Histórico fica consistente: aparece como `voucher_applied` em `subscription_changes`.
- Voucher ad-hoc fica oculto da listagem de Vouchers (campo `is_adhoc = true`) para não poluir.
- Solution_admin pode remover a qualquer momento usando o botão atual.

## Implementação

### 1. Migração
- Adicionar coluna `discount_vouchers.is_adhoc boolean default false`.
- Criar RPC `apply_direct_discount(_subscription_id, _discount_type, _discount_value, _duration, _duration_in_months, _reason)`:
  - Valida `solution_admin` e motivo (mín. 5 caracteres).
  - Valida valores (% entre 1-100, ou centavos > 0).
  - Gera código único `ADHOC-<sub_id_curto>-<timestamp>`.
  - INSERT em `discount_vouchers` com `is_adhoc=true`, `max_redemptions=1`, `applies_to_plan_id=NULL`.
  - Chama internamente a lógica de `apply_voucher` (ou inline equivalente) para vincular à assinatura.
  - Registra `subscription_changes` com `change_type='direct_discount'` e `reason`.
- Ajustar listagem de `VouchersTab.tsx` para filtrar `is_adhoc=false` (não muda RPC).

### 2. UI — botão "Aplicar desconto direto" na aba Descontos
Em `SubscriptionDiscountsSection.tsx`:
- Adicionar botão secundário ao lado do "Aplicar voucher": **"Desconto direto"**.
- Abre dialog `DirectDiscountDialog`:
  - Tipo: percentual (%) ou valor fixo (R$)
  - Valor
  - Duração: uma fatura / X meses / vitalício
  - Motivo (textarea, obrigatório, mín. 5 chars)
  - Preview: "Aplicará desconto de X em Y faturas"
- Confirmar → chama RPC → toast → recarrega lista e cálculo.

### 3. Exibição
Na lista de descontos aplicados, prefixo visual: se `voucher.is_adhoc`, mostrar badge "Direto" ao invés do código longo, e tooltip com motivo.

## Arquivos afetados

- **Migração:** coluna `is_adhoc` em `discount_vouchers` + função `apply_direct_discount`.
- **Novo:** `src/components/financial/DirectDiscountDialog.tsx`
- **Editado:** `src/components/financial/SubscriptionDiscountsSection.tsx` — botão + integração + exibição "Direto".
- **Editado:** `src/components/financial/VouchersTab.tsx` — filtrar `is_adhoc=false` no SELECT.
- **Editado:** `src/components/financial/SubscriptionDetailDrawer.tsx` — adicionar `direct_discount` em `CHANGE_LABELS`.

## Fora de escopo
- Aplicar em massa (múltiplas assinaturas de uma vez).
- Conversão de desconto direto → voucher reutilizável.
