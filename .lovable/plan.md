
## Plano — Cobrança mensal por admin, por usuário, com mínimo de 10

### O que já existe e pode ser aproveitado
- `admin_settings.max_users` já controla o limite de usuários por admin.
- `user_approvals` já registra usuários criados por cada admin e tem controle de validade (`license_expires_at`).
- Existem funções para aprovar, desativar e reativar usuários/licenças.
- A página `Admin.tsx` já mostra consumo `current/max`.
- A página `Financial.tsx` já é o painel do `solution_admin`, então é o lugar natural para acompanhar assinaturas.

### Modelo comercial recomendado
- Cobrança recorrente **mensal por assento**.
- O cliente pagante é o **admin**.
- Regra mínima: **10 assentos cobrados**.
- Se o admin usar menos de 10, continua pagando 10.
- Se usar mais, compra assentos adicionais.
- Downgrade só no próximo ciclo, nunca abaixo de 10.

```text
Admin paga assinatura
   └─ compra 10+ assentos
        └─ pode criar/aprovar até esse limite
             └─ usuários extras exigem upgrade
```

### Melhor forma de vender
Recomendo usar a integração nativa de pagamentos do Lovable com **Paddle** para este caso:
- assinatura mensal SaaS
- cobrança organizada
- portal do cliente
- renovação automática
- gestão de cobrança e inadimplência mais simples

Se o objetivo for foco total no Brasil e controle fiscal próprio, dá para usar Stripe, mas para MVP comercial organizado o Paddle tende a ser o caminho mais direto.

### Estrutura que vamos implementar

#### 1) Billing como fonte de verdade
Hoje o limite está em `admin_settings.max_users`. Ele deve continuar existindo, mas passar a ser **espelho da assinatura ativa**.

Novo conceito:
- `subscription.seats_purchased` = quantidade contratada
- `admin_settings.max_users` = valor sincronizado para a app consumir
- limite mínimo garantido no backend = 10

#### 2) Novas tabelas no backend
Criar:

**`subscriptions`**
- `admin_user_id`
- `provider`
- `provider_customer_id`
- `provider_subscription_id`
- `status` (`trialing`, `active`, `past_due`, `canceled`, `suspended`)
- `seats_purchased`
- `price_per_seat_cents`
- `minimum_seats`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `created_at`, `updated_at`

**`billing_events`**
- log de webhooks/eventos
- payload bruto
- status de processamento
- idempotência

**Opcional depois:** `subscription_changes`
- histórico de upgrade/downgrade de assentos

### Regras de negócio
1. Todo admin novo começa com:
   - trial, ou
   - assinatura já exigida no onboarding  
   Isso depende da estratégia comercial.

2. Regra de cobrança:
   - `billable_seats = max(10, active_users_count)`

3. Regra de criação de usuário:
   - impedir cadastro/aprovação acima de `seats_purchased`

4. Regra de inadimplência:
   - `past_due` avisa
   - após tolerância, `suspended`
   - admin e usuários vinculados perdem acesso

5. Regra de cancelamento:
   - acesso segue até o fim do ciclo pago
   - após vencimento, suspende

### Fluxos principais

#### Fluxo A — Novo admin
1. Admin cria conta
2. Sistema cria registro de assinatura em estado inicial
3. Admin vai para checkout
4. Pagamento aprovado
5. Backend grava assinatura ativa com no mínimo 10 assentos
6. `admin_settings.max_users` é sincronizado
7. Admin pode começar a cadastrar usuários

#### Fluxo B — Upgrade de assentos
1. Admin abre página de billing
2. Aumenta de 10 para 15, por exemplo
3. Checkout/ajuste no provedor
4. Webhook confirma
5. `subscriptions.seats_purchased` e `admin_settings.max_users` são atualizados

#### Fluxo C — Tentativa acima do limite
- `admin-create-user` deve validar assinatura antes de criar usuário
- se exceder limite: bloquear e orientar para upgrade

