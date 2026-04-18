

## Plano — Teste real de compra de um plano

### Situação atual
- Página `/cobranca` existe, mas os botões "Fazer upgrade" e "Gerenciar pagamento" só mostram `toast.info`.
- Tabela `subscriptions` já existe e está sincronizada com `admin_settings.max_users`.
- Nenhum provedor de pagamento está habilitado → **não dá para fazer uma compra real ainda**.

### O que vamos fazer
Habilitar o pagamento built-in da Lovable em modo **teste (sandbox)**, criar o produto "Assento mensal" e ligar a página `/cobranca` ao checkout real. Tudo sem dinheiro real e sem você precisar criar conta no provedor.

### Etapas

**1. Recomendar e habilitar o provedor**
- Rodar `recommend_payment_provider` (analisa o produto e sugere Paddle ou Stripe).
- Para SaaS B2B PT-BR cobrando assinatura recorrente por assento, normalmente cai em **Paddle** (Merchant of Record, cuida de imposto/NF) ou **Stripe** (mais flexível).
- Habilitar o provedor recomendado → cria automaticamente o ambiente sandbox.

**2. Criar o produto de assinatura**
- Produto: "Assento mensal Nevvoh"
- Preço: a definir com você (ex.: R$ 49/assento/mês), cobrado por quantidade.
- Trial: 14 dias com cartão (já decidido).
- Modo: sandbox (teste).

**3. Criar edge functions de billing**
- `create-checkout`: gera URL de checkout para o admin contratar/aumentar assentos.
- `billing-portal`: abre portal do cliente (atualizar cartão, ver faturas, cancelar).
- `billing-webhook`: recebe eventos do provedor, atualiza `subscriptions` e grava em `billing_events` com idempotência.

**4. Conectar `/cobranca` ao fluxo real**
- Botão "Fazer upgrade" → chama `create-checkout` com o novo `seats` e abre o checkout em nova aba.
- Botão "Gerenciar pagamento" → chama `billing-portal` e abre o portal.
- Ao retornar do checkout, refazer `load()` para refletir o novo status.

**5. Testar a compra (você executa no preview)**
- Logar como um admin de teste em `/cobranca`.
- Ajustar slider para 12 assentos, clicar **Fazer upgrade**.
- Completar o checkout sandbox com **cartão de teste** (ex.: `4242 4242 4242 4242` no Stripe).
- Voltar para `/cobranca` e verificar:
  - `status = trialing` ou `active`
  - `seats_purchased = 12`
  - `admin_settings.max_users = 12` (sincronizado pelo trigger)
- Tentar criar 13 usuários em `/admin` → o 13º deve ser bloqueado.

### Decisão necessária antes de executar
Preciso que você confirme **qual provedor habilitar**. Como o resultado da análise pode mudar a recomendação, vou perguntar depois que rodar `recommend_payment_provider`. Por padrão, se você não tiver preferência, sigo com a recomendação dele.

Pré-requisito: o projeto precisa estar em **plano Pro** para habilitar pagamentos. Lovable Cloud já está habilitado ✓.

### Detalhes técnicos
- Ferramentas usadas: `payments--recommend_payment_provider`, depois `payments--enable_paddle_payments` **ou** `payments--enable_stripe_payments`.
- Após habilitar, a Lovable injeta automaticamente os secrets do provedor e fornece knowledge files com o padrão exato de checkout/webhook.
- Webhook URL é registrada automaticamente no provedor sandbox.
- `billing-webhook` precisa ter `verify_jwt = false` no `config.toml` (já é o padrão).
- `subscriptions.provider` passa de `'manual'`/`'pending'` para `'paddle'` ou `'stripe'` quando o checkout completar.

