

## Limite inicial de 10 usuários + fluxo de solicitação ao Financeiro

### Diagnóstico
- O backend já trava a criação acima do limite (`admin_can_add_user` + `admin-create-user`), e novas assinaturas já nascem com `seats_purchased = 10` (mínimo via `subscriptions.minimum_seats`).
- **Falta o UX**: ao bater no limite, o admin recebe um toast genérico e não tem caminho claro para pedir mais. O Financeiro também não vê essas solicitações em destaque.

### O que muda

**1. Sinalização proativa em `/admin` (página Cadastrar Usuário)**
- Quando `userLimit.current >= userLimit.max`, mostrar um **banner informativo amarelo** acima do formulário:
  > "Você atingiu o limite de 10 usuários do seu plano. Solicite ao Financeiro a liberação de assentos adicionais."
- Botão **"Solicitar mais assentos"** abre um diálogo `RequestSeatsDialog` (novo) já preenchido com contexto.
- Desabilita o botão "Cadastrar Usuário" no formulário e mostra texto auxiliar quando no limite (evita o erro depois do clique).

**2. Novo componente `src/components/admin/RequestSeatsDialog.tsx`**
- Campos: quantidade desejada (input numérico, mínimo = atual+1, sugere atual+5), motivo (textarea, obrigatório, mín. 10 chars).
- Ao enviar, cria um `support_ticket` com `subject = "Solicitação de aumento de assentos"` e uma `support_message` formatada com:
  - assentos atuais, assentos solicitados, diferença, motivo, nome do admin.
- Mesmo padrão usado por `ActivateSubscriptionDialog` (ticket + mensagem). Garante que cai em `Financeiro → Suporte` automaticamente, sem nova tabela.
- Toast de sucesso: "Pedido enviado ao Financeiro. Entraremos em contato em breve."

**3. Reaproveitar em `/cobranca`**
- O slider de "Ajustar assentos" hoje já abre o `ActivateSubscriptionDialog` com texto livre. Trocar para abrir o novo `RequestSeatsDialog` quando o usuário clica em "Solicitar upgrade", já pré-preenchido com a quantidade do slider e o delta.
- Fluxo unificado de solicitação independente da origem (cobrança ou admin).

**4. Visibilidade no `/financeiro`**
- Na aba **Suporte** (já existente, lista todos os tickets), nada precisa mudar funcionalmente — os pedidos já aparecem.
- Pequeno realce: na aba **Assinaturas**, adicionar um badge contador na sub-aba/Tab Suporte: `"Suporte (3)"` quando há tickets abertos cujo `subject` contenha "assentos" ou "ativar". Ajuda solution_admin a ver demanda quente.

**5. Mensagem de erro mais clara no `admin-create-user`**
- Hoje retorna "Limite de assentos atingido (10/10). Faça upgrade da assinatura...". Trocar para:
  > "Limite de 10 assentos atingido. Solicite a liberação de mais assentos pelo botão 'Solicitar mais assentos' na página de Administração."
- Mantém o status 403 e a estrutura atual.

### Detalhes técnicos
- **Sem migração de banco.** O modelo já está pronto:
  - `subscriptions.minimum_seats = 10` e default `seats_purchased = 10` ✅
  - `admin_can_add_user` faz a checagem ✅
  - `support_tickets`/`support_messages` cobrem o canal de solicitação ✅
- **Novos arquivos:**
  - `src/components/admin/RequestSeatsDialog.tsx`
- **Editados:**
  - `src/pages/Admin.tsx` — banner + botão + integração do diálogo + desabilitar form no limite.
  - `src/pages/Billing.tsx` — substituir `handleUpgrade` para abrir `RequestSeatsDialog` com a quantidade do slider.
  - `src/components/financial/SubscriptionsTab.tsx` — (opcional, leve) badge contador de tickets abertos relacionados.
  - `supabase/functions/admin-create-user/index.ts` — texto da mensagem de erro de limite.

### Fora de escopo
- Criar uma nova tabela `seat_requests` (poderia ser uma evolução, mas hoje `support_tickets` resolve sem fragmentar dados).
- Aprovação automática / checkout — segue manual como já é hoje.
- Mexer em convites por email (`invite-team-member`) — ele já usa o mesmo `admin_can_add_user`, vai bloquear igual; o usuário será orientado pelo banner do Admin.