#### Fluxo D — Falha de pagamento
- webhook marca `past_due`
- email automático
- banner dentro da área admin
- após prazo de tolerância, suspensão

### Mudanças no código

#### Backend/functions
- Nova função para criar checkout de assinatura
- Nova função para abrir portal do cliente
- Nova função webhook de billing
- Ajustar `admin-create-user` para validar assentos contratados
- Ajustar lógica de licença para refletir assinatura, não só aprovação manual

#### Frontend
**Nova página/aba “Billing” para admin**
- plano atual
- assentos contratados
- assentos em uso
- valor mensal estimado
- botão de upgrade
- botão de gerenciar pagamento
- aviso de inadimplência/cancelamento

**Financial.tsx**
- adicionar visão operacional para `solution_admin`:
  - admins ativos
  - MRR
  - inadimplentes
  - trials
  - cancelamentos

**Admin.tsx**
- manter indicador `usuários atual / contratados`
- bloquear CTA de cadastro quando atingir o teto

### Segurança e controle
- Todas as tabelas novas com RLS.
- Admin vê apenas sua própria assinatura.
- `solution_admin` vê todas.
- Webhook processa com chave segura e idempotência.
- Não confiar no client para preço, assentos ou status.
- Toda validação de cobrança precisa acontecer no backend.

### Decisões de produto que precisamos fechar
Como o pedido é “análise detalhada”, estas são as decisões que eu recomendaria:

#### Recomendação de MVP comercial
- Cobrança: **mensal**
- Unidade: **por assento**
- Mínimo: **10**
- Upgrade: imediato
- Downgrade: próximo ciclo
- Trial: **7 ou 14 dias**
- Provider: **Paddle**
- Bloqueio por inadimplência: **3 dias de tolerância**

### Ordem de implementação
1. Definir estratégia comercial final:
   - trial ou sem trial
   - preço por assento
   - tolerância de inadimplência
2. Habilitar pagamentos nativos
3. Criar produto de assinatura
4. Criar tabelas `subscriptions` e `billing_events`
5. Implementar webhook
6. Sincronizar assinatura com `admin_settings.max_users`
7. Atualizar `admin-create-user`
8. Criar página Billing do admin
9. Adicionar visão financeira no painel `solution_admin`
10. Testar ciclo completo:
   - signup admin
   - checkout
   - upgrade
   - limite atingido
   - falha de pagamento
   - suspensão
   - reativação

### Riscos e cuidados
- Hoje o sistema mistura “aprovação manual” com “licença”. Isso precisa virar uma regra única para não gerar conflitos.
- Se mantivermos `solution_admin` aprovando tudo manualmente, a venda fica mais lenta. Melhor usar aprovação automática para admins pagantes.
- Não recomendo usar apenas `license_expires_at` como fonte de billing. Serve como apoio, mas a assinatura precisa ter tabela própria.
- O controle de usuários deve considerar claramente o que conta como “usuário ativo”:
  - todos criados?
  - apenas aprovados?
  - apenas não desativados?  
  Minha recomendação: contar **usuários aprovados e não desativados**.

### Resultado esperado
Ao final, você terá:
- cobrança recorrente organizada
- limite automático por admin
- mínimo comercial de 10 usuários
- bloqueio seguro quando exceder plano
- gestão central de inadimplência
- base pronta para expansão futura (anual, cupons, planos diferentes, add-ons)

### Detalhes técnicos
- Fonte atual do limite: `admin_settings.max_users`
- Ponto crítico de enforcement: `supabase/functions/admin-create-user/index.ts`
- Painel operacional atual já existente: `src/pages/Financial.tsx`
- Painel do cliente pagante já existente para estender: `src/pages/Admin.tsx`
- Persistência ideal: nova tabela `subscriptions` com sincronização para `admin_settings`
- Eventos externos: processados via webhook e registrados em `billing_events`
