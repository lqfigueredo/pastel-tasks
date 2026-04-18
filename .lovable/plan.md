

## Plano — Estruturar visões financeiras antes do checkout

### Objetivo
Pausar a integração com provedor e deixar **a operação interna de cobrança** completa primeiro: o que o `solution_admin` precisa enxergar para gerenciar a base, e o que cada `admin` pagante precisa enxergar para gerenciar a própria conta. Sem isso, o checkout entra em cima de uma base que não consegue operar.

### Lacunas atuais
Hoje só existem `subscriptions`, `billing_events` (vazio), `admin_settings.max_users` e `user_approvals`. **Não há** registro de faturas, pagamentos manuais, histórico de mudança de plano, descontos, dados fiscais nem notas internas. A página `/financeiro` não mostra nada de assinatura, e `/cobranca` só tem slider e botões placeholder.

### Parte 1 — Painel do `solution_admin` (`/financeiro`)

**KPIs no topo**
- MRR atual (R$/mês das ativas) e MRR potencial (em trial)
- Contagens por status: ativas, trial, past_due, suspended, canceladas
- Total de assentos contratados x usados (taxa de ocupação)
- Churn do mês

**Lista de assinaturas** (uma linha por admin pagante)
- Admin (nome, email), status, assentos contratados/usados, mensalidade, próximo ciclo, trial termina em, inadimplente desde, provider
- Ações: ver detalhes, ajustar assentos, suspender, reativar, cancelar, registrar pagamento manual, estender trial

**Drawer de detalhe**
- Dados da assinatura, histórico de mudanças, faturas, eventos do provider, notas internas

**Filtros e alertas**
- Filtrar por status / provider / inadimplência / trial expirando em N dias
- Alertas: trials vencendo em 3 dias, past_due > N dias

### Parte 2 — Painel do admin pagante (`/cobranca`)

- **Resumo**: plano, status (badge), assentos contratados x usados (barra), mensalidade, próxima cobrança, trial restante
- **Histórico de faturas** com data, valor, status, método
- **Método de pagamento** (placeholder até provider)
- **Dados fiscais** (razão social, CNPJ/CPF, endereço, email de cobrança) — necessário para nota e para enviar ao provider
- **Banners de status** (past_due, trial expirando, cancelada)
- **Histórico de mudanças de plano**

### Parte 3 — Estrutura de dados nova

| Tabela | Função |
|---|---|
| `invoices` | Faturas — opera com pagamento manual hoje, recebe do provider depois |
| `payment_methods` | Cartão/método salvo (placeholder) |
| `subscription_changes` | Auditoria (upgrade/downgrade/status/manual) |
| `billing_profiles` | Dados fiscais do admin |
| `subscription_notes` | Notas internas só do solution_admin |

Todas com RLS: admin vê só o que é dele; solution_admin vê tudo; notas só solution_admin.

### Parte 4 — Fluxos manuais (antes do provider)
Sem checkout, o solution_admin já consegue operar:
- Registrar pagamento manual → cria invoice paga, avança ciclo, mantém `active`
- Estender trial → ajusta `trial_ends_at`
- Ajustar assentos → trigger sincroniza `max_users`
- Suspender / reativar / cancelar com motivo em `subscription_changes`

### Ordem de implementação
1. Tabelas novas + RLS + triggers de auditoria
2. `Financial.tsx` reescrita: KPIs + lista + filtros
3. Drawer de detalhe + ações manuais
4. `Billing.tsx` reescrita: resumo + faturas + dados fiscais + banners
5. Banner global no `AppLayout` para admins
6. Só então plugar Paddle/Stripe

### Decisões abertas
- Coletar **dados fiscais (CNPJ/CPF/endereço)** já agora ou só quando integrar provider?
- **Pagamento manual** (PIX/boleto fora do sistema) é essencial nessa fase ou pode esperar?
- **Notas internas** por assinatura vão entrar?
- **Banner global** de status em todo o app, ou só dentro de `/cobranca`?

