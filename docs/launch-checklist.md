# Checklist de Go-Live — Flowly

Validação manual antes de liberar o produto a clientes pagantes. Faça em ambiente de produção, com conta nova de teste.

## Pré-requisitos

- [ ] `VITE_TURNSTILE_SITE_KEY` configurada em **Workspace Settings → Build Secrets**
- [ ] `TURNSTILE_SECRET_KEY` configurada como secret de edge function (já feito)
- [ ] `VITE_SENTRY_DSN` configurada em **Workspace Settings → Build Secrets** (opcional, mas recomendado)
- [ ] Documentos legais revisados por advogado e republicados no Financeiro
- [ ] Build de produção feito após adicionar todos os secrets acima

---

## Fluxo 1 — Cadastro completo de novo administrador

- [ ] Acessar `/precos` e clicar em "Demonstre seu interesse" (lead capturado)
- [ ] Solution_admin responde o lead (aba Leads no Financeiro)
- [ ] Solution_admin cria a conta do admin via `/financeiro/cadastro`
- [ ] Admin recebe e-mail de boas-vindas com credenciais
- [ ] Admin faz login, completa o Onboarding Wizard (perfil, equipe, convites, primeira tarefa)
- [ ] Verifica que o trial de 14 dias está ativo (banner amarelo no topo)

## Fluxo 2 — Conversão de trial em assinatura

- [ ] Admin preenche dados fiscais em `/cobranca` (CNPJ/CPF, endereço completo)
- [ ] Solution_admin acessa `/financeiro` → Assinaturas → registra pagamento manual
- [ ] Verifica que a fatura aparece no histórico do admin
- [ ] Verifica que o status mudou para "active" e o trial banner sumiu
- [ ] Verifica que `admin_settings.max_users` foi sincronizado com `seats_purchased`

## Fluxo 3 — Recuperação de senha

- [ ] Em `/auth`, clicar em "Esqueci minha senha"
- [ ] E-mail recebido em até 2 minutos
- [ ] Link funciona, leva para tela de redefinição
- [ ] Nova senha definida, login funciona

## Fluxo 4 — Limite de assentos

- [ ] Em uma conta com 10 assentos contratados, criar 10 usuários
- [ ] Tentar criar o 11º — deve aparecer mensagem de bloqueio clara
- [ ] Solution_admin aumenta `seats_purchased` para 12
- [ ] Admin consegue criar o 11º e 12º usuário

## Fluxo 5 — Captura de lead com anti-bot

- [ ] Acessar landing page em janela anônima
- [ ] Abrir formulário de lead → widget Turnstile aparece
- [ ] Preencher e enviar — sucesso
- [ ] Tentar com `curl` direto à edge function `submit-lead` sem token — deve retornar 400
- [ ] Verificar que lead aparece no Financeiro

## Fluxo 6 — Páginas legais

- [ ] Acessar `/termos` em janela anônima — carrega corretamente
- [ ] Acessar `/privacidade` em janela anônima — carrega corretamente
- [ ] Solution_admin edita um doc no Financeiro → publica nova versão → verifica que a página pública mostra a nova versão
- [ ] Histórico de versões aparece corretamente

## Fluxo 7 — Funcionalidades core (smoke test)

- [ ] Criar tarefa, atribuir múltiplos responsáveis, mover entre colunas
- [ ] Criar reunião com pendências → pendência vira tarefa no Kanban
- [ ] Iniciar timer de tarefa, navegar para outra página, voltar — timer continua
- [ ] Criar evento no calendário pessoal
- [ ] Upload de anexo (imagem e PDF) → preview funciona
- [ ] Notificação em tempo real (sino) aparece para deadline próximo
- [ ] Suporte: abrir chamado, solution_admin responde, mensagem chega em tempo real

## Pós go-live

- [ ] Monitorar Sentry diariamente na primeira semana
- [ ] Verificar `email_send_log` semanalmente para taxa de bounces
- [ ] Backup do banco verificado mensalmente
