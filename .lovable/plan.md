

## Diagnóstico do fluxo de contratação (teste mental ponta-a-ponta)

Refiz o caminho do visitante até a assinatura ativa. Aqui vai o que **funciona**, o que **está quebrado** e o que **falta**.

### Caminho atual

```text
Landing (/) → Preços (/precos) → Auth (/auth signup)
   ↓
register-user edge function
   ↓
- cria user (email_confirm:true)
- promove a admin
- cria subscription trialing 14d
   ↓
Login → AppLayout
   ↓
- TrialBanner aparece (info/warning/critical)
- OnboardingWizard abre (4 passos)
   ↓
Trial expira em 14d → ??? (NADA acontece)
```

### O que já funciona bem
- Landing → Preços → Auth: navegação OK, links presentes.
- Cadastro cria conta + subscription `trialing` automaticamente.
- Onboarding wizard dispara para admin novo, salva billing_profile básico.
- Trial banner aparece em todas as rotas internas com cores graduais.
- `/cobranca` mostra resumo completo, slider de assentos, faturas, dados fiscais.

---

### 🔴 BUG CRÍTICO: subscriptions criadas com `price_per_seat_cents = 0`

Confirmei no banco:
- Tabela `plans`: existe **1 plano ativo** (`Plano Padrão`, R$ 20/assento, `is_default = true`)
- Tabela `subscriptions`: **2 de 2 subscriptions estão com `price_per_seat_cents = 0`**

Causa: as subscriptions de teste foram criadas **antes** do plano default existir (ou o `register-user` não estava puxando o plano corretamente). Hoje a função puxa certo, mas o histórico ficou zerado.

**Sintoma visível:** em `/cobranca`, a "Mensalidade estimada" aparece como "—" e o texto diz "Preço a ser definido". O cliente não vê quanto vai pagar.

---

### 🟡 Lacunas funcionais que travam a contratação real

1. **Não existe forma de "ativar" a assinatura.** O trial expira em 14 dias e... nada. Sem checkout, sem botão "contratar agora", sem cron de suspensão. Os botões "Solicitar upgrade" e "Gerenciar pagamento" só mostram um toast informativo.

2. **Sem alerta de trial expirado.** Se `trial_ends_at < now()` e `status` ainda é `trialing`, ninguém faz a transição para `past_due` ou `suspended`. O usuário continua usando de graça pra sempre.

3. **Onboarding salva billing_profile incompleto.** Step 1 só pede nome legal + CPF/CNPJ + email. Faltam endereço, CEP, cidade, estado — campos exigidos por `billing_profile_missing_fields()` para emitir nota fiscal/cobrar manualmente. O cliente termina o wizard achando que está tudo pronto, mas o admin do sistema não consegue registrar pagamento manual sem esses dados.

4. **Nenhum fluxo de "Quero contratar agora".** Mesmo dentro do trial, se o usuário quiser pular o teste e já assinar, não há caminho — porque não há checkout.

---

### 🟢 Polimento menor

5. **Auth.tsx redireciona para `/landing`** no botão "Voltar" (linha 65). A rota canônica é `/`. Funciona porque `/landing` também aponta pro Landing, mas é inconsistente.

6. **Preços não mostra que mínimo é R$ 200/mês.** A calculadora só mostra "Mensalidade estimada R$ X" — falta destacar "valor mínimo: R$ 200 (10 × R$ 20)".

7. **Sem indicação visual no Auth de que o cadastro = início de trial.** O `Step1Profile.handleSave` exige todos os campos mas o botão "Pular" ao lado deixa passar sem nada — confuso.

---

## Plano de correção (em ordem de impacto)

### Correção 1 — Backfill das subscriptions com preço zerado
Migração SQL para atualizar todas as subscriptions onde `price_per_seat_cents = 0` para o preço do plano default. Garante que `/cobranca` mostre o valor real para os usuários atuais.

### Correção 2 — Cron de expiração de trial
Edge function `expire-trials` (chamada por pg_cron diário) que:
- Pega subscriptions onde `status = 'trialing'` e `trial_ends_at < now()`
- Muda status para `past_due` (gracioso, dá margem pro admin pagar)
- Após 7 dias em `past_due`, muda para `suspended` (corta acesso)

### Correção 3 — Botão "Ativar assinatura agora" no `/cobranca`
Mesmo sem checkout automático, criar fluxo manual:
- Botão visível durante `trialing` e `past_due`
- Abre dialog explicando: "Entre em contato com [email/whatsapp]" ou cria automaticamente um `support_ticket` para o time comercial atender
- Toast já não basta — precisa de ação concreta

### Correção 4 — Completar Step1 do onboarding com endereço
Adicionar CEP, logradouro, número, bairro, cidade, UF (com lookup automático via ViaCEP) para que `billing_profile_missing_fields` retorne vazio ao final do wizard.

### Polimento
- Trocar `/landing` por `/` no botão Voltar do Auth.
- Adicionar "valor mínimo R$ X/mês" abaixo da calculadora em `/precos`.
- Remover botão "Pular" no Step1 quando o usuário começou a preencher (manter só "Pular tudo").

---

## Arquivos afetados

- **Migração SQL:** backfill `subscriptions.price_per_seat_cents` + agendamento pg_cron para `expire-trials`
- **Nova edge function:** `supabase/functions/expire-trials/index.ts`
- **Editado:** `src/pages/Billing.tsx` — substituir toasts por dialog real de ativação (cria ticket de suporte)
- **Editado:** `src/components/onboarding/steps/Step1Profile.tsx` — adicionar campos de endereço
- **Editado:** `src/pages/Auth.tsx` — corrigir link "Voltar"
- **Editado:** `src/pages/Pricing.tsx` — destacar valor mínimo

