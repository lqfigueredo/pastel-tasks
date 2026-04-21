

## Plano — 2 semanas de soft launch (MVP em produção)

Foco: rodar com beta pagantes, observar, corrigir só o que doer. **Sem grandes features novas.**

---

### Antes do dia 1 (pré-voo)

Execução manual sua, sem código:

1. **Configurar `VITE_TURNSTILE_SITE_KEY`** em Workspace Settings → Build Secrets (chave já gerada na Cloudflare; se ainda não fez, criar conta free e gerar par de chaves).
2. **Configurar `VITE_SENTRY_DSN`** (sentry.io → projeto React → DSN).
3. **Editar Termos + Privacidade** no Financeiro → aba "Documentos Legais" → publicar v1 revisada.
4. **Rodar o `docs/launch-checklist.md`** com conta de teste nova — todos os 7 fluxos.
5. **Build de produção** depois de adicionar os secrets.
6. **Convidar 5–10 clientes beta** com voucher/comp ativado pelo Financeiro.

---

### Semana 1 — Observação ativa

**Rotina diária (15 min/dia):**

- **Sentry**: revisar erros novos. Triagem: crítico (corrige hoje) / médio (anota) / ruído (ignora).
- **Painel Financeiro**: leads novos, suporte aberto, trials ativos.
- **`email_send_log`**: bounces > 2% = problema de deliverability.
- **Logs de edge functions** (`submit-lead`, `process-recurring-tasks`, `check-notifications`): erros recorrentes.

**Ações de código que provavelmente vão aparecer (reativas):**
- Ajuste de copy/textos confusos relatados pelo cliente
- Correção de bugs específicos do Sentry
- Ajustes de RLS se algum cliente reportar "não consigo ver X"

**Não fazer nesta semana:**
- Adicionar features novas
- Refatorar código
- Mudar UI principal

---

### Semana 2 — Iteração leve + decisão

**Coletar feedback estruturado:**
- Mensagem manual aos beta clientes (e-mail ou WhatsApp): 3 perguntas curtas
  1. O que mais te ajudou?
  2. O que travou ou confundiu?
  3. O que faltou?

**Ajustes táticos baseados no feedback:**
- Help texts (já editáveis no Financeiro — sem código)
- Copy de onboarding
- Textos de e-mails transacionais
- Pequenos bugs de UX

**Decisão no fim da semana 2:**

| Sinal | Próximo passo |
|---|---|
| ≥70% dos beta querem continuar pagando | Lançamento aberto + começar Stripe |
| 30–70% engajados, alguns problemas | +2 semanas de iteração antes de abrir |
| <30% engajados | Reavaliar proposta de valor com clientes antes de gastar com aquisição |

---

### O que monitorar (resumo)

```text
Diário:        Sentry, suporte, leads
Semanal:       email_send_log, uso real (tarefas criadas, timer iniciado)
Final S2:      NPS informal dos beta (3 perguntas)
```

### Riscos e mitigações

- **Cliente reporta bug sério fora do horário**: Sentry te avisa por e-mail; suporte chat funciona no app.
- **Bot passa pelo Turnstile**: improvável (Turnstile bloqueia >99%), mas se acontecer, dá pra subir nível para "Managed Challenge" no painel da Cloudflare sem mexer no código.
- **Trial vence sem cliente converter**: edge function `expire-trials` já roda; cliente fica bloqueado e abre suporte — você converte manualmente pelo Financeiro.

---

### Entregáveis nesta leva (mínimos, só se necessário)

Nenhuma alteração de código planejada agora. Vou ficar disponível para:
- Corrigir bugs que aparecerem no Sentry
- Ajustar copy/textos
- Aplicar pequenos refinamentos de UX baseados em feedback

**Se durante as 2 semanas algum padrão de feedback emergir** (ex: 5 clientes pedindo a mesma coisa), aí abrimos um plano específico para resolver.

### Próximo plano (depois das 2 semanas)

Dependendo do resultado, candidatos para Fase B:
- Pagamento automático (Stripe ou Paddle)
- PostHog para analytics
- Status page (UptimeRobot)
- Conteúdo SEO

