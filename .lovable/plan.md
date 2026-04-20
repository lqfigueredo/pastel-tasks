

User confirmou: vamos para o **item 2 — Onboarding wizard pós-primeiro-login**.

Deixa eu confirmar o que sei e checar uns detalhes antes de fechar o plano.
<lov-tool-use id="toolu_vrtx_01G2wsTKswiLcmKxu3ogxcZG" name="code--search_files" integration-id="code" data="{\"query\": \"onboarding_completed\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KgKwRADmrW1xPwyuJ2FNr6" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/AppLayout.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016BmTdcnBXTCLuARY55SisH" name="code--search_files" integration-id="code" data="{\"query\": \"onboarding\", \"include_patterns\": \"src/**/*.tsx,src/**/*.ts,supabase/migrations/*.sql\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01QcQSW1MBSW1brgZc6G6o83" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/AppLayout.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01UryGSu7cZe3cFdokkdBAZC" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Team.tsx\", \"lines\": \"1-80\"}">
</lov-tool-use>
<lov-plan>

User aprovou seguir com **item 2: Onboarding wizard pós-primeiro-login**.

Contexto que já tenho:
- `profiles` tem `user_id`, `display_name`, `theme`, `avatar_url`. Falta um campo `onboarding_completed_at`.
- Não existe nenhum onboarding/wizard hoje. Admin novo cai direto em `/tarefas` em branco.
- Trial automático já está em produção — então o público-alvo do wizard é exatamente o admin recém-criado.
- `AppLayout` já gerencia auth e sidebar; é o ponto natural para gatear o wizard.
- `billing_profile_missing_fields` já existe pra checar dados fiscais; vou aproveitar pra montar o passo "dados fiscais".

Decisões já tomadas:
- 4 passos: (1) Dados básicos (nome + dados fiscais essenciais), (2) Criar primeiro time, (3) Convidar 1-2 colegas (usa `invite-team-member` do item 1), (4) Criar primeira tarefa.
- Wizard é **opcional skippable** em cada passo — mas marca `onboarding_completed_at` ao final ou ao "pular tudo".
- Só dispara para admins (role `admin`), não para usuários convidados que entram via `/convite/:token`.
- Wizard renderiza como `Dialog` em tela cheia sobre o app — não bloqueia rotas, só sobrepõe.

---

## Plano — Onboarding wizard pós-primeiro-login

### 1. Migração

Adicionar coluna em `profiles`:
- `onboarding_completed_at timestamptz NULL`

### 2. Componente novo `OnboardingWizard`

`src/components/onboarding/OnboardingWizard.tsx`:
- Dialog não-fechável por click fora (só pelos botões "Pular" / "Próximo" / "Concluir").
- Header: título + indicador de progresso (1/4, 2/4...).
- Passos:
  1. **Boas-vindas + dados fiscais mínimos**: nome de exibição, nome legal/CPF/CNPJ, email de cobrança. Salva em `profiles` + `billing_profiles` (upsert).
  2. **Criar primeiro time**: input nome + descrição opcional. Insere em `teams`. Pode pular.
  3. **Convidar colegas**: até 2 inputs de email. Chama `invite-team-member` para cada (associando ao time criado no passo 2, se houver). Pode pular.
  4. **Criar primeira tarefa**: input título + status default. Insere em `tasks`. Pode pular ou "Ir direto pro Kanban".
- Footer: "Pular tudo" (silencioso) / "Voltar" / "Próximo" / "Concluir".
- Ao "Concluir" ou "Pular tudo": `UPDATE profiles SET onboarding_completed_at = now()`.

### 3. Disparo no `AppLayout`

Após `useAuth` carregar:
- Buscar perfil + role do user logado.
- Se role `admin` **e** `onboarding_completed_at` é null **e** subscription é `trialing` → renderizar `<OnboardingWizard />` por cima do app.
- Hook novo: `src/hooks/useOnboardingStatus.ts` para encapsular essa query.

### 4. Reabertura manual (bônus pequeno)

Adicionar botão "Refazer tour" em `/configuracoes` que limpa `onboarding_completed_at` e reabre o wizard. Útil pra testes e pra usuários que queiram revisitar.

### 5. Compatibilidade

- Admins legados (sem `onboarding_completed_at`): seriam atingidos pelo wizard. Para evitar isso, na migração já popular `onboarding_completed_at = created_at` para todos os profiles existentes — só novos admins a partir daqui veem o wizard.
- Usuários convidados (não-admin): nunca acionam o wizard porque a regra checa role `admin`.

### Arquivos afetados

- **Migração**: adicionar `onboarding_completed_at` em `profiles` + backfill
- **Novo**: `src/components/onboarding/OnboardingWizard.tsx`
- **Novo**: `src/components/onboarding/steps/Step1Profile.tsx`, `Step2Team.tsx`, `Step3Invites.tsx`, `Step4Task.tsx`
- **Novo**: `src/hooks/useOnboardingStatus.ts`
- **Editado**: `src/components/AppLayout.tsx` — montar wizard condicional
- **Editado**: `src/pages/Settings.tsx` — botão "Refazer tour"

