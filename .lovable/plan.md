

O usuário quer dois recursos:
1. **Configurador de valor de planos** — hoje `subscriptions.price_per_seat_cents` é por linha, sem catálogo central. Cada admin pode ter um preço diferente. Falta um lugar onde o `solution_admin` defina o preço padrão por assento (e talvez planos diferentes).
2. **Cadastro de vouchers de desconto** — não existe nada no schema. Precisa tabela de vouchers, aplicação por assinatura/fatura, e UI de gestão.

Preciso entender se eles querem **um plano único** (um preço/assento global) ou **múltiplos planos** (Starter, Pro, etc., cada um com features diferentes). Pelo contexto atual (cobrança puramente por assento, mínimo 10), o modelo é assento-único — então é mais provável que queiram **configurar o preço base global** + **descontos por cliente/voucher**.

Também preciso clarear: o desconto é percentual, valor fixo, vitalício, por X meses, single-use vs reusable, atrelado a um cliente específico ou aberto.

Vou propor o modelo mais comum (genérico), com perguntas críticas no final do plano.

---

## Plano — Configurador de planos e vouchers de desconto

### Parte 1 — Catálogo de planos

**Hoje:** `subscriptions.price_per_seat_cents` é por linha, sem catálogo. Não dá para mudar o preço base sem editar admin por admin.

**Proposta:** criar tabela `plans` com o catálogo:

| Campo | Uso |
|---|---|
| `code` (slug único, ex: `default`, `starter`, `pro`) | Identificador |
| `name`, `description` | Exibição |
| `price_per_seat_cents`, `currency` | Preço base por assento |
| `minimum_seats` | Mínimo de assentos (default 10) |
| `billing_interval` (`month`/`year`) | Ciclo |
| `is_active`, `is_default` | Visibilidade / plano novo padrão |
| `features` (jsonb) | Lista textual de o que está incluído |

`subscriptions` ganha coluna `plan_id` opcional. Ao criar nova assinatura, copia preço/mínimo do plano. Mudar preço do plano **não** afeta assinaturas existentes (só novas) — assim ninguém é cobrado a mais sem aviso. Existe ação manual "Aplicar preço atual do plano" no drawer.

**UI no `/financeiro`:** nova aba **Planos** com listagem, criar/editar/desativar, marcar como default.

### Parte 2 — Vouchers de desconto

**Tabela `discount_vouchers`:**

| Campo | Uso |
|---|---|
| `code` (único, case-insensitive, ex: `LANCAMENTO20`) | O cupom |
| `description` | Interno |
| `discount_type` (`percent` / `fixed_amount`) | Como calcular |
| `discount_value` | 20 (=20%) ou 5000 (=R$50) |
| `duration` (`once` / `repeating` / `forever`) | Quantas faturas pega |
| `duration_in_months` | Se `repeating` |
| `max_redemptions` | NULL = ilimitado |
| `times_redeemed` | Contador |
| `valid_from`, `valid_until` | Janela |
| `applies_to_plan_id` | NULL = qualquer plano |
| `is_active` | On/off |

**Tabela `subscription_discounts`** (vínculo voucher × assinatura):
- `subscription_id`, `voucher_id`, `applied_at`, `applied_by`, `expires_at` (calculado por duration), `invoices_remaining`

**Aplicação:**
- Função `apply_voucher(_subscription_id, _code)` valida (ativo, dentro da janela, não excedeu max_redemptions, não duplicado para a mesma sub) → cria registro em `subscription_discounts`, incrementa `times_redeemed`, registra em `subscription_changes`.
- Função `calculate_invoice_amount(_subscription_id)` retorna `subtotal_cents`, `discount_cents`, `total_cents` aplicando descontos ativos.
- `register_manual_payment` passa a usar essa função: a fatura registra `subtotal_cents`, `discount_cents` e `total_cents` (precisa adicionar essas colunas em `invoices`).

**UI:**
- Nova aba **Vouchers** em `/financeiro` (solution_admin): CRUD de cupons + tabela com uso atual (`times_redeemed`/`max_redemptions`) e quem resgatou.
- No `SubscriptionDetailDrawer`, seção "Descontos aplicados" com botão **Aplicar voucher** (input do código) e remover.
- Em `/cobranca` (admin pagante): mostra desconto ativo no resumo e na próxima cobrança ("R$ 1.000 - R$ 200 desconto = R$ 800"). Opcionalmente, campo para o admin digitar um código (decisão pendente — ver abaixo).

### Parte 3 — Mudanças em tabelas existentes

- `subscriptions`: + `plan_id uuid` (nullable, FK lógica para plans).
- `invoices`: + `subtotal_cents`, `discount_cents` (default 0). `amount_cents` continua sendo o total final cobrado.
- Nada destrutivo — assinaturas/faturas atuais continuam funcionando.

### Parte 4 — Ordem de implementação

1. Migração: `plans`, `discount_vouchers`, `subscription_discounts`; colunas novas em `subscriptions` e `invoices`; funções `apply_voucher` e `calculate_invoice_amount`; ajuste em `register_manual_payment`.
2. Aba **Planos** em `/financeiro` (CRUD).
3. Aba **Vouchers** em `/financeiro` (CRUD + uso).
4. Seção de desconto no `SubscriptionDetailDrawer` (aplicar/remover voucher, ver histórico).
5. Atualizar `Billing.tsx` para mostrar desconto ativo no resumo.
6. Atualizar `SubscriptionsTab` (lista) para mostrar mensalidade líquida (com desconto).

### Decisões pendentes

1. **Múltiplos planos ou um só?** Posso já criar a estrutura de catálogo aceitando vários planos (Starter/Pro/Enterprise) **ou** manter só "plano padrão" único editável. Recomendo o catálogo — flexibilidade quase de graça.
2. **Quem aplica voucher?** Só `solution_admin` (mais controle, evita fraude) ou também o admin pagante pode digitar código em `/cobranca`?
3. **Voucher percentual vs fixo:** ambos? (Recomendo: ambos — `percent` e `fixed_amount`.)
4. **Duração:** suportar `once` (só próxima fatura), `repeating` (N meses) e `forever` (vitalício)?

